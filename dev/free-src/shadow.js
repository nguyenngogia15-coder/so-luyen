/* ===== Shadowing: nghe từng câu rồi nói lại, máy chấm phát âm từng âm + nhịp + tốc độ so với giọng mẫu (không gọi AI) =====
   Nguồn: bài nghe trong web (giọng Gemini hoặc Kokoro, mốc câu căn chính xác) hoặc video YouTube (mốc câu theo phụ đề). */
const SHW = { api: null, player: null, vid: null, tm: null, rec: null, userUrl: null };

/* ----- Ghi âm tự dừng khi bạn nói xong (ngừng 1,2 giây) ----- */
async function autoRec({ maxSec = 15, quietSec = 1.2, idleSec = 6, onState } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const rec = new MediaRecorder(stream), parts = []; rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 1024; spHpChain(ac, ac.createMediaStreamSource(stream)).connect(an);
  const buf = new Float32Array(an.fftSize); let noise = 0, nN = 0, spoke = false, quiet = 0; const t0 = Date.now();
  return new Promise((res, rej) => {
    const stop = () => { clearInterval(iv); try { rec.state === "recording" && rec.stop(); } catch {} };
    SHW.rec = { stop };
    rec.onstop = () => { try { ac.close(); } catch {} stream.getTracks().forEach(t => t.stop()); SHW.rec = null; onState?.("done"); res(new Blob(parts, { type: rec.mimeType || "audio/webm" })); };
    rec.onerror = e => { stop(); rej(e); };
    rec.start(); onState?.("rec");
    const iv = setInterval(() => {
      an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; const rms = Math.sqrt(s / buf.length), el = (Date.now() - t0) / 1000;
      if (el < 0.35) { noise += rms; nN++; return; }
      const thr = Math.max(0.012, (noise / Math.max(1, nN)) * 3);
      if (rms > thr) { spoke = true; quiet = 0; } else quiet += 0.05;
      onState?.("rec", { spoke, el });
      if ((spoke && quiet >= quietSec) || el >= maxSec || (!spoke && el >= idleSec)) stop();
    }, 50);
  });
}

