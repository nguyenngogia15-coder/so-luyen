/* ===== Kiểm tra đầu vào đủ 4 kỹ năng: thêm Listening (1 phần nghe 10 câu) và Speaking (phòng thi 3 phần, AI chấm) ===== */
const PL4_IC = { L: SK4_ICO.L, S: SK4_ICO.S };
function pl4Sync() {
  const pend = P.placePend || {}, pl = P.placement ||= {}; let ch = false;
  if (pend.L) { const st = (P.ls || {})[pend.L.id]; if (st && (st.n || 0) > pend.L.n && st.last != null) { pl.L = { band: lsBand(st.last * 4), date: today(), id: pend.L.id, raw: st.last }; delete pend.L; ch = true; } }
  if (pend.S) { const s = SPEAKS.find(x => (x.created || 0) > pend.S.at && x.result?.overall != null); if (s) { pl.S = { band: s.result.overall, date: today(), id: s.id }; delete pend.S; ch = true; } }
  if (ch) { P.placePend = pend; saveProfile(); }
}
function pl4Start(k) {
  const pend = P.placePend ||= {};
  if (k === "L") { const done = P.ls || {}, s = LS_BANK.find(x => x.sec === 3 && done[x.id]?.score == null) || LS_BANK.find(x => x.sec === 2 && done[x.id]?.score == null) || LS_BANK.find(x => x.sec === 3);
    pend.L = { id: s.id, n: (done[s.id]?.n || 0), at: Date.now() }; saveProfile(); location.hash = "#ls-" + s.id; }
  else { pend.S = { at: Date.now() }; saveProfile(); location.hash = "#speak-room"; }
}
(function () {
  const _pc = placeCard;
  placeCard = function () {
    loadSpeaks(); pl4Sync();
    const n = _pc(), pl = P.placement || {}, pend = P.placePend || {};
    const row = (k, name, info) => h("div", { class: "pc-row" }, h("span", { class: "pl-ic " + k, html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="${PL4_IC[k]}"/></svg>` }),
      h("span", { class: "pc-m" }, h("b", null, name), h("span", { class: "small muted" }, pl[k] ? `Band ${pl[k].band.toFixed(1)} · làm ngày ${pl[k].date.split("-").reverse().join("/")}` + (k === "L" && pl[k].raw != null ? ` · đúng ${pl[k].raw}/10` : "") : info)),
      h("button", { type: "button", class: pl[k] ? "btn" : "btn btn-coral", onclick: () => pl4Start(k) }, pend[k] ? "Làm tiếp" : pl[k] ? "Làm lại" : "Làm bài"));
    const rows = n.querySelectorAll(".pc-row"); const before = rows[0];
    if (before) { before.before(row("L", "Listening", "1 phần nghe Section 3 · 10 câu · khoảng 8 phút · chấm ngay")); }
    const last = n.querySelectorAll(".pc-row"); last[last.length - 1].after(row("S", "Speaking", "Phòng thi 3 phần như thật · khoảng 12 phút · AI chấm band"));
    const cnt = n.querySelector("h2")?.parentElement?.querySelector(".small.muted"); if (cnt) cnt.textContent = `${["L", "R", "W", "S"].filter(k => pl[k]).length}/4 kỹ năng`;
    const p = n.querySelector(":scope > p.small"); if (p) p.textContent = "Mỗi kỹ năng một bài ngắn, làm như thi thật, để biết band hiện tại của cả 4 kỹ năng. Điểm được tính vào band ước tính ở trên. Làm lúc nào cũng được, làm lại khi muốn đo lại.";
    return n;
  };
  const _ls = lsBandEst; lsBandEst = function () { const b = _ls(); return b != null ? b : P.placement?.L?.band ?? null; };
})();
