/* ===== Listening cho bản web ngoài: kho bài thu sẵn (Kokoro), giọng Gemini tùy chọn, bài AI tạo mới, nghe chép ===== */
const LS_SENT = t => t.trim().split(/(?<=[.!?])\s+(?=[A-Z"“])/).filter(Boolean);
const LS_MINE = []; let lsMineLoaded = false;
async function loadListens() { if (lsMineLoaded) return; lsMineLoaded = true; try { const l = await store.list("listens"); LS_MINE.splice(0, LS_MINE.length, ...l.map(x => ({ ...x, mine: true })).sort((a, b) => (b.created || 0) - (a.created || 0))); render(); } catch (e) { console.warn(e); } }
const LS_POOL = []; let lsPoolLoaded = false;
async function loadPool() { if (lsPoolLoaded || !window.__lsPool) return; lsPoolLoaded = true; try { const l = await window.__lsPool(); LS_POOL.splice(0, LS_POOL.length, ...l.map(x => ({ ...x, shared: true })).sort((a, b) => (b.created || 0) - (a.created || 0))); if (l.length) render(); } catch (e) { console.warn(e); } }
const lsAll = () => [...LS_BANK, ...LS_POOL, ...LS_MINE];
const lsById = id => lsAll().find(s => s.id === id);
const LS_META = { p: null }; function lsMeta() { return LS_META.p ||= fetch("voice/ls/index.json").then(r => r.ok ? r.json() : {}).catch(() => ({})); }
const lsNorm = s => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/[£$€,]/g, "").replace(/\s+/g, " ").replace(/^(the|a|an) /, "").replace(/[.!?;]+$/, "").trim();
function lsCheck(g, it, v) { if (g.type === "gap") { const x = lsNorm(v); return !!x && it.a.some(a => lsNorm(a) === x); } return String(v || "").toUpperCase() === it.a; }
const lsQs = s => s.qs.flatMap(g => g.items.map(it => ({ g, it })));
/* Thống kê đúng/sai theo dạng câu (điền từ, trắc nghiệm, nối) cho phần phân tích cá nhân */
function lsQtStat(qs, ans) { P.lsQt ||= {}; for (const { g, it } of qs) { const s = P.lsQt[g.type] ||= [0, 0]; s[0]++; if (lsCheck(g, it, ans[it.n])) s[1]++; } }
function lsBand(raw) { const t = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]]; for (const [n, b] of t) if (raw >= n) return b; return raw > 0 ? 2 : 0; }

/* ----- Giọng Gemini cho từng người nói ----- */
const GV = { female: ["Aoede", "Kore", "Leda", "Sulafat", "Autonoe", "Despina"], male: ["Charon", "Puck", "Achird", "Iapetus", "Sadaltager", "Algieba"] };
function lsGemSpeakers(s) {
  const out = {}; Object.entries(s.sp).forEach(([k, v], i) => { const list = GV[v.g === "female" ? "female" : "male"]; const pick = /lectur|professor|biolog|manager|officer|agent/i.test(v.name + v.mood) ? list[0] : list[(i + s.id.length) % list.length];
    out[k] = { voice: pick, desc: `${v.name}, a ${v.g} speaker with a ${v.acc} accent; tone: ${v.mood}.` }; });
  return out;
}
async function lsGemAudio(s, generate) {
  if (!window.__tts) throw { code: "unavailable" };
  return window.__tts({ key: s.id + "-g2", cacheOnly: !generate, speakers: lsGemSpeakers(s), turns: s.turns.map(([sp, text]) => ({ sp, text })) });
}
/* ----- Kokoro chạy trong trình duyệt (cho bài AI tạo khi hết lượt giọng Gemini) ----- */
const KK = { p: null };
function kokoroLoad() { return KK.p ||= (async () => { const { KokoroTTS } = await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm"); return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm" }); })().catch(e => { KK.p = null; throw e; }); }
async function kokoroRender(s, say) {
  say?.("Đang tải bộ đọc trên máy (khoảng 90 MB, chỉ lần đầu)…"); const tts = await kokoroLoad();
  const sents = s.turns.flatMap(([sp, t], ti) => LS_SENT(t).map(x => ({ sp, ti, x }))), parts = [], segs = []; let pos = 0, rate = 24000, prev = null;
  for (let i = 0; i < sents.length; i++) {
    say?.(`Đang thu âm câu ${i + 1}/${sents.length}…`);
    const v = s.sp[sents[i].sp].v || "af_heart", a = await tts.generate(sents[i].x, { voice: v }); rate = a.sampling_rate;
    const gap = prev == null ? 0.25 : prev !== sents[i].ti ? 0.5 : 0.18; parts.push(new Float32Array(Math.round(rate * gap))); pos += gap;
    segs.push([sents[i].ti, +pos.toFixed(2), +(pos + a.audio.length / rate).toFixed(2)]); parts.push(a.audio); pos += a.audio.length / rate; prev = sents[i].ti;
  }
  const n = parts.reduce((x, p) => x + p.length, 0), pcm = new Float32Array(n); let o = 0; for (const p of parts) { pcm.set(p, o); o += p.length; }
  return { blob: lsWav(pcm, rate), segs };
}
function lsWav(f32, rate) { const b = new ArrayBuffer(44 + f32.length * 2), v = new DataView(b), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + f32.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, f32.length * 2, true);
  for (let i = 0; i < f32.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f32[i])) * 32767, true); return new Blob([b], { type: "audio/wav" }); }