/* ----- Chấm một câu shadowing ----- */
function wordTimes(r, L) {
  return r.words.map(w => { const f = w.phones.filter(x => x.fr); if (!f.length) return null; return { s: L.t[f[0].fr[0]], e: L.t[f[f.length - 1].fr[1]] + L.step }; });
}
async function shadowScore(text, blob, modelA16, modelDur) {
  await spLoad("ph");
  const raw = await spDecode(blob), z = spPauses(raw); if (!z.speech || z.speech < 0.3) throw { vn: "Máy chưa nghe thấy bạn nói. Nói to, gần micro hơn nhé." };
  const ua = spTrim(raw), exp = await spExpected(text); if (!exp.some(x => x.ph)) throw { vn: "Câu này chưa có phiên âm để chấm." };
  const Lu = await spLogp(ua), ru = spGOP(Lu, exp), tu = wordTimes(ru, Lu);
  let tm = null, mSpan = modelDur || null;
  if (modelA16) { const ma = spTrim(modelA16), Lm = await spLogp(ma), rm = spGOP(Lm, exp); tm = wordTimes(rm, Lm); const v = tm.filter(Boolean); if (v.length) mSpan = v[v.length - 1].e - v[0].s; }
  const vu = tu.filter(Boolean), uSpan = vu.length ? vu[vu.length - 1].e - vu[0].s : z.speech;
  const notes = []; let rhythm = null;
  if (tm) {
    const idx = exp.map((_, k) => k).filter(k => tu[k] && tm[k]);
    if (idx.length >= 3) {
      const nu = k => (tu[k].s - tu[idx[0]].s) / Math.max(0.2, tu[idx[idx.length - 1]].s - tu[idx[0]].s), nm = k => (tm[k].s - tm[idx[0]].s) / Math.max(0.2, tm[idx[idx.length - 1]].s - tm[idx[0]].s);
      const mad = idx.reduce((a, k) => a + Math.abs(nu(k) - nm(k)), 0) / idx.length; rhythm = Math.max(0, Math.min(100, Math.round(100 - mad * 380)));
      const extra = [], miss = [];
      for (let q = 0; q < idx.length - 1; q++) { const a = idx[q], b = idx[q + 1], gu = tu[b].s - tu[a].e, gm = tm[b].s - tm[a].e;
        if (gu > 0.4 && gm < 0.15) extra.push(exp[a].w + " … " + exp[b].w); if (gm > 0.3 && gu < 0.1) miss.push(exp[a].w + " | " + exp[b].w); }
      if (extra.length) notes.push("Bạn ngắt hơi giữa cụm mà người mẫu nói liền: " + extra.slice(0, 3).join(", ") + ".");
      if (miss.length) notes.push("Người mẫu ngừng ở chỗ này, bạn nói liền qua: " + miss.slice(0, 3).join(", ") + ".");
    }
  }
  let speed = null;
  if (mSpan && uSpan) { const k = uSpan / mSpan; speed = { ratio: +k.toFixed(2), score: Math.max(0, Math.min(100, Math.round(100 - Math.abs(Math.log(k)) * 160))) };
    if (k > 1.25) notes.push(`Bạn nói chậm hơn mẫu khoảng ${Math.round((k - 1) * 100)}%. Thử nói liền các từ nhỏ (to, of, and) và bớt kéo dài từng từ.`); else if (k < 0.8) notes.push(`Bạn nói nhanh hơn mẫu khoảng ${Math.round((1 - k) * 100)}%, chú ý giữ rõ âm cuối.`); }
  const pron = ru.score ?? 0, parts = [[pron, 0.6], [rhythm, 0.25], [speed?.score, 0.15]].filter(x => x[0] != null), wsum = parts.reduce((a, x) => a + x[1], 0);
  const total = Math.round(parts.reduce((a, x) => a + x[0] * x[1], 0) / wsum);
  const linked = ru.words.flatMap(w => w.phones.filter(x => x.elided).map(() => w.w)); if (linked.length) notes.push("Máy đã chấp nhận chỗ bạn nối/nuốt âm tự nhiên như người bản xứ: " + [...new Set(linked)].slice(0, 4).join(", ") + ".");
  return { words: ru.words, pron, rhythm, speed, total, notes };
}

