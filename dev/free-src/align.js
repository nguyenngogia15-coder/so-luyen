/* ===== Căn thời gian từng câu trong một bài nghe dài (cho Nghe chép, Shadowing, bấm câu để nghe lại) =====
   1. Dò khoảng lặng: tức thì, không cần mô hình, đúng khi giữa các câu có chỗ ngừng rõ.
   2. Căn cưỡng bức bằng mô hình âm vị (HuBERT, cùng mô hình chấm phát âm): khớp từng âm của lời thoại với âm thanh,
      đúng tới khoảng 20–40 ms kể cả khi người đọc nói liền không ngừng. Kết quả lưu lại trên máy và chia sẻ cho cả nhóm. */
const AL = { bufs: new Map(), mem: {} };
const alSents = s => s.turns.flatMap(([sp, t], ti) => LS_SENT(t).map((x, k) => ({ ti, k, sp, x })));
/* Giải mã âm thanh: giữ bản gốc để phát (đủ chất lượng) và bản 16 kHz để phân tích */
async function alDecode(url) {
  if (AL.bufs.has(url)) return AL.bufs.get(url);
  const p = (async () => {
    const ab = await (await fetch(url)).arrayBuffer(), AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
    const buf = await ac.decodeAudioData(ab); try { ac.close(); } catch {}
    const len = Math.ceil(buf.duration * 16000), off = new OfflineAudioContext(1, Math.max(1, len), 16000);
    const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
    const a16 = (await off.startRendering()).getChannelData(0).slice();
    return { buf, a16, dur: buf.duration };
  })();
  AL.bufs.set(url, p); if (AL.bufs.size > 3) AL.bufs.delete(AL.bufs.keys().next().value);
  p.catch(() => AL.bufs.delete(url)); return p;
}
/* Cắt đúng đoạn [s, e] giây thành WAV riêng để phát: không lệch do tua MP3, đổi tốc độ vẫn giữ giọng */
function alSlice(buf, s, e) {
  const r = buf.sampleRate, a = Math.max(0, Math.floor(s * r)), b = Math.min(buf.length, Math.ceil(e * r)), n = Math.max(1, b - a), ch = buf.numberOfChannels;
  const mono = new Float32Array(n); for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[a + i] / ch; }
  const fade = Math.min(n >> 1, Math.round(r * 0.012)); for (let i = 0; i < fade; i++) { mono[i] *= i / fade; mono[n - 1 - i] *= i / fade; }
  return lsWav(mono, r);
}
const AL_PLAY = { a: null, url: null };
function alPlay(buf, s, e, rate = 1) {
  alStop(); const url = URL.createObjectURL(alSlice(buf, s, e)), a = new Audio(url);
  a.playbackRate = rate; try { a.preservesPitch = true; } catch {} AL_PLAY.a = a; AL_PLAY.url = url;
  a.onended = () => { if (AL_PLAY.a === a) { URL.revokeObjectURL(url); AL_PLAY.a = null; } };
  return a.play().then(() => a, () => a);
}
function alStop() { try { AL_PLAY.a?.pause(); } catch {} if (AL_PLAY.url) URL.revokeObjectURL(AL_PLAY.url); AL_PLAY.a = null; AL_PLAY.url = null; }