/* ----- Trình phát ----- */
const LSA = { el: null, url: null, src: {} };
function lsPlayer(s, exam) {
  const A = UI.lsA ||= {}; const src = A.src === "gem" && A.gemUrl ? A.gemUrl : A.kUrl;
  if (!src) {
    if ((s.mine || s.shared) && A.gemState === "none") { const msg = h("span", { class: "small muted" }); const b = h("button", { class: "btn", type: "button", onclick: async () => { b.disabled = true; try { const k = await kokoroRender(s, t => msg.textContent = t); UI.lsKk = { id: s.id, url: URL.createObjectURL(k.blob), segs: k.segs }; Object.assign(A, { kUrl: UI.lsKk.url, segs: k.segs, src: "k" }); render(); } catch (e) { msg.textContent = "Lỗi: " + (e?.message || e); b.disabled = false; } } }, "Đọc bài bằng Kokoro trên máy");
      return h("div", { class: "row" }, b, msg); }
    return h("p", { class: "small muted" }, "Đang chuẩn bị âm thanh…");
  }
  const audio = LSA.el && LSA.el.dataset.src === src ? LSA.el : (() => { try { LSA.el?.pause(); } catch {} const a = new Audio(src); a.dataset.src = src; a.preload = "auto"; LSA.el = a; return a; })();
  const bar = h("input", { type: "range", min: "0", max: "1000", value: "0", class: "ls-seek", disabled: exam || null, oninput: e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; } });
  const time = h("span", { class: "small muted ls-time" }, "0:00");
  const play = h("button", { class: "btn btn-primary", type: "button", onclick: () => { if (exam && A.played && audio.ended) return; if (audio.paused) { audio.play(); A.played = true; } else if (!exam) audio.pause(); } }, audio.paused ? "▶ Nghe" : "❚❚ Dừng");
  const upd = () => { if (!document.body.contains(bar)) return; const d = audio.duration || 0; bar.value = d ? Math.round(audio.currentTime / d * 1000) : 0; time.textContent = `${mmss(Math.floor(audio.currentTime))} / ${mmss(Math.floor(d))}`; play.textContent = audio.paused ? (exam && A.played ? (audio.ended ? "Đã nghe xong" : "▶ Nghe tiếp") : "▶ Nghe") : (exam ? "Đang phát…" : "❚❚ Dừng"); play.disabled = exam && A.played && audio.ended; A.cur = audio.currentTime; };
  audio.ontimeupdate = upd; audio.onplay = upd; audio.onpause = upd; audio.onended = upd; audio.onloadedmetadata = upd; setTimeout(upd, 0);
  const ctrls = exam ? [] : [h("button", { class: "btn btn-quiet", type: "button", onclick: () => { audio.currentTime = Math.max(0, audio.currentTime - 5); } }, "↺ 5s"),
    h("select", { class: "ls-rate", "aria-label": "Tốc độ", onchange: e => { audio.playbackRate = +e.target.value; } }, ["0.75", "0.9", "1", "1.15"].map(r => h("option", { value: r, selected: String(audio.playbackRate) === r || (r === "1" && audio.playbackRate === 1) || null }, r + "×")))];
  return h("div", { class: "ls-player" }, play, ...ctrls, bar, time);
}
async function lsPrepare(s) {
  const A = UI.lsA ||= {}; if (A.id === s.id) return; try { LSA.el?.pause(); } catch {}
  Object.assign(A, { id: s.id, kUrl: null, gemUrl: null, src: "k", played: false, segs: null, gemState: "" });
  if (s.mine || s.shared) { try { const b = await lsGemAudio(s, false); A.gemUrl = URL.createObjectURL(b); A.src = "gem"; A.gemState = "ok"; } catch { A.gemState = "none"; } }
  else { const m = (await lsMeta())[s.id]; if (m) { A.kUrl = "voice/ls/" + s.id + ".mp3"; A.segs = m.segs; } A.gemState = "loading"; lsGemAudio(s, false).then(b => { if (A.id !== s.id) return; A.gemUrl = URL.createObjectURL(b); A.gemState = "ok"; if (!A.played) { A.src = "gem"; try { LSA.el?.pause(); } catch {} } render(); }, () => { A.gemState = "none"; render(); }); }
  render();
}
function lsVoicePick(s) {
  const A = UI.lsA || {}, out = h("span", { class: "small muted" });
  const gemBtn = h("button", { type: "button", class: "opt", "aria-pressed": String(A.src === "gem"), onclick: async () => {
    if (A.gemUrl) { A.src = "gem"; try { LSA.el?.pause(); } catch {} render(); return; }
    if (!confirm("Tạo giọng Gemini cho bài này sẽ dùng 1 lượt giọng đọc (mỗi ngày có khoảng 30 lượt cho cả nhóm). Nếu nơi lưu chung đã bật, các bạn khác nghe lại không tốn lượt. Tiếp tục?")) return;
    gemBtn.disabled = true; out.textContent = "Gemini đang đọc bài, thường mất 20–60 giây…";
    try { const b = await lsGemAudio(s, true); A.gemUrl = URL.createObjectURL(b); A.src = "gem"; A.gemState = "ok"; try { LSA.el?.pause(); } catch {} render(); }
    catch (e) { out.textContent = (e?.code === "rate_limited" ? "Gemini chưa đọc được bài này. " : aiMsg(e) + " ") + "Chi tiết: " + (e?.message || e?.code || "không rõ"); gemBtn.disabled = false; } } }, A.gemState === "ok" ? "Giọng Gemini (tự nhiên hơn)" : "✨ Tạo giọng Gemini");
  return h("div", { class: "row", style: "gap:6px;align-items:center" }, h("span", { class: "small muted" }, "Giọng:"),
    A.gemState === "ok" ? h("span", { class: "chip good" }, "Giọng Gemini") : A.gemState === "loading" ? h("span", { class: "small muted" }, "đang tìm giọng Gemini…") : h("span", { class: "chip" }, "Giọng dự phòng (máy đọc)"),
    A.gemState === "none" && Object.keys(s.sp).length <= 2 ? gemBtn : null,
    A.gemState === "none" ? h("span", { class: "small muted" }, "Bài này sẽ được tự đổi sang giọng Gemini trong đêm.") : null, out);
}
/* ----- Câu hỏi ----- */
function lsQuestions(s, st, done) {
  const ans = st.ans ||= {};
  return h("div", { class: "stack", style: "gap:14px" }, s.qs.map(g => {
    const head = h("div", { class: "stack", style: "gap:4px" }, h("b", null, g.items.length > 1 ? `Questions ${g.items[0].n}–${g.items[g.items.length - 1].n}` : `Question ${g.items[0].n}`), h("span", { class: "small", style: "font-style:italic" }, g.ins), g.title ? h("b", { class: "ls-gtitle" }, g.title) : null);
    const mark = it => done ? h("span", { class: "ls-mark " + (lsCheck(g, it, ans[it.n]) ? "ok" : "no") }, lsCheck(g, it, ans[it.n]) ? "✓" : "✗ " + (g.type === "gap" ? it.a[0] : it.a)) : null;
    let body;
    if (g.type === "gap") body = h("ol", { class: "ls-gaps", start: String(g.items[0].n) }, g.items.map(it => h("li", { value: String(it.n) }, it.pre + " ", h("input", { class: "ls-in", type: "text", autocomplete: "off", spellcheck: "false", value: ans[it.n] || "", disabled: done || null, oninput: e => { ans[it.n] = e.target.value; }, "aria-label": "Câu " + it.n }), it.post ? " " + it.post : "", " ", mark(it))));
    else if (g.type === "mcq") body = h("div", { class: "stack", style: "gap:10px" }, g.items.map(it => h("div", { class: "stack", style: "gap:4px" }, h("span", null, h("b", null, it.n + " "), it.q),
      h("div", { class: "stack", style: "gap:2px" }, it.opts.map((o, k) => { const L = "ABC"[k]; return h("label", { class: "ls-opt" + (done && L === it.a ? " right" : done && ans[it.n] === L ? " wrong" : "") }, h("input", { type: "radio", name: s.id + "-" + it.n, checked: ans[it.n] === L || null, disabled: done || null, onchange: () => { ans[it.n] = L; } }), ` ${L}  ${o}`); })), mark(it))));
    else body = h("div", { class: "stack", style: "gap:8px" }, g.opts.every(o => /^[A-Z]$/.test(o)) ? null : h("ul", { class: "ls-optlist" }, g.opts.map((o, k) => h("li", null, h("b", null, String.fromCharCode(65 + k)), " " + o))),
      g.items.map(it => h("div", { class: "row", style: "gap:8px;align-items:center" }, h("b", null, it.n), h("span", { style: "min-width:140px" }, it.q), h("select", { disabled: done || null, onchange: e => { ans[it.n] = e.target.value; } }, h("option", { value: "" }, "—"), g.opts.map((_, k) => { const L = String.fromCharCode(65 + k); return h("option", { value: L, selected: ans[it.n] === L || null }, L); })), mark(it))));
    return h("div", { class: "stack ls-group", style: "gap:8px" }, head, body);
  }));
}
function lsTranscript(s) {
  const A = UI.lsA || {}, src = A.id === s.id ? lsSrcInfo(s) : null, st = src ? lsSegs(s, src) : {}, answers = lsQs(s).filter(x => x.g.type === "gap").flatMap(x => x.it.a).filter(a => a.length > 1);
  const mark = t => { let html = esc(t); for (const a of answers) html = html.replace(new RegExp("\\b(" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "i"), "<mark>$1</mark>"); return html; };
  let gi = 0;
  return h("div", { class: "stack ls-tr", style: "gap:6px", "data-lsseg": "1" }, s.turns.map(([sp, t]) => h("p", { style: "margin:0" }, Object.keys(s.sp).length > 1 ? h("b", null, s.sp[sp].name + ": ") : null,
    ...LS_SENT(t).map(x => { const seg = st.segs?.[gi++]; return h("span", { class: "ls-sent" + (seg ? " click" : ""), title: seg ? "Bấm để nghe câu này" : null, html: mark(x) + " ", onclick: seg ? () => { try { LSA.el?.pause(); } catch {} lsPlaySent(src, seg, 1); } : null }); }))));
}
/* ----- Trang ----- */
const lsSt = id => (P.ls ||= {})[id] ||= {};
function pageListen() {
  loadListens(); loadPool();
  if (UI.lsTabSeen !== subEff("lsTab")) { UI.lsTabSeen = subEff("lsTab"); try { gmStopAll(); } catch {} if (/^g-/.test(subEff("lsTab") || "")) try { gemWarm("gm"); } catch {} }
  const done = LS_BANK.filter(s => lsSt(s.id).score != null).length;
  const T = subMenu("lsTab", [["path", "Lộ trình", null, () => [lpTab()]], ["deep", "Luyện sâu 5 bước", "mới", () => [typeof lsDeepTab === "function" ? lsDeepTab() : null]], ["sec", "Luyện theo phần", LS_BANK.length, () => [lsSecTab()]], ["test", "Đề đầy đủ", null, () => [lsTestTab()]], ["nd", "Số & đánh vần", null, () => [lsNdTab()]], ["dict", "Nghe chép", null, () => [lsDictTab()]], ["ai", "Bài mới (AI)", null, () => [lsAiTab()]], ...(typeof LS_GAMES !== "undefined" ? LS_GAMES : [])]);
  return h("div", { class: "stack", style: "gap:18px" },
    pageHead("Listening", "Luyện nghe IELTS", `${LS_BANK.length} phần thu sẵn (${new Set(LS_BANK.map(s => s.test)).size} đề đầy đủ, nhiều giọng Anh và Mỹ), chấm ngay không tốn lượt AI. Có thể đổi sang giọng Gemini tự nhiên hơn, nghe chép từng câu, hoặc nhờ AI soạn bài nghe mới. Đã làm ${done}/${LS_BANK.length} phần.`, T.menu), ...T.body);
}
function lsCard(s, href) {
  const st = (P.ls || {})[s.id] || {};
  return h("a", { class: "card lesson-card", href }, h("span", { class: "num" }, s.sec), h("div", { class: "stack", style: "gap:4px" }, h("h3", null, s.title), h("span", { class: "small muted" }, s.ctx),
    h("div", { class: "row" }, st.score != null ? h("span", { class: "chip " + (st.score >= 8 ? "good" : st.score >= 6 ? "warn" : "bad") }, `Tốt nhất ${st.score}/10`) : h("span", { class: "chip" }, "Chưa làm"), s.mine || s.shared ? h("span", { class: "chip acc" }, s.shared ? "Kho chung" : "AI soạn") : null)));
}
function lsSecTab() {
  return h("div", { class: "stack", style: "gap:16px" }, [1, 2, 3, 4].map(n => h("section", { class: "stack", style: "gap:10px" },
    h("div", { class: "stack", style: "gap:2px" }, h("h2", null, "Section " + n), h("span", { class: "small muted" }, ["Hội thoại đời thường (điền form, ghi chú)", "Độc thoại đời thường (thông báo, giới thiệu)", "Hội thoại học thuật (sinh viên, giảng viên)", "Bài giảng học thuật"][n - 1])),
    h("div", { class: "grid3" }, lsAll().filter(s => s.sec === n).map(s => lsCard(s, "#ls-" + s.id))))));
}
function pageLsSection(s) {
  lsPrepare(s);
  const st = lsSt(s.id), W = UI.lsW && UI.lsW.id === s.id ? UI.lsW : (UI.lsW = { id: s.id, exam: false, done: false, ans: {} });
  const qs = lsQs(s), score = W.done ? qs.filter(({ g, it }) => lsCheck(g, it, W.ans[it.n])).length : null;
  const submit = () => { W.done = true; const sc = qs.filter(({ g, it }) => lsCheck(g, it, W.ans[it.n])).length; st.score = Math.max(st.score ?? 0, sc); st.last = sc; st.n = (st.n || 0) + 1; st.date = today(); lsQtStat(qs, W.ans); award("listening", 15); addAct("listening", 8); saveProfile(); render(); window.scrollTo(0, 0); };
  return h("div", { class: "stack", style: "gap:16px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("a", { class: "btn btn-quiet", href: "#listen" }, "‹ Listening"), h("span", { class: "small muted" }, s.shared ? "Kho chung" : s.mine ? "Bài AI soạn" : `Đề ${s.test} · Section ${s.sec}`)),
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Section " + s.sec), h("h1", null, s.title), h("p", { class: "muted", style: "margin:0" }, s.ctx)),
    h("section", { class: "card stack", style: "gap:10px" },
      h("div", { class: "row", style: "gap:6px" }, h("button", { type: "button", class: "opt", "aria-pressed": String(!W.exam), disabled: W.done || null, onclick: () => { W.exam = false; render(); } }, "Luyện tập (dừng, tua, chỉnh tốc độ)"), h("button", { type: "button", class: "opt", "aria-pressed": String(W.exam), disabled: W.done || null, onclick: () => { W.exam = true; (UI.lsA || {}).played = false; render(); } }, "Như thi thật (nghe 1 lần)")),
      lsVoicePick(s), lsPlayer(s, W.exam && !W.done),
      W.done ? h("div", { class: "row", style: "gap:12px;align-items:center" }, h("span", { class: "band-big" }, `${score}/10`), h("span", { class: "muted" }, score >= 9 ? "Xuất sắc!" : score >= 7 ? "Tốt, xem lại các câu sai bên dưới." : "Mở lời thoại để tìm chỗ chứa đáp án."), h("button", { class: "btn", type: "button", onclick: () => { UI.lsW = null; if (UI.lsA) UI.lsA.played = false; render(); } }, "Làm lại")) : null),
    h("section", { class: "card stack", style: "gap:12px" }, h("h2", null, "Câu hỏi"), lsQuestions(s, W, W.done), W.done ? null : h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: submit }, "Nộp bài và chấm"))),
    W.done ? h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Lời thoại"), h("p", { class: "small muted", style: "margin:0" }, "Chữ được tô là đáp án. Bấm vào một câu để nghe lại đúng câu đó."), lsTranscript(s)) : null);
}
/* ----- Lộ trình kỹ năng ----- */
const lpDone = l => !!(P.lp || {})[l.id]?.done;
const lpOpen = l => { const i = LP_PATH.indexOf(l); return i <= 0 || lpDone(LP_PATH[i - 1]) || lpDone(l); };
function lpTab() {
  const dn = LP_PATH.filter(lpDone).length, nx = LP_PATH.find(l => !lpDone(l));
  return h("div", { class: "stack", style: "gap:12px" },
    h("div", { class: "row" }, h("div", { class: "meter", style: "flex:1;max-width:320px" }, h("i", { style: `width:${dn / LP_PATH.length * 100}%` })), h("span", { class: "small muted" }, `${dn}/${LP_PATH.length} bài`), nx ? h("a", { class: "btn btn-primary", href: "#lp-" + nx.id }, dn ? "Học tiếp" : "Bắt đầu") : null),
    h("p", { class: "small muted", style: "margin:0" }, `Mỗi bài: hiểu bản chất kỹ năng → mẹo và bẫy → nghe và làm bài ngắn, máy chấm ngay. Đúng từ ${Math.round(LP_PASS * 100)}% là mở bài sau.`),
    h("div", { class: "grid3" }, LP_PATH.map((l, i) => { const open = lpOpen(l), st = (P.lp || {})[l.id];
      const inner = [h("span", { class: "num" }, open ? i + 1 : "🔒"), h("div", { class: "stack", style: "gap:4px" }, h("h3", null, l.t), h("div", { class: "row" }, st?.done ? h("span", { class: "chip good" }, "Đã đạt") : open ? h("span", { class: "chip" }, st?.best != null ? `Tốt nhất ${st.best}` : "Chưa học") : h("span", { class: "chip" }, "Khóa")))];
      return open ? h("a", { class: "card lesson-card", href: "#lp-" + l.id }, inner) : h("div", { class: "card lesson-card sp-locked" }, inner); })));
}
function pageLp(l) {
  const i = LP_PATH.indexOf(l), nx = LP_PATH[i + 1];
  if (!lpOpen(l)) return h("div", { class: "stack", style: "gap:12px" }, h("a", { class: "btn btn-quiet", href: "#listen" }, "‹ Listening"), h("p", { class: "note warn" }, "Bài này chưa mở. Làm đạt bài trước để mở khóa."));
  const s = { ...l.pr, title: l.t, sec: 0 }; lsPrepare(s);
  const st = (P.lp ||= {})[l.id] ||= {}, W = UI.lpW && UI.lpW.id === l.id ? UI.lpW : (UI.lpW = { id: l.id, done: false, ans: {} });
  const qs = lsQs(s), total = qs.length, score = W.done ? qs.filter(({ g, it }) => lsCheck(g, it, W.ans[it.n])).length : null;
  const submit = () => { W.done = true; const sc = qs.filter(({ g, it }) => lsCheck(g, it, W.ans[it.n])).length; st.best = Math.max(st.best ?? 0, sc); lsQtStat(qs, W.ans); if (sc / total >= LP_PASS && !st.done) { st.done = today(); award("listening", 25); toast("Đạt bài! Bài tiếp theo đã mở."); } addAct("listening", 5); saveProfile(); render(); };
  return h("div", { class: "stack", style: "gap:16px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("a", { class: "btn btn-quiet", href: "#listen" }, "‹ Listening"), h("span", { class: "small muted" }, `Bài ${i + 1}/${LP_PATH.length}`)),
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Lộ trình Listening"), h("h1", null, l.t), st.done ? h("p", { class: "note", style: "margin:0" }, "Đã đạt bài này. ", nx ? h("a", { href: "#lp-" + nx.id }, "Bài tiếp: " + nx.t + " ›") : "Bạn đã xong lộ trình, sang Đề đầy đủ để thi thử nhé!") : null),
    h("section", { class: "card stack", style: "gap:10px" }, secH(1, "Bản chất"), h("p", { style: "margin:0", html: spMd(l.idea) }),
      h("div", { class: "stack", style: "gap:4px" }, h("span", { class: "eyebrow" }, "Mẹo"), h("ul", { class: "gex" }, l.tips.map(t => h("li", null, t)))),
      h("div", { class: "gnote gwarn stack", style: "gap:4px" }, h("b", null, "Bẫy hay gặp"), h("ul", { class: "gex", style: "margin:0" }, l.traps.map(t => h("li", null, t))))),
    h("section", { class: "card stack", style: "gap:12px" }, secH(2, "Nghe và làm bài", `Cần đúng ${Math.ceil(total * LP_PASS)}/${total}`),
      l.map ? h("div", { class: "lp-map", html: l.map }) : null,
      lsVoicePick(s), lsPlayer(s, false),
      lsQuestions(s, W, W.done),
      W.done ? h("div", { class: "row", style: "gap:12px;align-items:center" }, h("span", { class: "band-big" }, `${score}/${total}`), h("span", { class: "muted" }, score / total >= LP_PASS ? "Đạt!" : "Chưa đạt, xem lời thoại rồi làm lại."), h("button", { class: "btn", type: "button", onclick: () => { UI.lpW = null; render(); } }, "Làm lại"), nx && st.done ? h("a", { class: "btn btn-primary", href: "#lp-" + nx.id }, "Bài tiếp ›") : null)
        : h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: submit }, "Nộp và chấm"))),
    W.done ? h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Lời thoại"), lsTranscript(s)) : null);
}
/* ----- Đề đầy đủ: 4 phần liền nhau, 40 câu, quy ra band ----- */
function lsTestTab() {
  const tests = [...new Set(LS_BANK.map(s => s.test))];
  return h("div", { class: "stack", style: "gap:12px" }, h("p", { class: "small muted", style: "margin:0" }, "Làm lần lượt 4 phần như thi thật (mỗi phần nghe 1 lần), chấm 40 câu và quy ra band theo bảng điểm Listening Academic."),
    h("div", { class: "grid3" }, tests.map(t => { const r = (P.lsTests || {})[t]; return h("a", { class: "card lesson-card", href: "#lt-" + t }, h("span", { class: "num" }, t), h("div", { class: "stack", style: "gap:4px" }, h("h3", null, "Đề Listening " + t), h("span", { class: "small muted" }, LS_BANK.filter(s => s.test === t).map(s => s.title).join(" · ")), h("div", { class: "row" }, r ? h("span", { class: "chip good" }, `Band ${r.band} (${r.raw}/40)`) : h("span", { class: "chip" }, "Chưa làm")))); })));
}
function pageLsTest(t) {
  const secs = LS_BANK.filter(s => s.test === t).sort((a, b) => a.sec - b.sec);
  const T = UI.lsT && UI.lsT.t === t ? UI.lsT : (UI.lsT = { t, i: 0, ans: {}, done: false });
  const s = secs[T.i]; lsPrepare(s);
  const raw = T.done ? secs.reduce((a, x) => a + lsQs(x).filter(({ g, it }) => lsCheck(g, it, T.ans[it.n])).length, 0) : null;
  const W = { ans: T.ans };
  const finish = () => { if (!confirm("Nộp cả đề để chấm?")) return; T.done = true; const r = secs.reduce((a, x) => a + lsQs(x).filter(({ g, it }) => lsCheck(g, it, T.ans[it.n])).length, 0); (P.lsTests ||= {})[t] = { raw: r, band: lsBand(r), date: today() };
    for (const x of secs) { const sc = lsQs(x).filter(({ g, it }) => lsCheck(g, it, T.ans[it.n])).length; const st = lsSt(x.id); st.score = Math.max(st.score ?? 0, sc); st.date = today(); lsQtStat(lsQs(x), T.ans); } award("listening", 60); addAct("listening", 30); saveProfile(); render(); window.scrollTo(0, 0); };
  return h("div", { class: "stack", style: "gap:16px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("a", { class: "btn btn-quiet", href: "#listen" }, "‹ Listening"), h("span", { class: "small muted" }, `Đề ${t} · Section ${s.sec}/4`)),
    T.done ? h("section", { class: "card stack", style: "gap:8px" }, h("span", { class: "eyebrow" }, "Kết quả"), h("div", { class: "row", style: "gap:18px;align-items:flex-end" }, h("span", { class: "band-big" }, lsBand(raw).toFixed(1)), h("span", { class: "muted" }, `${raw}/40 câu đúng`)), h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { UI.lsT = null; render(); } }, "Làm lại đề này"))) : null,
    h("div", { class: "row", style: "gap:6px" }, secs.map((x, k) => h("button", { type: "button", class: "opt", "aria-pressed": String(k === T.i), onclick: () => { T.i = k; render(); window.scrollTo(0, 0); } }, "Section " + x.sec))),
    h("section", { class: "card stack", style: "gap:10px" }, h("h2", null, s.title), h("p", { class: "muted", style: "margin:0" }, s.ctx), lsVoicePick(s), lsPlayer(s, !T.done)),
    h("section", { class: "card stack", style: "gap:12px" }, lsQuestions(s, W, T.done),
      h("div", { class: "row" }, T.i < secs.length - 1 ? h("button", { class: "btn btn-primary", type: "button", onclick: () => { T.i++; render(); window.scrollTo(0, 0); } }, "Sang Section " + secs[T.i + 1].sec + " ›") : null, !T.done && T.i === secs.length - 1 ? h("button", { class: "btn btn-primary", type: "button", onclick: finish }, "Nộp cả đề") : null)),
    T.done ? h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Lời thoại"), lsTranscript(s)) : null);
}
/* ----- Nghe chép từng câu: phát đúng đoạn của câu (cắt mẫu âm thanh, không tua), ưu tiên giọng Gemini ----- */
function lsDictTab() {
  const D = UI.lsD ||= { id: LS_BANK[0].id, i: 0, typed: "", res: null, voice: "gem" };
  const s = lsById(D.id) || LS_BANK[0]; lsPrepare(s);
  const sents = alSents(s), n = sents.length, cur = sents[D.i % n], A = UI.lsA || {};
  const src = A.id === s.id ? lsSrcInfo(s, D.voice) : null, st = src ? lsSegs(s, src) : { state: "loading" }, seg = lsSegAt(s, src, st, D.i % n);
  const msg = h("span", { class: "small muted" });
  const playSeg = async rate => { if (!seg) return; try { await lsPlaySent(src, seg, rate); } catch (e) { msg.textContent = "Chưa phát được: " + (e?.message || e); } };
  const words = t => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
  const check = () => { const want = words(spSpellKeep(cur.x)), got = words(spSpellKeep(D.typed)); if (!got.length) return; const N = want.length, m = got.length, dp = Array.from({ length: N + 1 }, () => new Array(m + 1).fill(0));
    for (let i = N - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = want[i] === got[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const hit = new Set(); let i = 0, j = 0; while (i < N && j < m) { if (want[i] === got[j]) { hit.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    const disp = cur.x.split(/\s+/), map = []; let k = 0; for (const w of disp) { const c = words(spSpellKeep(w)).length; map.push([k, k + c]); k += c; }
    D.res = { want: disp, ok: map.map(([x, y]) => y > x && [...Array(y - x).keys()].every(q => hit.has(x + q))), pct: Math.round(hit.size / Math.max(1, N, m) * 100), extra: Math.max(0, m - hit.size) };
    if (typeof e4Listen === "function") e4Listen(cur.x, D.res.want.filter((w, q) => !D.res.ok[q]), s.id + ":" + (D.i % n), D.res.pct);
    const sd = lsSt("dict"); sd.n = (sd.n || 0) + 1; sd.w = (sd.w || 0) + N; sd.ok = (sd.ok || 0) + hit.size; award("listening", 2); addAct("listening", 1); saveProfile(); render(); };
  const ta = h("textarea", { rows: "2", placeholder: "Gõ lại đúng câu bạn nghe…", oninput: e => { D.typed = e.target.value; }, onkeydown: e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(); } } }); ta.value = D.typed;
  const resView = D.res ? h("p", { class: "ls-dict-res" }, D.res.want.map((w, k) => [h("span", { class: D.res.ok[k] || !/[a-z0-9]/i.test(w) ? "ok" : "no" }, w), " "])) : null;
  const go = d => { D.i = (D.i + d + n) % n; D.typed = ""; D.res = null; render(); setTimeout(() => { const s2 = lsSegAt(s, src, UI.lsSeg[src?.key], D.i); if (s2) lsPlaySent(src, s2, 1).catch(() => {}); }, 30); };
  const voiceBtns = A.id === s.id && A.gemUrl && A.kUrl ? h("div", { class: "row", style: "gap:6px" }, h("span", { class: "small muted" }, "Giọng:"), [["gem", "Gemini"], ["k", "Kokoro"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(src?.kind === k), onclick: () => { D.voice = k; alStop(); render(); } }, t))) : A.id === s.id && !A.gemUrl && A.gemState === "loading" ? h("span", { class: "small muted" }, "Đang tìm giọng Gemini…") : null;
  return h("div", { class: "stack", style: "gap:12px" },
    h("div", { class: "row", style: "gap:8px;align-items:center" }, h("span", { class: "small muted" }, "Bài:"), h("select", { onchange: e => { alStop(); UI.lsD = { id: e.target.value, i: 0, typed: "", res: null, voice: D.voice }; render(); } }, lsAll().map(x => h("option", { value: x.id, selected: x.id === s.id || null }, `${x.mine || x.shared ? "AI · " : "Đề " + x.test + " · "}S${x.sec} · ${x.title}`))), voiceBtns),
    h("section", { class: "card stack", style: "gap:10px", "data-lsseg": "1" }, h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, `Câu ${D.i % n + 1}/${n}`), h("span", { class: "small muted" }, "Enter để chấm · Bấm Nghe bao nhiêu lần cũng được")),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", disabled: !seg || null, onclick: () => playSeg(1) }, "▶ Nghe câu"), h("button", { class: "btn", type: "button", disabled: !seg || null, onclick: () => playSeg(0.75) }, "🐢 Chậm 0.75×"), h("button", { class: "btn btn-quiet", type: "button", disabled: !st.segs?.[(D.i - 1 + n) % n] || null, onclick: async () => { const a = st.segs[(D.i - 1 + n) % n]; if (D.i && a && seg) lsPlaySent(src, [a[0], seg[1]], 1); } }, "↺ Nghe từ câu trước"), msg),
      lsSegNote(s, src, st), ta,
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: check }, "Chấm"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => go(-1) }, "‹ Câu trước"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => go(1) }, "Câu tiếp ›")),
      D.res ? h("div", { class: "stack", style: "gap:4px" }, h("span", { class: "chip " + (D.res.pct >= 90 ? "good" : D.res.pct >= 60 ? "warn" : "bad") }, `Đúng ${D.res.pct}% số từ`), resView, h("span", { class: "small muted" }, "Xanh: bạn nghe đúng · Đỏ: bạn bỏ sót hoặc nghe sai. Số viết bằng chữ hay chữ số đều được.")) : null));
}
/* Số viết bằng chữ hay chữ số đều tính đúng: đổi chữ số sang chữ trước khi so */
function spSpellKeep(t) { return spSpell(String(t)); }
/* ----- AI soạn bài nghe mới: 1 lượt AI (soạn) + 1 lượt giọng Gemini (đọc), hết lượt giọng thì đọc bằng Kokoro trên máy ----- */
function lsAiTab() {
  const G = UI.lsG ||= { sec: 1, topic: "", busy: false, msg: "" }, out = h("div", { class: "small muted" }, G.msg);
  const gen = async () => {
    G.busy = true; render(); const say = t => { G.msg = t; const o = document.querySelector(".ls-gen-msg"); if (o) o.textContent = t; };
    const base = (G.sec - 1) * 10, kind = ["a conversation between two people in an everyday social context (e.g. booking, enquiry, registration)", "a monologue in an everyday social context (e.g. a guide, an announcement, a radio talk)", "a conversation between two students, or a student and a tutor, about an academic task", "a university lecture on an academic topic"][G.sec - 1];
    const qtype = G.sec === 1 ? "one gap-fill group of 10 items (form or notes, ONE WORD AND/OR A NUMBER)" : G.sec === 4 ? "one gap-fill notes group of 10 items (ONE WORD ONLY)" : "a mix: 5 multiple-choice items (3 options A–C) plus 5 items as matching (4–7 options) or gap-fill";
    try {
      say("AI đang soạn bài nghe…");
      const r = await ai(`Write an ORIGINAL IELTS Listening Section ${G.sec} for Vietnamese learners (target band 6–7): ${kind}.${G.topic.trim() ? " Topic: " + G.topic.trim() + "." : ""} Length 300–420 words of natural spoken English with realistic features (hesitations like "um", self-corrections, a distractor that is later corrected). ${G.sec === 1 || G.sec === 3 ? "Exactly 2 speakers." : "Exactly 1 speaker."}
Questions numbered ${base + 1} to ${base + 10}: ${qtype}. STRICT RULES: every answer must be stated clearly in the script and have exactly ONE correct answer; gap answers must appear word-for-word in the script; questions follow the order of the script.
Speaker keys are "A" and "B". For each speaker give name, g ("male"/"female"), acc ("British"/"American"/"Australian"), mood (tone and emotion for a voice actor).
Return ONLY JSON: {"title":"...","ctx":"one Vietnamese sentence describing the situation","sp":{"A":{"name":"...","g":"female","acc":"British","mood":"..."}},"turns":[["A","..."]],"qs":[{"type":"gap","ins":"Complete the notes below. Write ONE WORD ONLY for each answer.","title":"...","items":[{"n":${base + 1},"pre":"text before gap","post":"text after gap","a":["answer","accepted variant"]}]},{"type":"mcq","ins":"Choose the correct letter, A, B or C.","items":[{"n":0,"q":"...","opts":["...","...","..."],"a":"A"}]},{"type":"match","ins":"...","opts":["...","..."],"items":[{"n":0,"q":"...","a":"B"}]}]}`, { json: true, tier: "complex" });
      const txt = (r.turns || []).map(t => t[1]).join(" ").toLowerCase(), nums = (r.qs || []).flatMap(g => (g.items || []).map(i => i.n));
      if (!r?.turns?.length || nums.length !== 10 || (r.qs || []).some(g => g.type === "gap" && g.items.some(i => !(i.a || []).some(a => txt.includes(String(a).toLowerCase()))))) throw { vn: "Bài AI soạn chưa đạt chuẩn (thiếu câu hoặc đáp án không có trong lời thoại). Bấm tạo lại." };
      const voices = { female: ["af_heart", "bf_emma", "af_nicole", "bf_isabella"], male: ["am_michael", "bm_george", "am_fenrir", "bm_lewis"] };
      Object.entries(r.sp).forEach(([k, v], i) => { const brit = /brit|austral/i.test(v.acc); const L = voices[v.g === "female" ? "female" : "male"].filter(x => brit ? x.startsWith("b") : x.startsWith("a")); v.v = L[i % L.length]; });
      const s = { id: "ai" + newId(), mine: true, sec: G.sec, title: String(r.title || "Bài nghe mới"), ctx: String(r.ctx || ""), sp: r.sp, turns: r.turns, qs: r.qs, created: Date.now() };
      say("Gemini đang đọc bài…"); let ok = false;
      try { const gb = await lsGemAudio(s, true); UI.lsGem = { id: s.id, url: URL.createObjectURL(gb) }; ok = true; } catch (e) { if (e?.code !== "rate_limited" && e?.code !== "unavailable") console.warn(e); }
      if (!ok) { const k = await kokoroRender(s, say); s.kokoro = true; UI.lsKk = { id: s.id, url: URL.createObjectURL(k.blob), segs: k.segs }; }
      await putDoc("listens", s.id, JSON.parse(JSON.stringify({ ...s, mine: undefined }))).catch(() => {}); LS_MINE.unshift(s);
      G.busy = false; G.msg = ""; location.hash = "#ls-" + s.id;
    } catch (e) { G.busy = false; G.msg = e?.vn || aiMsg(e); render(); }
  };
  return h("div", { class: "stack", style: "gap:12px" },
    h("section", { class: "card stack", style: "gap:10px" }, h("h2", null, "Nhờ AI soạn bài nghe mới"),
      h("p", { class: "small muted", style: "margin:0" }, "Mỗi bài tốn 1 lượt AI để soạn và 1 lượt giọng Gemini để đọc (khoảng 30 lượt giọng mỗi ngày cho cả nhóm). Hết lượt giọng thì máy bạn tự đọc bằng Kokoro (tải 90 MB lần đầu, đọc chậm hơn). Bài tạo ra được lưu lại để làm lại sau."),
      h("div", { class: "row", style: "gap:6px" }, [1, 2, 3, 4].map(n => h("button", { type: "button", class: "opt", "aria-pressed": String(G.sec === n), onclick: () => { G.sec = n; render(); } }, "Section " + n))),
      h("input", { type: "text", placeholder: "Chủ đề (không bắt buộc), ví dụ: thuê xe đạp, bảo tàng khoa học, biến đổi khí hậu…", value: G.topic, oninput: e => { G.topic = e.target.value; } }),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", disabled: G.busy || !sample || null, onclick: gen }, G.busy ? "Đang tạo…" : "Tạo bài nghe"), h("span", { class: "small muted ls-gen-msg" }, G.msg))),
    LS_POOL.length ? h("section", { class: "stack", style: "gap:10px" }, h("h2", null, `Kho chung: bài mới mỗi đêm (${LS_POOL.length})`), h("span", { class: "small muted" }, "Máy chủ tự soạn và đọc bằng giọng Gemini vào ban đêm, cả nhóm cùng dùng."), h("div", { class: "grid3" }, LS_POOL.map(s => lsCard(s, "#ls-" + s.id)))) : null,
    LS_MINE.length ? h("section", { class: "stack", style: "gap:10px" }, h("h2", null, "Bài bạn đã tạo"), h("div", { class: "grid3" }, LS_MINE.map(s => lsCard(s, "#ls-" + s.id)))) : null);
}

/* =================== Gắn vào app =================== */
(function () {
  for (const s of LS_MINE) s.mine = true;
  const at = NAV.findIndex(x => x[0] === "reading"); NAV.splice(at + 1, 0, ["listen", "Nghe", "M4 14v-2a8 8 0 0116 0v2M4 14h3v6H5a1 1 0 01-1-1zM20 14h-3v6h2a1 1 0 001-1z"]);
  const mine = r => r === "listen" || (r.startsWith("lp-") && LP_PATH.some(l => l.id === r.slice(3))) || (r.startsWith("ls-") && !!lsById(r.slice(3))) || (r.startsWith("lt-") && LS_BANK.some(s => "lt-" + s.test === r));
  const _or = onRoute; window.removeEventListener("hashchange", _or);
  onRoute = function () { const raw = (location.hash || "").slice(1); if (!mine(raw)) { try { LSA.el?.pause(); } catch {} return _or(); } if (raw !== UI.route) { try { stopTTS(); LSA.el?.pause(); } catch {} UI.route = raw; UI.lsW = null; UI.lsT = null; UI.lpW = null; $("#lookup").hidden = true; render(); window.scrollTo(0, 0); } };
  window.addEventListener("hashchange", () => onRoute());
  const _nav = navTab; navTab = r => r.startsWith("ls-") || r.startsWith("lt-") || r.startsWith("lp-") ? "listen" : _nav(r);
  const _ri = renderInner;
  renderInner = function () {
    const r = UI.route; let node = null;
    if (r === "listen") node = pageListen();
    else if (r.startsWith("ls-") && lsById(r.slice(3))) node = pageLsSection(lsById(r.slice(3)));
    else if (r.startsWith("lt-")) node = pageLsTest(+r.slice(3));
    else if (r.startsWith("lp-") && LP_PATH.some(l => l.id === r.slice(3))) node = pageLp(LP_PATH.find(l => l.id === r.slice(3)));
    if (!node) return _ri();
    renderNav(); UI.keyH = null; $("#main").replaceChildren(node); renderAsk();
  };
  /* Bài AI dùng Kokoro trên máy: phát từ bộ nhớ tạm */
  const _prep = lsPrepare;
  lsPrepare = async function (s) { const Gm = UI.lsGem; if (s.mine && Gm && Gm.id === s.id) { const A = UI.lsA ||= {}; if (A.id === s.id) return; Object.assign(A, { id: s.id, gemUrl: Gm.url, kUrl: null, segs: null, src: "gem", gemState: "ok", played: false }); render(); return; } const K = UI.lsKk; if (s.mine && K && K.id === s.id) { const A = UI.lsA ||= {}; if (A.id === s.id) return; Object.assign(A, { id: s.id, kUrl: K.url, segs: K.segs, src: "k", gemUrl: null, played: false }); render(); return; } return _prep(s); };
})();