/* ----- Giao diện chung cho một câu ----- */
function shadowCard({ text, n, i, go, playModel, modelInfo, extra, onScore, best }) {
  const S = UI.shw, R = S.res && S.res.key === S.key + ":" + i ? S.res : null;
  const info = h("span", { class: "small muted" });
  const userPlay = () => { if (SHW.userUrl) { alStop(); const a = new Audio(SHW.userUrl); AL_PLAY.a = a; a.play(); } };
  const judge = async (blob, say) => { say?.("Đang chấm…"); const r = await onScore(blob); if (SHW.userUrl) URL.revokeObjectURL(SHW.userUrl); SHW.userUrl = URL.createObjectURL(blob); S.res = { key: S.key + ":" + i, ...r }; render(); };
  const auto = h("button", { class: "btn btn-primary", type: "button", onclick: async () => {
    if (SHW.rec) { SHW.rec.stop(); return; }
    auto.disabled = true;
    try { info.textContent = "Nghe mẫu…"; const a = await playModel(1); if (a) await new Promise(r => { if (a.ended || a.paused && a.currentTime > 0) return r(); a.addEventListener("ended", r, { once: true }); a.addEventListener("pause", r, { once: true }); });
      auto.disabled = false; auto.textContent = "■ Dừng"; auto.classList.add("on");
      const blob = await autoRec({ maxSec: Math.min(30, (modelInfo?.dur || 5) * 2.2 + 3), onState: (st, x) => { if (st === "rec") info.textContent = x?.spoke ? "Đang ghi… nói xong ngừng một chút là tự dừng" : "Đến lượt bạn: nói lại câu vừa nghe"; } });
      auto.classList.remove("on"); auto.textContent = "Đang chấm…"; auto.disabled = true;
      await judge(blob, t => info.textContent = t);
    } catch (e) { console.warn(e); info.textContent = e?.vn || (e?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng micro." : "Lỗi: " + (e?.message || e)); auto.disabled = false; auto.classList.remove("on"); auto.textContent = "▶● Nghe rồi nói"; }
  } }, "▶● Nghe rồi nói");
  const textNode = h("p", { class: "prompt shw-text" + (S.hide && !R ? " hid" : ""), style: "font-size:1.2rem;margin:0" }, text);
  return h("section", { class: "card stack", style: "gap:10px", "data-lsseg": "1" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, `Câu ${i + 1}/${n}`), h("div", { class: "row", style: "gap:6px" }, best != null ? scoreChip(best, "Tốt nhất ") : null, h("label", { class: "small row", style: "gap:4px" }, h("input", { type: "checkbox", checked: S.hide || null, onchange: e => { S.hide = e.target.checked; render(); } }), "Ẩn chữ (khó hơn)"))),
    textNode,
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => playModel(1) }, "▶ Nghe mẫu"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => playModel(0.75) }, "🐢 0.75×"), extra || null),
    spModelCard(["ph"]),
    spReady(["ph"]) ? h("div", { class: "stack", style: "gap:6px" }, h("div", { class: "row" }, auto, info), h("details", null, h("summary", { class: "small" }, "Tự bấm ghi âm (không tự phát mẫu)"), recBox(judge, { max: 30, hint: "Nói lại câu, xong bấm Dừng." }))) : null,
    R ? h("div", { class: "stack", style: "gap:8px" },
      h("div", { class: "row", style: "gap:12px;align-items:center" }, h("span", { class: "band-big" }, R.total), h("div", { class: "stack", style: "gap:4px" }, h("div", { class: "row", style: "gap:6px" }, scoreChip(R.pron, "Phát âm "), R.rhythm != null ? scoreChip(R.rhythm, "Nhịp ") : null, R.speed ? h("span", { class: "chip " + scCls(R.speed.score) }, `Tốc độ ${R.speed.ratio}× mẫu`) : null), h("span", { class: "small muted" }, "Tổng = 60% phát âm + 25% nhịp + 15% tốc độ"))),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: userPlay }, "▶ Giọng bạn"), h("button", { class: "btn btn-quiet", type: "button", onclick: async () => { const a = await playModel(1); if (a) a.addEventListener("ended", userPlay, { once: true }); } }, "▶ Mẫu rồi tới bạn")),
      resultView({ words: R.words, score: R.pron }, { label: "Từng từ" }),
      R.notes.length ? h("ul", { class: "gex" }, R.notes.map(t => h("li", null, t))) : null) : null,
    h("div", { class: "row" }, h("button", { class: "btn btn-quiet", type: "button", disabled: i === 0 || null, onclick: () => go(-1) }, "‹ Câu trước"), h("button", { class: "btn" + (R ? " btn-primary" : " btn-quiet"), type: "button", disabled: i >= n - 1 || null, onclick: () => go(1) }, "Câu tiếp ›")));
}
function shadowSave(key, i, total) {
  const st = (P.shadow ||= {})[key] ||= { best: {} }; st.best[i] = Math.max(st.best[i] ?? 0, total); st.last = today(); P.shDay = { [today()]: (P.shDay?.[today()] || 0) + 1 };
  award("speaking", 3); addAct("speaking", 1); const all = Object.values(P.shadow).flatMap(x => Object.values(x.best)); (P.shStat ||= {}).n = all.length; P.shStat.avg = Math.round(all.reduce((a, b) => a + b, 0) / Math.max(1, all.length)); saveProfile();
}