/* ----- 1. Dò khoảng lặng + quy hoạch động theo độ dài câu ----- */
function alEnergy(a16) {
  const hop = 160, fr = new Float32Array(Math.floor(a16.length / hop));
  for (let f = 0; f < fr.length; f++) { let s = 0; for (let j = f * hop; j < f * hop + hop; j++) s += a16[j] * a16[j]; fr[f] = Math.sqrt(s / hop); }
  return fr;
}
function alSilence(a16, sents) {
  const fr = alEnergy(a16), srt = Array.from(fr).sort((x, y) => x - y), noise = srt[Math.floor(srt.length * 0.1)] || 0, peak = srt[Math.floor(srt.length * 0.95)] || 0;
  const thr = Math.max(noise * 2.5, peak * 0.06, 0.003), sil = Array.from(fr, v => v < thr);
  const first = sil.indexOf(false), last = sil.lastIndexOf(false); if (first < 0) return null;
  const cand = []; let run = 0;
  for (let i = first; i <= last + 1; i++) { if (i <= last && sil[i]) run++; else { if (run >= 8) cand.push({ c: (i - run / 2) * 0.01, len: run * 0.01 }); run = 0; } }
  /* chỗ hai câu dính liền không có khoảng lặng: lấy thêm các điểm năng lượng thấp cục bộ (độ tin thấp) */
  const sm = fr.map((_, i) => { let a = 0, c = 0; for (let j = Math.max(0, i - 3); j <= Math.min(fr.length - 1, i + 3); j++) { a += fr[j]; c++; } return a / c; });
  const med = srt[Math.floor(srt.length * 0.6)] || thr;
  for (let i = first + 20; i < last - 20; i++) if (sm[i] < med * 0.45 && sm[i] <= sm[i - 1] && sm[i] < sm[i + 1] && !cand.some(c => Math.abs(c.c - i * 0.01) < 0.15)) { let lo = i; for (let j = i - 15; j <= i + 15; j++) if (sm[j] < sm[lo]) lo = j; if (lo === i) cand.push({ c: i * 0.01, len: 0.02, weak: true }); }
  cand.sort((a, b) => a.c - b.c);
  const n = sents.length, S0 = first * 0.01, S1 = (last + 1) * 0.01;
  if (n === 1) return [[Math.max(0, S0 - 0.15), Math.min(a16.length / 16000, S1 + 0.2)]];
  const w = sents.map(x => x.x.length + 6), W = w.reduce((a, b) => a + b, 0);
  const pts = [{ c: S0, len: 1, start: true }, ...cand, { c: S1, len: 1, end: true }], m = pts.length;
  /* D[i][j]: chi phí tốt nhất khi ranh giới thứ i rơi vào điểm j */
  const speech = (S1 - S0) - cand.reduce((a, x) => a + x.len, 0), rate = Math.max(1, speech) / W;
  const E = w.map(x => x * rate), INF = 1e18;
  let D = new Float64Array(m).fill(INF); D[0] = 0; const back = [];
  const pre = new Float64Array(m); for (let j = 1; j < m; j++) pre[j] = pre[j - 1] + (j - 1 > 0 && j - 1 < m - 1 ? pts[j - 1].len : 0);
  for (let i = 1; i <= n; i++) {
    const N = new Float64Array(m).fill(INF), bk = new Int32Array(m).fill(-1);
    for (let j = 1; j < m; j++) {
      if (i === n && j !== m - 1) continue; if (i < n && j === m - 1) continue;
      const bonus = j === m - 1 ? 0 : pts[j].weak ? 0.6 : -1.6 * Math.min(1, pts[j].len / 0.45);
      for (let k = 0; k < j; k++) {
        if (D[k] >= INF) continue;
        const dur = (pts[j].c - pts[k].c) - (pre[j] - pre[k + 1]) - (k > 0 ? pts[k].len / 2 : 0) - (j < m - 1 ? pts[j].len / 2 : 0);
        if (dur < E[i - 1] * 0.25 || dur > E[i - 1] * 4 + 2) continue;
        const z = (dur - E[i - 1]) / (E[i - 1] * 0.35 + 0.25), c = D[k] + z * z + bonus;
        if (c < N[j]) { N[j] = c; bk[j] = k; }
      }
    }
    D = N; back.push(bk);
  }
  if (D[m - 1] >= INF) return null;
  const cuts = [m - 1]; for (let i = n - 1; i >= 0; i--) cuts.unshift(back[i][cuts[0]]);
  const T = a16.length / 16000;
  return sents.map((_, i) => { const a = pts[cuts[i]], b = pts[cuts[i + 1]]; return [+(i === 0 ? Math.max(0, a.c - 0.15) : a.c).toFixed(2), +(i === n - 1 ? Math.min(T, b.c + 0.25) : b.c).toFixed(2)]; });
}

