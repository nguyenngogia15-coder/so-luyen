/* ===== Bộ nhận diện giọng nói chạy ngay trên máy (không gọi AI) =====
   - Whisper small.en: chép lời khi luyện nói tự do
   - HuBERT âm vị (Peacockery/hubert-base-phoneme-en, Apache-2.0): chấm từng âm theo GOP
   - Từ điển CMU (giọng Mỹ) */
const SP = { T: null, man: null, asr: null, ph: null, loading: {}, prog: {}, lex: null, stage: "" };
const spBase = () => new URL("sp/", location.href).href;
function spManifest() { return SP.man ||= fetch(spBase() + "manifest.json").then(r => { if (!r.ok) throw new Error("manifest " + r.status); return r.json(); }).catch(e => { SP.man = null; throw e; }); }
const spDB = (() => { let p; return () => p ||= new Promise(res => { try { const r = indexedDB.open("solt-models", 1); r.onupgradeneeded = () => r.result.createObjectStore("chunks"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }); })();
async function spIdb(op, key, val) {
  const db = await spDB(); if (!db) return null;
  return new Promise(res => { try { const tx = db.transaction("chunks", op === "get" ? "readonly" : "readwrite"); const st = tx.objectStore("chunks"); const r = op === "get" ? st.get(key) : st.put(val, key); r.onsuccess = () => res(op === "get" ? r.result || null : true); r.onerror = () => res(null); } catch { res(null); } });
}
async function spPrune() {
  try { const man = await spManifest(), keep = new Set(Object.values(man).flatMap(v => v.parts)), db = await spDB(); if (!db) return;
    const st = db.transaction("chunks", "readwrite").objectStore("chunks"), r = st.getAllKeys();
    r.onsuccess = () => r.result.forEach(k => { if (!keep.has(k)) st.delete(k); }); } catch {}
}
setTimeout(spPrune, 4000);
async function spFetchPart(path) {
  const hit = await spIdb("get", path); if (hit) return new Uint8Array(hit);
  const r = await fetch(spBase() + path); if (!r.ok) throw new Error("Tải " + path + " lỗi " + r.status);
  const b = await r.arrayBuffer(); spIdb("put", path, b); return new Uint8Array(b);
}
async function spAssemble(key, group) {
  const m = (await spManifest())[key]; if (!m) throw new Error("Thiếu " + key);
  const out = new Uint8Array(m.size); let o = 0;
  for (const p of m.parts) { const b = await spFetchPart(p); out.set(b, o); o += b.length; const g = SP.prog[group] ||= { got: 0 }; g.got += b.length; SP.onProg?.(); }
  return out;
}
const SP_KEYS = { asr: ["whisper-small.en/onnx/encoder_model_quantized.onnx", "whisper-small.en/onnx/decoder_model_merged_quantized.onnx"], ph: ["phoneme-hb/onnx/model.onnx"] };
async function spTotal(keys) { const m = await spManifest(); return keys.reduce((a, k) => a + (m[k]?.size || 0), 0); }
async function spLib() {
  if (SP.T) return SP.T;
  const T = await import(spBase() + "lib/transformers.min.js");
  T.env.allowRemoteModels = false; T.env.allowLocalModels = true; T.env.localModelPath = spBase() + "models/"; T.env.useBrowserCache = false; T.env.useCustomCache = true;
  T.env.customCache = { match: async key => { const k = String(key).split("/models/").pop(); const man = await spManifest(); if (!man[k]) return undefined; const u8 = await spAssemble(k, SP.curGroup || "asr"); return new Response(u8, { headers: { "content-length": String(u8.length) } }); }, put: async () => {} };
  const w = T.env.backends.onnx.wasm; w.wasmPaths = spBase() + "lib/"; w.numThreads = 1; w.proxy = true;
  w.wasmBinary = (await spAssemble("ort.wasm", "lib")).buffer;
  return SP.T = T;
}
/* which: "asr" (Whisper) hoặc "ph" (âm vị) */
function spLoad(which) {
  return SP.loading[which] ||= (async () => {
    SP.prog[which] = { got: 0, total: await spTotal(SP_KEYS[which]) };
    if (!SP.T) SP.prog.lib = { got: 0, total: await spTotal(["ort.wasm"]) };
    SP.stage = SP.T ? "" : "Đang tải thư viện chạy mô hình"; const T = await spLib(); SP.curGroup = which;
    SP.stage = which === "asr" ? "Đang khởi động bộ chép lời" : "Đang khởi động bộ chấm phát âm";
    const timeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
    if (which === "asr") SP.asr = await timeout(T.pipeline("automatic-speech-recognition", "whisper-small.en", { dtype: { encoder_model: "q8", decoder_model_merged: "q8" }, device: "wasm" }), 300000, "Khởi động bộ chép lời quá 5 phút (máy có thể thiếu bộ nhớ)");
    else SP.ph = await timeout(T.AutoModelForCTC.from_pretrained("phoneme-hb", { dtype: "fp32", device: "wasm" }), 300000, "Khởi động bộ chấm phát âm quá 5 phút");
    SP.stage = ""; return true;
  })().catch(e => { delete SP.loading[which]; SP.stage = ""; throw e; });
}
const spReady = need => need.every(k => k === "asr" ? !!SP.asr : !!SP.ph);
async function spCached(need) {
  try {
    const man = await spManifest(), db = await spDB(); if (!db) return false;
    const keys = await new Promise(res => { try { const r = db.transaction("chunks").objectStore("chunks").getAllKeys(); r.onsuccess = () => res(new Set(r.result)); r.onerror = () => res(new Set()); } catch { res(new Set()); } });
    return ["ort.wasm", ...need.flatMap(k => SP_KEYS[k])].every(k => man[k]?.parts.every(p => keys.has(p)));
  } catch { return false; }
}
/* Âm thanh: blob → Float32Array 16 kHz mono */
async function spDecode(blob) {
  const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
  const buf = await ac.decodeAudioData(await blob.arrayBuffer()); try { ac.close(); } catch {}
  const len = Math.ceil(buf.duration * 16000); const off = new OfflineAudioContext(1, Math.max(1, len), 16000);
  const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
  const r = await off.startRendering(); return r.getChannelData(0).slice();
}
/* Khoảng ngừng theo năng lượng âm (khung 10 ms) */
function spPauses(a) {
  const hop = 160, fr = []; for (let i = 0; i + hop <= a.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += a[j] * a[j]; fr.push(Math.sqrt(s / hop)); }
  const sorted = fr.slice().sort((x, y) => x - y), noise = sorted[Math.floor(sorted.length * 0.1)] || 0, peak = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const thr = Math.max(noise * 2.5, peak * 0.08, 0.004);
  const voiced = fr.map(v => v > thr); const first = voiced.indexOf(true), last = voiced.lastIndexOf(true);
  if (first < 0) return { speech: 0, total: a.length / 16000, pauses: [], start: 0, end: 0, level: peak };
  const pauses = []; let run = 0;
  for (let i = first; i <= last; i++) { if (!voiced[i]) run++; else { if (run * 0.01 >= 0.35) pauses.push({ at: (i - run) * 0.01, len: run * 0.01 }); run = 0; } }
  return { speech: voiced.slice(first, last + 1).filter(Boolean).length * 0.01, total: a.length / 16000, start: first * 0.01, end: (last + 1) * 0.01, pauses, level: peak };
}
function spTrim(a) { const z = spPauses(a); if (!z.speech) return a; const s = Math.max(0, Math.floor((z.start - 0.25) * 16000)), e = Math.min(a.length, Math.ceil((z.end + 0.25) * 16000)); return a.slice(s, e); }
async function spTranscribe(a) {
  await spLoad("asr");
  const out = await SP.asr(a, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
  return { text: String(out.text || "").trim(), words: (out.chunks || []).map(c => ({ w: String(c.text).trim(), s: c.timestamp?.[0] ?? null, e: c.timestamp?.[1] ?? null })).filter(x => x.w) };
}

/* ----- Âm vị (ARPAbet, giọng Mỹ) ----- */
const ARPA = ["AA", "AE", "AH", "AO", "AW", "AY", "B", "CH", "D", "DH", "EH", "ER", "EY", "F", "G", "HH", "IH", "IY", "JH", "K", "L", "M", "N", "NG", "OW", "OY", "P", "R", "S", "SH", "T", "TH", "UH", "UW", "V", "W", "Y", "Z", "ZH"];
const A2I = Object.fromEntries(ARPA.map((a, i) => [a, i])), NPH = ARPA.length, NC = NPH + 1; /* lớp cuối = khoảng trống CTC */
const A_IPA = { AA: "ɑː", AE: "æ", AH: "ʌ", AH0: "ə", AO: "ɔː", AW: "aʊ", AY: "aɪ", EH: "e", ER: "ɜːr", ER0: "ər", EY: "eɪ", IH: "ɪ", IY: "iː", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "uː", B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ" };
const isVowel = p => /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)/.test(p);
const phBase = p => String(p).replace(/\d/g, "");
const phIpa = p => A_IPA[p] || A_IPA[phBase(p)] || "?";
const ONSETS = new Set("pl pr bl br tr dr kl kr ɡl ɡr fl fr θr ʃr sp st sk sm sn sl sw spl spr str skr skw tw dw kw ɡw pj bj kj fj mj hj vj".split(" "));
/* Phiên âm IPA có dấu trọng âm đặt trước âm tiết */
function arpaIpa(phs) { return arpaIpaArr(phs).join(""); }
function arpaIpaArr(phs) {
  const sy = phs.map(phIpa), out = sy.slice(), cons = i => !isVowel(phs[i]);
  for (let i = 0; i < phs.length; i++) {
    const m = /([12])$/.exec(phs[i]); if (!m || phs.filter(isVowel).length < 2) continue;
    let s = i; while (s > 0 && cons(s - 1)) s--;
    let k = s; while (k < i && !(i - k === 1 || ONSETS.has(sy.slice(k, i).join("")))) k++;
    out[k] = (m[1] === "1" ? "ˈ" : "ˌ") + out[k];
  }
  return out;
}
async function spLex() { return SP.lex ||= fetch(spBase() + "cmu.json").then(r => { if (!r.ok) throw new Error("cmu"); return r.json(); }).then(d => SP.lexData = d).catch(e => { SP.lex = null; throw e; }); }
const spKey = w => String(w).toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z]+|[^a-z']+$/g, "");
function spWordPh(lex, w) { const k = spKey(w); const v = (SP.over && SP.over[k]) || lex[k] || lex[k.replace(/'s$/, "")] && lex[k.replace(/'s$/, "")] + " Z"; return v ? v.split(" ") : null; }
/* Câu → [{w, ph:[ARPA có số trọng âm]}], từ không có trong từ điển: ph = null */
const NW1 = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" "), NW10 = ",,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety".split(",");
const ORD = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
function numWords(n) {
  n = Math.floor(n); if (n < 20) return NW1[n]; if (n < 100) return NW10[Math.floor(n / 10)] + (n % 10 ? " " + NW1[n % 10] : "");
  if (n < 1000) return NW1[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + numWords(n % 100) : "");
  if (n < 1e6) return numWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? (n % 1000 < 100 ? " and " : " ") + numWords(n % 1000) : "");
  return String(n).split("").map(d => NW1[+d]).join(" ");
}
const ordWord = w => { const p = w.split(" "), l = p.pop(); return [...p, ORD[l] || (l.endsWith("y") ? l.slice(0, -1) + "ieth" : l + "th")].join(" "); };
/* Chữ số → chữ để căn chỉnh và chấm (đọc như người bản xứ hay đọc) */
function spSpell(text) {
  let t = String(text); while (/\d,\d{3}\b/.test(t)) t = t.replace(/(\d),(\d{3})\b/g, "$1$2");
  return t.replace(/([£$€])\s?(\d+)(?:\.(\d{2}))?/g, (_, c, a, b) => numWords(+a) + " " + ({ "£": "pounds", "$": "dollars", "€": "euros" }[c]) + (b && +b ? " " + numWords(+b) : ""))
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, a, b) => numWords(+a) + (+b ? " " + (+b < 10 ? "oh " + numWords(+b) : numWords(+b)) : " o'clock"))
    .replace(/\b0\d+\b/g, m => m.split("").map(d => d === "0" ? "oh" : NW1[+d]).join(" "))
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, (_, a) => ordWord(numWords(+a)))
    .replace(/\b(1[1-9]|20)(\d{2})\b/g, (m, a, b) => (+m >= 2000 && +m < 2010) ? numWords(+m) : numWords(+a) + " " + (+b === 0 ? "hundred" : +b < 10 ? "oh " + numWords(+b) : numWords(+b)))
    .replace(/\b(\d+)\.(\d+)\b/g, (_, a, b) => numWords(+a) + " point " + b.split("").map(d => NW1[+d]).join(" "))
    .replace(/\b\d+\b/g, m => numWords(+m)).replace(/%/g, " percent");
}
async function spExpected(text) {
  const lex = await spLex();
  const words = spSpell(text).replace(/[“”"]/g, "").replace(/(\w)-(\w)/g, "$1 $2").split(/\s+/).map(w => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "")).filter(Boolean);
  return words.map(w => ({ w, ph: spWordPh(lex, w) }));
}
/* Mô hình → log xác suất [F × 40] (39 âm + khoảng trống), nhiệt độ 2 cho điểm mượt hơn; frames.t = thời điểm (giây) của từng khung */
async function spLogp(a, onProg) {
  await spLoad("ph");
  /* Âm thanh dài: chạy từng khúc 6 giây (đệm 1 giây hai bên cho đủ ngữ cảnh), nghỉ giữa các khúc để trang không bị đơ */
  const T = SP.T, SR = 16000, long = a.length > SR * 8, core = long ? SR * 6 : a.length, pad = long ? SR : 0, frames = [], times = [], nWin = Math.ceil(a.length / core);
  for (let o = 0, wi = 0; o < a.length; o += core, wi++) {
    onProg?.(wi, nWin);
    const s0 = Math.max(0, o - pad), s1 = Math.min(a.length, o + core + pad), seg = a.subarray(s0, s1); if (seg.length < 1600) break;
    let m = 0; for (const v of seg) m += v; m /= seg.length; let sd = 0; for (const v of seg) sd += (v - m) ** 2; sd = Math.sqrt(sd / seg.length) + 1e-7;
    const x = new Float32Array(seg.length); for (let i = 0; i < seg.length; i++) x[i] = (seg[i] - m) / sd;
    const { logits } = await SP.ph({ input_values: new T.Tensor("float32", x, [1, x.length]) });
    const [, F, V] = logits.dims, d = logits.data, step = seg.length / SR / F, lo = o / SR, hi = Math.min(a.length, o + core) / SR;
    for (let f = 0; f < F; f++) {
      const tt = s0 / SR + f * step; if (long && (tt < lo - 1e-6 || tt >= hi - 1e-6)) continue;
      const row = new Float32Array(NC); let mx = -Infinity; for (let v = 0; v < V; v++) mx = Math.max(mx, d[f * V + v] / 2);
      let z = 0; const e = new Float64Array(V); for (let v = 0; v < V; v++) { e[v] = Math.exp(d[f * V + v] / 2 - mx); z += e[v]; }
      let bl = 0; for (let v = 0; v < V; v++) { if (v < NPH) row[v] = Math.log(e[v] / z + 1e-10); else bl += e[v] / z; }
      row[NPH] = Math.log(bl + 1e-10); frames.push(row); times.push(tt);
    }
    if (long) await new Promise(r => setTimeout(r, 0));
  }
  onProg?.(nWin, nWin); frames.t = times; frames.step = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) : 0.02;
  return frames;
}
/* Căn chỉnh CTC cưỡng bức: mỗi âm mong đợi → dãy khung. Con trỏ lùi gói 2 bit/ô để căn được cả bài nghe dài vài phút */
function spAlign(L, seq) {
  const F = L.length, S = [NPH]; for (const p of seq) S.push(p, NPH);
  const n = S.length, NEG = -1e30; if (!F || F < seq.length) return seq.map(() => []);
  const W = (n + 3) >> 2, B = new Uint8Array(F * W);
  let D = new Float64Array(n).fill(NEG), N = new Float64Array(n);
  D[0] = L[0][S[0]]; if (n > 1) D[1] = L[0][S[1]];
  const skip = new Uint8Array(n); for (let s = 2; s < n; s++) skip[s] = S[s] !== NPH && S[s] !== S[s - 2] ? 1 : 0;
  for (let t = 1; t < F; t++) {
    const row = L[t], base = t * W;
    for (let s = 0; s < n; s++) {
      let best = D[s], k = 0;
      if (s >= 1 && D[s - 1] > best) { best = D[s - 1]; k = 1; }
      if (skip[s] && D[s - 2] > best) { best = D[s - 2]; k = 2; }
      N[s] = best + row[S[s]]; if (k) B[base + (s >> 2)] |= k << ((s & 3) << 1);
    }
    const tmp = D; D = N; N = tmp;
  }
  let s = n > 1 && D[n - 2] > D[n - 1] ? n - 2 : n - 1; const segs = seq.map(() => []);
  for (let t = F - 1; t >= 0; t--) { if (s % 2 === 1) segs[(s - 1) / 2].unshift(t); s -= (B[t * W + (s >> 2)] >> ((s & 3) << 1)) & 3; }
  return segs;
}
/* Bản chạy nền cho bài dài: nghỉ sau mỗi 150 khung để trang vẫn bấm được */
async function spAlignAsync(L, seq) {
  const F = L.length, S = [NPH]; for (const p of seq) S.push(p, NPH);
  const n = S.length, NEG = -1e30; if (!F || F < seq.length) return seq.map(() => []);
  const W = (n + 3) >> 2, B = new Uint8Array(F * W);
  let D = new Float64Array(n).fill(NEG), N = new Float64Array(n);
  D[0] = L[0][S[0]]; if (n > 1) D[1] = L[0][S[1]];
  const skip = new Uint8Array(n); for (let s = 2; s < n; s++) skip[s] = S[s] !== NPH && S[s] !== S[s - 2] ? 1 : 0;
  for (let t = 1; t < F; t++) {
    if (t % 150 === 0) await new Promise(r => setTimeout(r, 0));
    const row = L[t], base = t * W;
    for (let s = 0; s < n; s++) {
      let best = D[s], k = 0;
      if (s >= 1 && D[s - 1] > best) { best = D[s - 1]; k = 1; }
      if (skip[s] && D[s - 2] > best) { best = D[s - 2]; k = 2; }
      N[s] = best + row[S[s]]; if (k) B[base + (s >> 2)] |= k << ((s & 3) << 1);
    }
    const tmp = D; D = N; N = tmp;
  }
  let s = n > 1 && D[n - 2] > D[n - 1] ? n - 2 : n - 1; const segs = seq.map(() => []);
  for (let t = F - 1; t >= 0; t--) { if (s % 2 === 1) segs[(s - 1) / 2].unshift(t); s -= (B[t * W + (s >> 2)] >> ((s & 3) << 1)) & 3; }
  return segs;
}
const PH_FUNC = new Set("a an the and but or of to for from at in on as is are was were be been am do does did have has had can could will would shall should must that than them their there you your he she we they his her our it its this some by with".split(" "));
/* Âm được chấp nhận thêm: dạng yếu của từ chức năng, /i/ cuối từ (happy) */
function phAlts(word, p, j, n) {
  const b = phBase(p), out = [];
  if (PH_FUNC.has(spKey(word)) && isVowel(b)) out.push("AH", "IH", "ER");
  if (PH_FUNC.has(spKey(word)) && b === "R") out.push("ER");
  if (b === "IY" && /0$/.test(p) && j === n - 1) out.push("IH");
  if (b === "AH" && /0$/.test(p)) out.push("IH", "UH");
  if (b === "IH" && /0$/.test(p)) out.push("AH");
  return out.map(x => A2I[x]);
}
const phScore = g => Math.max(0, Math.min(100, Math.round((g + 4) / 3.7 * 100)));
/* Chấm: exp = [{w, ph}] → mỗi từ có điểm, mỗi âm có điểm và "nghe giống" */
/* Biến âm khi nói liền (người bản xứ vẫn chấp nhận): did you → /dɪdʒuː/, last night mất /t/, water → /wɑːdər/ (giọng Mỹ), bỏ /h/ trong him, her… */
const H_DROP = new Set("him her his he have has had".split(" "));
function spCtx(exp) {
  const ctx = exp.map(w => (w.ph || []).map(() => ({ alts: [], elide: false })));
  const B = phBase, cons = p => p && !isVowel(p);
  exp.forEach((w, k) => {
    const ph = w.ph; if (!ph) return; const n = ph.length, nx = exp[k + 1]?.ph, f = nx && B(nx[0]), l = B(ph[n - 1]), c = ctx[k];
    for (let j = 1; j < n - 1; j++) { const p = B(ph[j]); if (p === "T" && (isVowel(ph[j - 1]) || B(ph[j - 1]) === "R") && isVowel(ph[j + 1]) && /0$/.test(ph[j + 1])) c[j].alts.push("D"); if (p === "T" && B(ph[j - 1]) === "N" && isVowel(ph[j + 1]) && /0$/.test(ph[j + 1])) c[j].elide = true; }
    if (k > 0 && H_DROP.has(spKey(w.w)) && B(ph[0]) === "HH") c[0].elide = true;
    if (spKey(w.w) === "to" && k > 0 && exp[k - 1].ph && ["N", "T", "NG"].includes(B(exp[k - 1].ph[exp[k - 1].ph.length - 1]))) c[0].elide = true;
    if (spKey(w.w) === "going" && spKey(exp[k + 1]?.w || "") === "to") ph.forEach((p, j) => { const b = B(p); if (b === "OW") c[j].alts.push("AH"); if (b === "IH") c[j].elide = true; if (b === "NG") c[j].alts.push("N"); });
    if (!nx) return; const c2 = ctx[k + 1];
    if (cons(nx[0]) && f !== "Y") { if (l === "T") c[n - 1].elide = true; if (spKey(w.w) === "of" && l === "V") c[n - 1].elide = true;
      if ("T P K F S SH CH TH HH".split(" ").includes(f)) { const dv = { Z: "S", V: "F", D: "T" }[l]; if (dv) c[n - 1].alts.push(dv); } }
    const mix = { "T>Y": "CH", "D>Y": "JH", "S>Y": "SH", "Z>Y": "ZH" }[l + ">" + f]; if (mix) { c[n - 1].alts.push(mix); c2[0].alts.push(mix); }
    if ((l === "T" || l === "D") && n >= 2 && cons(ph[n - 2]) && cons(nx[0]) && f !== "Y") c[n - 1].elide = true;
    if (cons(ph[n - 1]) && l === f) c[n - 1].elide = true;
    if (l === "T" && n >= 2 && (isVowel(ph[n - 2]) || B(ph[n - 2]) === "R") && isVowel(nx[0])) c[n - 1].alts.push("D");
  });
  return ctx;
}
function spGOP(L, exp) {
  const seq = [], own = [], ctx = spCtx(exp);
  exp.forEach((w, k) => (w.ph || []).forEach((p, j) => { seq.push(A2I[phBase(p)]); own.push([k, j]); }));
  const segs = spAlign(L, seq);
  const words = exp.map(w => ({ w: w.w, ph: w.ph, ipa: w.ph ? arpaIpa(w.ph) : "", arr: w.ph ? arpaIpaArr(w.ph) : [], phones: [], score: null }));
  seq.forEach((p, i) => {
    const fr = segs[i], [k, j] = own[i], ex = exp[k].ph[j]; let g = -12, alt = null;
    if (fr.length) {
      let sum = 0; const acc = new Float64Array(NPH);
      for (const t of fr) { const r = L[t]; let mx = -Infinity; for (let v = 0; v < NPH; v++) mx = Math.max(mx, r[v]); let z = 0; for (let v = 0; v < NPH; v++) z += Math.exp(r[v] - mx); const nb = mx + Math.log(z); sum += r[p] - nb; for (let v = 0; v < NPH; v++) acc[v] += r[v] - nb; }
      const alts = [...phAlts(exp[k].w, ex, j, exp[k].ph.length), ...ctx[k][j].alts.map(x => A2I[x])];
      g = sum / fr.length; for (const q of alts) g = Math.max(g, acc[q] / fr.length);
      let bi = -1, bv = -Infinity; const okSet = new Set([p, ...alts]); for (let v = 0; v < NPH; v++) if (!okSet.has(v) && acc[v] > bv) { bv = acc[v]; bi = v; }
      if (bv / fr.length > g + 0.3) alt = ARPA[bi];
    }
    const el = ctx[k][j].elide && g < -1.2; if (el) { g = -1.2; alt = null; }
    words[k].phones.push({ p: ex, ipa: phIpa(ex), show: words[k].arr[j], g: +g.toFixed(2), s: phScore(g), heard: alt, miss: !el && (!fr.length || (g < -6 && !alt)), last: j === exp[k].ph.length - 1, elided: el || undefined, fr: fr.length ? [fr[0], fr[fr.length - 1]] : null });
  });
  for (const w of words) if (w.phones.length) w.score = Math.round(w.phones.reduce((a, x) => a + x.s, 0) / w.phones.length);
  const sc = words.filter(w => w.score != null);
  return { words, score: sc.length ? Math.round(sc.reduce((a, w) => a + w.score * w.phones.length, 0) / sc.reduce((a, w) => a + w.phones.length, 0)) : null };
}
/* Chấm một câu/từ đọc theo mẫu */
async function spCheckText(blob, text, say) {
  say?.("Đang nghe…");
  const raw = await spDecode(blob), z = spPauses(raw);
  if (!z.speech || z.speech < 0.15) throw { vn: "Không nghe thấy tiếng nói. Nói to, rõ và gần micro hơn nhé." };
  const a = spTrim(raw), exp = await spExpected(text);
  if (!exp.some(x => x.ph)) throw { vn: "Chưa có phiên âm cho câu này." };
  say?.("Đang chấm từng âm…");
  const r = spGOP(await spLogp(a), exp); r.dur = +(a.length / 16000).toFixed(1); r.level = z.level; return r;
}
/* Lời khuyên tiếng Việt cho một âm sai */
const PH_TIP = {
  "TH>S": "/θ/ đọc thành /s/: đặt đầu lưỡi giữa hai hàm răng rồi thổi hơi.", "TH>T": "/θ/ đọc thành /t/: lưỡi nằm giữa hai răng và thổi hơi liên tục, không bật như /t/.", "TH>F": "/θ/ đọc thành /f/: dùng đầu lưỡi, không dùng môi dưới.",
  "DH>D": "/ð/ đọc thành /d/: đưa đầu lưỡi ra giữa hai răng, rung cổ họng.", "DH>Z": "/ð/ đọc thành /z/: đưa đầu lưỡi ra giữa hai răng.",
  "IY>IH": "/iː/ đọc ngắn thành /ɪ/: kéo dài, căng môi như đang cười.", "IH>IY": "/ɪ/ đọc dài thành /iː/: đọc ngắn, thả lỏng miệng.",
  "AE>EH": "/æ/ đọc thành /e/: há miệng rộng hơn, hạ hàm dưới.", "EH>AE": "/e/ đọc thành /æ/: miệng mở vừa thôi, không hạ hàm nhiều.",
  "SH>S": "/ʃ/ đọc thành /s/: chu môi, lưỡi lùi về sau.", "S>SH": "/s/ đọc thành /ʃ/: không chu môi, lưỡi sát răng trên.",
  "V>B": "/v/ đọc thành /b/: răng trên chạm môi dưới, rung.", "V>W": "/v/ đọc thành /w/: răng trên chạm nhẹ môi dưới.", "W>V": "/w/ đọc thành /v/: chu tròn môi, răng không chạm môi.",
  "Z>S": "/z/ đọc thành /s/: cho cổ họng rung (tiếng zzz như ong).", "L>N": "/l/ đọc thành /n/: đầu lưỡi chạm lợi, hơi đi hai bên lưỡi.", "N>L": "/n/ đọc thành /l/: cho hơi đi ra mũi.",
  "R>L": "/r/ đọc thành /l/: cong đầu lưỡi về sau, không chạm vòm miệng.", "L>R": "/l/ đọc thành /r/: chạm đầu lưỡi vào lợi trên.",
  "UW>UH": "/uː/ đọc ngắn: kéo dài, chu tròn môi.", "UH>UW": "/ʊ/ đọc dài: đọc ngắn, môi thả lỏng.", "AA>AH": "/ɑː/ đọc ngắn thành /ʌ/: há rộng miệng, kéo dài.", "AH>AA": "/ʌ/ đọc thành /ɑː/: đọc ngắn, miệng mở vừa.",
  "P>B": "/p/ đọc thành /b/: bật hơi mạnh, không rung cổ họng.", "T>D": "/t/ đọc thành /d/: bật hơi mạnh, không rung.", "K>G": "/k/ đọc thành /ɡ/: bật hơi mạnh.", "CH>SH": "/tʃ/ đọc thành /ʃ/: chặn lưỡi ở lợi trước rồi bật ra.", "JH>Z": "/dʒ/ đọc thành /z/: chặn lưỡi rồi bật, chu môi.",
  "EY>EH": "/eɪ/ thiếu đuôi /ɪ/: trượt từ “ê” sang “i”.", "OW>AO": "/oʊ/ thiếu đuôi /ʊ/: trượt từ “ô” sang “u”, môi tròn dần.", "AY>AA": "/aɪ/ thiếu đuôi: trượt từ “a” sang “i”.", "NG>N": "/ŋ/ đọc thành /n/: cuống lưỡi chạm ngạc mềm như “ng”."
};
function phTip(x) {
  const b = phBase(x.p);
  if (x.miss) return x.last && !isVowel(x.p) ? `Thiếu âm cuối /${phIpa(x.p)}/: người Việt hay nuốt âm cuối, hãy bật nhẹ âm này ra.` : `Âm /${phIpa(x.p)}/ gần như không nghe thấy.`;
  if (x.heard) return PH_TIP[b + ">" + x.heard] || `Âm /${phIpa(x.p)}/ nghe giống /${phIpa(x.heard)}/.`;
  return x.last && !isVowel(x.p) ? `Âm cuối /${phIpa(x.p)}/ còn yếu, đọc rõ hơn.` : `Âm /${phIpa(x.p)}/ chưa rõ.`;
}