/* ----- Tab Shadowing trong trang Nói ----- */
function spShadowTab() {
  const S = UI.shw ||= { mode: "bank", id: LS_BANK[0].id, i: 0, hide: false, res: null, voice: "gem" };
  const modes = h("div", { class: "row", style: "gap:6px" }, [["bank", "Bài nghe trong web"], ["yt", "Video YouTube"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(S.mode === k), onclick: () => { S.mode = k; S.res = null; alStop(); try { SHW.player?.pauseVideo(); } catch {} render(); } }, t)));
  const intro = h("p", { class: "small muted", style: "margin:0;max-width:70ch" }, "Shadowing: nghe một câu của người bản xứ rồi nói lại y hệt, cả âm, nhịp và chỗ ngừng. Máy chấm ngay trên máy bạn: phát âm từng âm, nhịp so với mẫu, tốc độ. Nên đeo tai nghe.");
  return h("div", { class: "stack", style: "gap:12px" }, intro, modes, S.mode === "yt" ? shadowYt(S) : shadowBank(S));
}
function shadowBank(S) {
  const s = lsById(S.id) || LS_BANK[0]; lsPrepare(s);
  const sents = alSents(s), n = sents.length, i = Math.min(S.i, n - 1), A = UI.lsA || {};
  const src = A.id === s.id ? lsSrcInfo(s, S.voice) : null, st = src ? lsSegs(s, src) : { state: "loading" }, seg = lsSegAt(s, src, st, i);
  S.key = "ls:" + s.id;
  const playModel = async rate => seg ? lsPlaySent(src, seg, rate) : null;
  const go = d => { S.i = Math.max(0, Math.min(n - 1, i + d)); S.res = null; alStop(); render(); };
  const best = (P.shadow || {})[S.key]?.best || {};
  const done = Object.keys(best).length, avg = done ? Math.round(Object.values(best).reduce((a, b) => a + b, 0) / done) : null;
  return h("div", { class: "stack", style: "gap:12px" },
    h("div", { class: "row", style: "gap:8px;align-items:center" }, h("span", { class: "small muted" }, "Bài:"), h("select", { onchange: e => { alStop(); S.id = e.target.value; S.i = 0; S.res = null; render(); } }, lsAll().map(x => h("option", { value: x.id, selected: x.id === s.id || null }, `${x.mine || x.shared ? "AI · " : "Đề " + x.test + " · "}S${x.sec} · ${x.title}`))),
      A.id === s.id && A.gemUrl && A.kUrl ? h("div", { class: "row", style: "gap:6px" }, [["gem", "Gemini"], ["k", "Kokoro"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(src?.kind === k), onclick: () => { S.voice = k; S.res = null; alStop(); render(); } }, t))) : null,
      done ? h("span", { class: "small muted" }, `Đã nói ${done}/${n} câu · trung bình ${avg}`) : null),
    lsSegNote(s, src, st),
    seg ? shadowCard({ text: sents[i].x, n, i, go, playModel, modelInfo: { dur: seg[1] - seg[0] }, best: best[i],
      onScore: async blob => { const d = await alDecode(src.url), a = d.a16.subarray(Math.floor(seg[0] * 16000), Math.ceil(seg[1] * 16000)); const r = await shadowScore(sents[i].x, blob, a); shadowSave(S.key, i, r.total); return r; } })
      : h("p", { class: "small muted" }, "Đang chuẩn bị âm thanh và mốc câu…"),
    h("details", null, h("summary", { class: "small" }, "Chọn câu"), h("div", { class: "row", style: "gap:4px;margin-top:6px" }, sents.map((x, k) => h("button", { type: "button", class: "opt small", "aria-pressed": String(k === i), title: x.x, onclick: () => { S.i = k; S.res = null; alStop(); render(); } }, String(k + 1) + (best[k] != null ? " · " + best[k] : ""))))));
}