/* ----- 2. Căn cưỡng bức bằng mô hình âm vị ----- */
async function alForced(a16, sents, onProg) {
  const L = await spLogp(a16, (i, n) => onProg?.(i, n)), t = L.t, step = L.step;
  const exps = await Promise.all(sents.map(s => spExpected(s.x))), seq = [], own = [];
  exps.forEach((ws, si) => ws.forEach((w, wi) => (w.ph || []).forEach(p => { seq.push(A2I[phBase(p)]); own.push([si, wi]); })));
  const al = await spAlignAsync(L, seq), span = sents.map(() => [Infinity, -Infinity]), words = exps.map(ws => ws.map(w => ({ w: w.w, s: null, e: null })));
  al.forEach((f, i) => { if (!f.length) return; const [si, wi] = own[i], a = t[f[0]], b = t[f[f.length - 1]] + step;
    span[si][0] = Math.min(span[si][0], a); span[si][1] = Math.max(span[si][1], b);
    const W = words[si][wi]; W.s = W.s == null ? a : Math.min(W.s, a); W.e = W.e == null ? b : Math.max(W.e, b); });
  /* câu không căn được (toàn tên riêng, số lạ): nội suy theo hai câu bên cạnh */
  for (let i = 0; i < span.length; i++) if (!isFinite(span[i][0])) { const pv = span.slice(0, i).reverse().find(x => isFinite(x[1])), nx = span.slice(i + 1).find(x => isFinite(x[0])); span[i] = [pv ? pv[1] + 0.1 : 0, nx ? nx[0] - 0.1 : a16.length / 16000]; }
  /* ranh giới: chỗ năng lượng thấp nhất quanh khoảng giữa hai câu (mô hình CTC hay báo âm cuối sớm hơn thật) */
  const T = a16.length / 16000, fr = alEnergy(a16), sm = i => { let a = 0, c = 0; for (let j = Math.max(0, i - 2); j <= Math.min(fr.length - 1, i + 2); j++) { a += fr[j]; c++; } return a / c; };
  const lowest = (x, y) => { let lo = -1, lv = Infinity; for (let f = Math.max(0, Math.floor(x * 100)); f <= Math.min(fr.length - 1, Math.ceil(y * 100)); f++) { const v = sm(f); if (v < lv) { lv = v; lo = f; } } return lo < 0 ? (x + y) / 2 : lo / 100; };
  const cuts = [];
  for (let i = 0; i < span.length - 1; i++) { let x = span[i][1] - 0.06, y = span[i + 1][0] + 0.06; if (y - x < 0.16) { const c = (x + y) / 2; x = c - 0.12; y = c + 0.12; } cuts.push(lowest(x, Math.min(y, x + 1.2))); }
  const srt = Array.from(fr).sort((p, q) => p - q), thr = Math.max((srt[Math.floor(srt.length * 0.1)] || 0) * 2.5, (srt[Math.floor(srt.length * 0.95)] || 0) * 0.06, 0.003);
  let head = Math.floor(Math.max(0, span[0][0] - 0.6) * 100); while (head < fr.length && fr[head] < thr) head++;
  let tail = Math.ceil(Math.min(T, span[span.length - 1][1] + 0.8) * 100); while (tail > 0 && fr[Math.min(fr.length - 1, tail)] < thr) tail--;
  const segs = span.map((_, i) => [+(i ? cuts[i - 1] : Math.max(0, Math.min(span[0][0], head / 100) - 0.12)).toFixed(2), +(i < span.length - 1 ? cuts[i] : Math.min(T, Math.max(span[i][1], tail / 100) + 0.2)).toFixed(2)]);
  return { segs, words: words.map(ws => ws.map(w => w.s == null ? [w.w] : [w.w, +w.s.toFixed(2), +w.e.toFixed(2)])) };
}

