/* ===== Giọng đọc: luôn cho biết đang nghe giọng nào, ưu tiên Gemini. Bài chưa có giọng Gemini thì tự nhờ Worker thu ngay (chạy nền), xong tự đổi sang. ===== */
const VG = { q: [], busy: false, tried: {} };
/* Thu giọng Gemini cho một bài nghe (lần lượt từng bài, cách nhau vài giây để không vượt giới hạn lượt) */
function lsGemAuto(s) {
  if (!s || VG.tried[s.id] || Object.keys(s.sp || {}).length > 2 || !window.__tts) return;
  VG.tried[s.id] = 1; VG.q.push(s); vgRun();
}
async function vgRun() {
  if (VG.busy) return; VG.busy = true;
  while (VG.q.length) {
    const s = VG.q.shift(), A = UI.lsA || {}; if (A.id === s.id) { A.gemState = "gen"; render(); }
    try {
      const b = await lsGemAudio(s, true); try { GEMHAS.set?.add(s.id); } catch {}
      const B = UI.lsA || {}; if (B.id === s.id) { B.gemUrl = URL.createObjectURL(b); B.gemState = "ok"; const playing = LSA.el && !LSA.el.paused; if (!playing) { B.src = "gem"; try { LSA.el?.pause(); } catch {} } toast(playing ? "Đã có giọng Gemini cho bài này: bấm “Giọng Gemini” để đổi." : "Đã đổi sang giọng Gemini 🎙"); render(); }
    } catch (e) { const B = UI.lsA || {}; if (B.id === s.id) { B.gemState = "none"; B.genErr = e?.code === "rate_limited" ? "Hôm nay hết lượt thu giọng Gemini, tối nay Worker sẽ thu tiếp." : "Chưa thu được giọng Gemini: " + (e?.message || e?.code || "lỗi"); render(); } if (e?.code === "rate_limited") { VG.q.length = 0; break; } }
    await new Promise(r => setTimeout(r, 6000));
  }
  VG.busy = false;
}
/* Dòng giọng đọc: đang nghe giọng nào + trạng thái thu Gemini */
lsVoicePick = function (s) {
  const A = UI.lsA || {};
  if (A.id === s.id && A.gemState === "none" && !VG.tried[s.id]) setTimeout(() => lsGemAuto(s), 0);
  const gem = A.src === "gem" && A.gemUrl, other = A.gemUrl && A.kUrl;
  const sw = k => { A.src = k; try { LSA.el?.pause(); } catch {} alStop(); render(); };
  return h("div", { class: "row ls-voice", style: "gap:6px;align-items:center;flex-wrap:wrap" },
    h("span", { class: "chip " + (gem ? "good" : "warn") }, gem ? "🎙 Đang nghe: giọng Gemini" : "🤖 Đang nghe: giọng máy"),
    other ? h("button", { type: "button", class: "btn btn-quiet small", onclick: () => sw(gem ? "k" : "gem") }, gem ? "Đổi sang giọng máy" : "Đổi sang giọng Gemini") : null,
    !A.gemUrl ? h("span", { class: "small muted" }, A.gemState === "loading" ? "Đang tìm giọng Gemini…" : A.gemState === "gen" ? "Đang thu giọng Gemini cho bài này (20–60 giây), xong sẽ tự đổi…" : A.genErr || (Object.keys(s.sp || {}).length > 2 ? "Bài nhiều hơn 2 người nói nên chưa thu được giọng Gemini." : "")) : null);
};
/* Số & đánh vần, game: chip cho biết câu vừa phát là giọng nào */
const VNOW = { k: null };
function vNowSet(k) { VNOW.k = k; document.querySelectorAll(".voice-now").forEach(el => vNowPaint(el)); }
function vNowPaint(el) { el.className = "chip voice-now " + (VNOW.k === "gem" ? "good" : VNOW.k ? "warn" : ""); el.textContent = VNOW.k === "gem" ? "🎙 Giọng Gemini" : VNOW.k ? "🤖 Giọng máy · Gemini đang được thu dần" : "🎙 Giọng: bấm nghe để xem"; }
function vNowChip() { const el = h("span", { class: "chip voice-now" }); vNowPaint(el); return el; }
(function () {
  const _nd = ndPlay; ndPlay = async function (it, rate) { const g = await gemClip("nd", it.id).catch(() => null); vNowSet(g ? "gem" : "k"); return _nd(it, rate); };
  const _gm = gmAudio; gmAudio = async function (key, rate) { const g = await gemClip("gm", key).catch(() => null); vNowSet(g ? "gem" : "k"); return _gm(key, rate); };
  const _sp = spSay; spSay = async function (text, rate) { const g = await gemClip("sp", spvKey(text)).catch(() => null); vNowSet(g ? "gem" : "k"); return _sp(text, rate); };
  const _ndt = lsNdTab; lsNdTab = function () { const n = _ndt(); try { gemWarm("nd"); } catch {} n.prepend(h("div", { class: "row" }, vNowChip())); return n; };
  /* Nghe chép bài có sẵn: hiện giọng đang dùng, tự thu Gemini nếu bài chưa có */
  const _dict = lsDictTab; lsDictTab = function () {
    const n = _dict(); if ((UI.dSrc || "bank") !== "bank") return n;
    const D = UI.lsD, s = D && lsById(D.id), A = UI.lsA || {}; if (!s || A.id !== s.id) return n;
    if (A.gemState === "none") setTimeout(() => lsGemAuto(s), 0);
    const src = lsSrcInfo(s, D.voice || "gem"), gem = src?.kind === "gem";
    n.querySelector("section")?.prepend(h("div", { class: "row", style: "gap:6px;align-items:center;flex-wrap:wrap" }, h("span", { class: "chip " + (gem ? "good" : "warn") }, gem ? "🎙 Đang nghe: giọng Gemini" : "🤖 Đang nghe: giọng máy"),
      !A.gemUrl ? h("span", { class: "small muted" }, A.gemState === "gen" ? "Đang thu giọng Gemini (20–60 giây), xong sẽ tự đổi…" : A.genErr || "") : null));
    return n;
  };
})();
/* Trang Game: mở game Nghe/Nói thì chuẩn bị sẵn giọng Gemini cho game */
(function () { const _pg = pageGames; pageGames = function () { if (/^g-/.test(UI.gmPick || "") && UI.gmWarm !== UI.gmPick) { UI.gmWarm = UI.gmPick; try { gemWarm("gm"); gemWarm("nd"); } catch {} } return _pg(); }; })();