/* ----- YouTube ----- */
const ytId = u => (String(u).trim().match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/) || String(u).trim().match(/^([\w-]{11})$/) || [])[1] || null;
function ytApi() { return SHW.api ||= new Promise((res, rej) => { if (window.YT?.Player) return res(window.YT); const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); }; const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; sc.onerror = () => { SHW.api = null; rej(new Error("Không tải được trình phát YouTube")); }; document.head.append(sc); }); }
function ytHost() { let el = document.getElementById("shw-yt-host"); if (!el) { el = h("div", { id: "shw-yt-host", class: "shw-yt-host" }, h("div", { id: "shw-yt" })); document.body.append(el); } return el; }
/* Trình phát nằm ngoài vùng vẽ lại của trang (vẽ lại không làm tải lại video), đặt đè lên ô giữ chỗ */
function ytPlace() { const host = document.getElementById("shw-yt-host"); if (!host) return; const ph = document.querySelector(".shw-yt-ph"); if (!ph) { host.style.display = "none"; try { SHW.player?.pauseVideo(); } catch {} return; } const r = ph.getBoundingClientRect(); Object.assign(host.style, { display: "block", top: r.top + scrollY + "px", left: r.left + scrollX + "px", width: r.width + "px", height: r.height + "px" }); }
setInterval(ytPlace, 250); addEventListener("resize", ytPlace);
async function ytOpen(id) {
  const YT = await ytApi(); ytHost(); ytPlace();
  if (SHW.player && SHW.vid === id) return SHW.player;
  if (SHW.player) { SHW.player.cueVideoById(id); SHW.vid = id; return SHW.player; }
  SHW.player = await new Promise(res => { const p = new YT.Player("shw-yt", { videoId: id, width: "100%", height: "100%", playerVars: { playsinline: 1, rel: 0, modestbranding: 1 }, events: { onReady: () => res(p) } }); });
  SHW.vid = id; return SHW.player;
}
function ytPlaySeg(s, e, rate = 1) {
  const p = SHW.player; if (!p) return null; clearInterval(SHW.tm);
  try { p.setPlaybackRate(rate); } catch {} p.seekTo(Math.max(0, s), true); p.playVideo();
  const fake = new EventTarget(); fake.ended = false; fake.paused = false; fake.currentTime = 0;
  SHW.tm = setInterval(() => { let t = 0; try { t = p.getCurrentTime(); } catch {} if (t >= e) { p.pauseVideo(); clearInterval(SHW.tm); fake.ended = true; fake.dispatchEvent(new Event("ended")); } }, 40);
  return fake;
}
/* Bản chép lời → câu có mốc thời gian. Nhận: phụ đề YouTube (có mốc từng từ), WebVTT/SRT, hoặc dán từ ô "Hiện bản chép lời" */
const ytClean = t => String(t).replace(/\[[^\]]*\]|\([^)]*\)|>>|♪/g, " ").replace(/^\s*[A-Z][A-Z .'-]{1,20}:\s*/, "").replace(/\s+/g, " ").trim();
const tsec = x => { const p = String(x).replace(",", ".").split(":").map(Number); return p.reduce((a, v) => a * 60 + v, 0); };
function ytParsePaste(txt) {
  const lines = String(txt).replace(/\r/g, "").split("\n"), cues = [];
  const arrow = /^(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*((\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/;
  for (let k = 0; k < lines.length; k++) {
    const L = lines[k].trim(); if (!L) continue;
    let m = L.match(arrow); if (m) { const [a, b] = L.split("-->").map(x => tsec(x.trim().split(/\s/)[0])); const txt2 = []; while (k + 1 < lines.length && lines[k + 1].trim() && !arrow.test(lines[k + 1].trim())) txt2.push(lines[++k].trim()); cues.push({ s: a, e: b, t: ytClean(txt2.join(" ").replace(/<[^>]+>/g, "")) }); continue; }
    m = L.match(/^(\d{1,2}(?::\d{2}){1,2})(?:\s+(.*))?$/); if (m) { let t = m[2] || ""; while (!t && k + 1 < lines.length && /seconds?|minutes?|giây|phút/.test(lines[k + 1])) k++; if (!t) { const nx = []; while (k + 1 < lines.length && lines[k + 1].trim() && !/^\d{1,2}(:\d{2}){1,2}(\s|$)/.test(lines[k + 1].trim())) nx.push(lines[++k].trim()); t = nx.join(" "); } cues.push({ s: tsec(m[1]), t: ytClean(t) }); }
  }
  cues.forEach((c, i) => { if (c.e == null) c.e = cues[i + 1] ? cues[i + 1].s : c.s + 4; });
  return cues.filter(c => c.t);
}
/* Phụ đề → danh sách từ có mốc. Phụ đề tự động (asr) có mốc từng từ; phụ đề người gõ chỉ có mốc từng dòng nên chia đều trong dòng */
/* Một từ nói ra kéo dài cỡ bao lâu: mốc kết thúc của phụ đề tự động là lúc từ sau bắt đầu, có thể gồm cả khoảng lặng */
const ytDur = w => 0.3 + 0.08 * String(w).replace(/[^a-z0-9]/gi, "").length;
function ytWords(cues) {
  const words = [];
  for (const c of cues) { if (c.w?.length) { c.w.forEach(([w, t], k) => words.push({ w, t, e: Math.min(c.w[k + 1] ? c.w[k + 1][1] : c.e, t + ytDur(w)) })); continue; }
    const ws = c.t.split(/\s+/).filter(Boolean), len = ws.reduce((a, w) => a + w.length + 1, 0); let acc = 0;
    ws.forEach(w => { const t = c.s + (c.e - c.s) * acc / len; acc += w.length + 1; words.push({ w, t, e: c.s + (c.e - c.s) * acc / len }); }); }
  return words;
}
/* Có cả phụ đề người gõ (chữ chuẩn, có dấu câu) và phụ đề tự động (mốc từng từ chính xác): lấy chữ của bản người gõ, mốc của bản tự động */
function ytAlignWords(words, aw) {
  const nz = w => String(w).toLowerCase().replace(/[^a-z0-9]/g, ""), A = aw.map(([w, t, e]) => ({ n: nz(w), t, e: Math.min(e, t + ytDur(w)) })); let j = 0; const hit = [];
  words.forEach((m, i) => { const k = nz(m.w); if (!k) return; for (let q = j; q < Math.min(A.length, j + 12); q++) if (A[q].n === k && Math.abs(A[q].t - m.t) < 8) { m.t = A[q].t; m.e = A[q].e; hit.push(i); j = q + 1; return; } });
  if (hit.length < 3) return words;
  const H = new Set(hit);
  for (let q = 0; q < words.length; q++) { if (H.has(q)) continue; let a = q - 1; while (a >= 0 && !H.has(a)) a--; let b = q + 1; while (b < words.length && !H.has(b)) b++;
    if (a >= 0 && b < words.length) { const f = (q - a) / (b - a); words[q].t = words[a].e + (words[b].t - words[a].e) * f; words[q].e = Math.min(words[b].t, words[q].t + 0.5); } }
  return words;
}
function ytSplit(words) {
  const punct = words.filter(x => /[.!?]["”]?$/.test(x.w)).length >= Math.max(2, words.length / 40), out = []; let cur = [];
  for (let k = 0; k < words.length; k++) {
    cur.push(words[k]); const nx = words[k + 1], gap = nx ? nx.t - words[k].e : 9;
    const end = punct ? (/[.!?]["”]?$/.test(words[k].w) && cur.length >= 3) || cur.length >= 28 : (gap > 0.55 && cur.length >= 4) || cur.length >= 14;
    if (end || !nx) { const last = cur[cur.length - 1]; out.push({ x: cur.map(z => z.w).join(" "), s: Math.max(0, cur[0].t - 0.12), e: nx ? Math.max(last.e, Math.min(last.e + 0.25, nx.t - 0.02)) : last.e + 0.3 }); cur = []; }
  }
  return out.filter(z => /[a-z]/i.test(z.x));
}
function ytSentences(cues) { return ytSplit(ytWords(cues)); }
function ytSentencesBest(r) { const w = ytWords(r.cues); return ytSplit(!r.asr && r.aw?.length ? ytAlignWords(w, r.aw) : w); }
function ytHow(r) { return r.asr ? "Phụ đề tự động của YouTube (mốc từng từ)" : r.aw?.length ? "Phụ đề của video, mốc căn theo từng từ" : "Phụ đề của video (mốc theo dòng, có thể lệch nhẹ: chỉnh bằng nút sớm/muộn)"; }
function shadowYt(S) {
  const Y = S.yt ||= { url: "", id: null, sents: null, how: "", err: "", busy: "", adj: {} };
  const urlIn = h("input", { type: "url", placeholder: "Dán link YouTube, ví dụ https://www.youtube.com/watch?v=…", value: Y.url, style: "flex:1;min-width:0", oninput: e => { Y.url = e.target.value; } });
  const load = async () => {
    const id = ytId(Y.url); if (!id) { Y.err = "Link YouTube chưa đúng."; render(); return; }
    Object.assign(Y, { id, sents: null, err: "", busy: "Đang mở video…", how: "", adj: {} }); S.i = 0; S.res = null; render();
    try { await ytOpen(id); } catch (e) { Y.err = e.message; Y.busy = ""; render(); return; }
    const cached = (() => { try { return JSON.parse(localStorage.getItem("yt2:" + id) || "null"); } catch { return null; } })();
    if (cached?.sents?.length) { Object.assign(Y, { sents: cached.sents, how: cached.how, adj: cached.adj || {}, busy: "" }); render(); return; }
    Y.busy = "Đang lấy phụ đề của video…"; render();
    try { const r = await window.__yt?.(id); if (r?.cues?.length) { ytSet(Y, ytSentencesBest(r), ytHow(r)); return; } } catch (e) { console.warn("yt captions", e); }
    Y.busy = ""; Y.need = true; render();
  };
  const ytSet = (Y, sents, how) => { if (!sents.length) { Y.err = "Không tách được câu nào."; Y.busy = ""; render(); return; } Object.assign(Y, { sents, how, busy: "", need: false, err: "" }); try { localStorage.setItem("yt2:" + Y.id, JSON.stringify({ sents, how, adj: Y.adj })); } catch {} render(); };
  const pasteBox = h("textarea", { rows: "6", placeholder: "Dán bản chép lời có mốc thời gian (phụ đề .vtt/.srt, hoặc chép từ ô \"Hiện bản chép lời\" của YouTube)…" });
  const aiBtn = h("button", { class: "btn", type: "button", disabled: !sample || null, onclick: async () => {
    aiBtn.disabled = true; Y.busy = "Gemini đang xem video và chép lời (30–90 giây, tốn 1 lượt AI)…"; render();
    try { const r = await sample.json(`Transcribe the spoken English in this video verbatim (only the first 8 minutes). Split it into natural sentences of at most 25 words. For each sentence give the start and end time in seconds from the start of the video, as precisely as you can (one decimal). Return ONLY JSON: {"sents":[{"s":1.2,"e":4.8,"t":"..."}]}`, { video: "https://www.youtube.com/watch?v=" + Y.id, modelTier: "default" });
      const sents = (r?.sents || []).map(x => ({ x: ytClean(x.t), s: +x.s, e: +x.e })).filter(x => x.x && isFinite(x.s) && isFinite(x.e) && x.e > x.s);
      ytSet(Y, sents.map(x => ({ ...x, s: Math.max(0, x.s - 0.2), e: x.e + 0.3 })), "Gemini chép lời (mốc ước lượng, chỉnh tay nếu lệch)");
    } catch (e) { Y.busy = ""; Y.err = aiMsg(e) + (e?.message ? " " + e.message : ""); render(); } } }, "Nhờ Gemini chép lời (1 lượt AI)");
  const head = h("section", { class: "card stack", style: "gap:8px" }, h("div", { class: "row" }, urlIn, h("button", { class: "btn btn-primary", type: "button", onclick: load }, "Mở video")),
    Y.err ? h("p", { class: "note bad small", style: "margin:0" }, Y.err) : null, Y.busy ? h("p", { class: "small muted", style: "margin:0" }, Y.busy) : null,
    Y.id ? h("div", { class: "shw-yt-ph" }) : null,
    Y.need ? h("div", { class: "stack", style: "gap:8px" }, h("p", { class: "note warn small", style: "margin:0" }, "Chưa lấy được phụ đề tự động của video này. Chọn một cách:"),
      h("ol", { class: "gex small" }, h("li", null, "Trên máy tính: mở video trên YouTube → bấm “…Thêm” dưới video → “Hiện bản chép lời” → bôi đen toàn bộ, chép rồi dán vào ô dưới. Có tệp phụ đề .vtt/.srt thì dán nội dung tệp (mốc chính xác nhất)."), h("li", null, "Hoặc nhờ Gemini xem video và chép lời (mốc chỉ gần đúng, có thể chỉnh tay từng câu).")),
      pasteBox, h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => { const c = ytParsePaste(pasteBox.value); if (!c.length) { Y.err = "Không đọc được mốc thời gian trong đoạn đã dán."; render(); return; } ytSet(Y, ytSentences(c), /-->/.test(pasteBox.value) ? "Tệp phụ đề bạn dán" : "Bản chép lời bạn dán (mốc theo giây)"); } }, "Dùng bản này"), aiBtn)) : null);
  if (!Y.sents) return h("div", { class: "stack", style: "gap:12px" }, head);
  const n = Y.sents.length, i = Math.min(S.i, n - 1), sn = Y.sents[i], ad = Y.adj[i] || [0, 0], s0 = sn.s + ad[0], e0 = sn.e + ad[1];
  S.key = "yt:" + Y.id;
  const best = (P.shadow || {})[S.key]?.best || {};
  const nudge = (k, d) => { const a = Y.adj[i] ||= [0, 0]; a[k] = +(a[k] + d).toFixed(2); try { localStorage.setItem("yt2:" + Y.id, JSON.stringify({ sents: Y.sents, how: Y.how, adj: Y.adj })); } catch {} render(); ytPlaySeg(sn.s + a[0], sn.e + a[1]); };
  const extra = h("span", { class: "row small", style: "gap:4px" }, h("span", { class: "muted" }, "Chỉnh mốc:"), h("button", { class: "btn btn-quiet small", type: "button", title: "Bắt đầu sớm hơn", onclick: () => nudge(0, -0.2) }, "⇤ sớm"), h("button", { class: "btn btn-quiet small", type: "button", onclick: () => nudge(0, 0.2) }, "muộn ⇥"), h("span", { class: "muted" }, "|"), h("button", { class: "btn btn-quiet small", type: "button", onclick: () => nudge(1, -0.2) }, "cắt sớm"), h("button", { class: "btn btn-quiet small", type: "button", onclick: () => nudge(1, 0.2) }, "kéo dài"));
  return h("div", { class: "stack", style: "gap:12px" }, head,
    h("span", { class: "small muted" }, `${Y.how} · ${n} câu`),
    shadowCard({ text: sn.x, n, i, playModel: async rate => ytPlaySeg(s0, e0, rate), modelInfo: { dur: e0 - s0 }, extra, best: best[i],
      go: d => { S.i = Math.max(0, Math.min(n - 1, i + d)); S.res = null; try { SHW.player?.pauseVideo(); } catch {} render(); },
      onScore: async blob => { const r = await shadowScore(sn.x, blob, null, Math.max(0.5, e0 - s0 - 0.35)); shadowSave(S.key, i, r.total); return r; } }));
}