/* ----- Lấy mốc câu cho một bài: bộ nhớ máy → kho chung → tự tính ----- */
const alLocal = { get: k => { try { return JSON.parse(localStorage.getItem("al:" + k) || "null"); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("al:" + k, JSON.stringify(v)); } catch {} } };
/* key: định danh âm thanh (ví dụ id-g2); url: âm thanh; trả về {segs, words?, how: "forced"|"silence"} */
async function alGet(key, url, sents, { forced = "auto", onProg } = {}) {
  const want = sents.length, ok = r => r && Array.isArray(r.segs) && r.segs.length === want;
  let r = AL.mem[key] || alLocal.get(key); if (ok(r) && (r.how === "forced" || forced === false)) return AL.mem[key] = r;
  if (window.__alShare) { const sh = await window.__alShare({ get: key }).catch(() => null); if (ok(sh)) { sh.how = "forced"; alLocal.set(key, sh); return AL.mem[key] = sh; } }
  const d = await alDecode(url);
  const canForce = forced === true || (forced === "auto" && (spReady(["ph"]) || await spCached(["ph"])));
  if (canForce) {
    try {
      const f = await alForced(d.a16, sents, onProg); const out = { segs: f.segs, words: f.words, how: "forced" };
      alLocal.set(key, out); AL.mem[key] = out; window.__alShare?.({ put: key, segs: f.segs, words: f.words }).catch(() => {}); return out;
    } catch (e) { console.warn("căn cưỡng bức lỗi", e); }
  }
  const segs = alSilence(d.a16, sents) || sents.map((_, i) => [d.dur * i / want, d.dur * (i + 1) / want]);
  return AL.mem[key] = { segs, how: "silence" };
}

/* ----- Mốc câu cho bài nghe đang mở, theo giọng đang chọn ----- */
UI.lsSeg ||= {};
function lsSrcInfo(s, want) {
  const A = (UI.lsA || {}).id === s.id ? UI.lsA : {};
  const gem = A.gemUrl ? { kind: "gem", url: A.gemUrl, key: s.id + "-g2" } : null;
  const kk = A.kUrl ? { kind: "k", url: A.kUrl, key: s.id + "-k", exact: A.segs } : null;
  return want === "k" ? kk || gem : want === "gem" ? gem || kk : (A.src === "gem" ? gem : kk) || gem || kk;
}
/* Trả về {state, segs, how, prog} và tự chạy nền; render lại khi có kết quả */
function lsSegs(s, src) {
  if (!src) return { state: "nosrc" };
  const sents = alSents(s), key = src.key, have = UI.lsSeg[key];
  if (have) return have;
  if (src.exact?.length === sents.length) { const T = src.exact, segs = T.map((z, i) => [Math.max(0, z[1] - 0.1, i ? (T[i - 1][2] + z[1]) / 2 : 0), Math.min(z[2] + 0.15, i < T.length - 1 ? (z[2] + T[i + 1][1]) / 2 : z[2] + 0.4)]); return UI.lsSeg[key] = { state: "ok", how: "exact", segs }; }
  const st = UI.lsSeg[key] = { state: "loading", segs: null };
  const rr = () => { if (document.querySelector("[data-lsseg]")) render(); };
  alGet(key, src.url, sents, { forced: false }).then(async r => {
    Object.assign(st, { state: "ok", segs: r.segs, how: r.how, words: r.words }); rr();
  }, e => { Object.assign(st, { state: "err", err: String(e?.message || e) }); rr(); });
  return st;
}
function lsSegForce(s, src) {
  const st = UI.lsSeg[src.key] ||= { state: "loading" }; if (st.forcing) return; st.forcing = true; st.prog = "Đang tải bộ căn câu…";
  const rr = () => { if (document.querySelector("[data-lsseg]")) render(); }; rr();
  alGet(src.key, src.url, alSents(s), { forced: true, onProg: (i, n) => { st.prog = `Đang căn câu chính xác: ${Math.round(i / n * 100)}%`; const el = document.querySelector("[data-lsseg-msg]"); if (el) el.textContent = st.prog; } })
    .then(r => { Object.assign(st, { state: "ok", segs: r.segs, how: r.how, words: r.words, forcing: false, prog: "" }); rr(); }, e => { st.forcing = false; st.prog = "Chưa căn được: " + (e?.message || e); rr(); });
}
/* Dòng trạng thái độ chính xác + nút căn chính xác */
function lsSegNote(s, src, st) {
  if (!src || st.state === "nosrc") return null;
  if (st.how === "exact") return h("span", { class: "small muted", "data-lsseg": "1" }, "Mốc câu chính xác (thu sẵn từng câu).");
  if (st.how === "forced") return h("span", { class: "small muted", "data-lsseg": "1" }, "✓ Mốc câu đã căn chính xác bằng mô hình âm vị.");
  if (st.state === "loading") return h("span", { class: "small muted", "data-lsseg": "1" }, "Đang dò mốc từng câu…");
  if (st.state === "err") return h("span", { class: "small", style: "color:var(--bad)", "data-lsseg": "1" }, "Chưa đọc được âm thanh: " + st.err);
  if (st.forcing) return h("span", { class: "small muted", "data-lsseg": "1", "data-lsseg-msg": "1" }, st.prog || "Đang căn câu chính xác…");
  if (spReady(["ph"])) return h("div", { class: "row small muted", style: "gap:8px", "data-lsseg": "1" }, h("span", null, "✓ Câu đang học được căn chính xác bằng mô hình âm vị."), h("button", { class: "btn btn-quiet small", type: "button", onclick: () => lsSegForce(s, src) }, "Căn cả bài cho cả nhóm (1–3 phút)"), st.prog ? h("span", null, st.prog) : null);
  return h("div", { class: "note warn small stack", style: "gap:6px", "data-lsseg": "1" },
    h("span", null, "Mốc câu đang ước lượng theo khoảng lặng, có thể lệch ở chỗ người nói nói liền. Bật bộ chấm phát âm để máy căn chính xác từng câu bạn đang nghe, hoặc căn cả bài một lần cho cả nhóm dùng chung (1–3 phút)."),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => lsSegForce(s, src) }, "Căn cả bài chính xác"), h("button", { class: "btn btn-quiet", type: "button", onclick: async () => { await spLoad("ph").catch(() => {}); render(); } }, "Bật bộ chấm (145 MB lần đầu)"), st.prog ? h("span", { class: "small muted" }, st.prog) : null));
}
async function lsPlaySent(src, seg, rate) { const d = await alDecode(src.url); return alPlay(d.buf, seg[0], seg[1], rate); }
/* Căn chính xác riêng câu đang học (cùng câu trước và sau) khi đã có bộ chấm: vài giây, không phải chờ căn cả bài */
function lsSegAt(s, src, st, i) {
  if (!st?.segs) return null;
  if (st.how !== "silence") return st.segs[i];
  const f = (st.fine ||= {}); if (f[i]) return f[i];
  if (spReady(["ph"]) && !(st.refining ||= {})[i]) {
    st.refining[i] = true;
    (async () => {
      const d = await alDecode(src.url), sents = alSents(s), n = sents.length, lo = Math.max(0, i - 1), hi = Math.min(n - 1, i + 1);
      const a = Math.max(0, st.segs[lo][0] - 1), b = Math.min(d.dur, st.segs[hi][1] + 1), r = await alForced(d.a16.subarray(Math.floor(a * 16000), Math.ceil(b * 16000)), sents.slice(lo, hi + 1));
      const m = r.segs[i - lo]; f[i] = [+(a + m[0]).toFixed(2), +(a + m[1]).toFixed(2)];
      if (document.querySelector("[data-lsseg]")) render();
    })().catch(e => console.warn("căn câu", e));
  }
  return st.segs[i];
}
