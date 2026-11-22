/* ===== Tính lại tiến độ từ bài đã lưu: dùng một lần cho tài khoản bị mất hồ sơ (XP, nhiệm vụ, chuỗi ngày).
   Bài viết, bài đọc, bài nói, đề thi thử, từ đã ôn lưu riêng nên vẫn còn; từ đó tính lại số phút theo kỹ năng của từng ngày,
   đánh dấu ngày đủ nhiệm vụ, ước lượng XP. Chuỗi ngày thì người học nhập lại số ngày mình nhớ. ===== */
const RQ = { scan: null, busy: false, streak: "", sure: false, hide: false };
const rqDay = ts => ts ? new Date(+ts).toLocaleDateString("en-CA") : "";
async function rqScan() {
  const day = {}, add = (d, k, m) => { if (!d || d > today()) return; const o = day[d] ||= {}; o[k] = (o[k] || 0) + m; };
  const c = { w: 0, r: 0, s: 0, m: 0, v: 0 }; let xp = 0;
  for (const w of WRIT) { if (!w.created) continue; add(rqDay(w.created), "W", 12); xp += w.parent ? 30 : w.task === 1 ? 50 : 80; c.w++; }
  for (const r of READS) for (const a of r.attempts || []) { add(a.date, "R", 12); xp += 40; c.r++; }
  const sp = await store.list("speaks").catch(() => []);
  for (const s of sp) { if (!s.created) continue; add(rqDay(s.created), "S", 6); xp += 40; c.s++; }
  for (const m of MOCKS) {
    const d = rqDay(m.created); let any = false;
    if (m.listen?.done) { add(d, "L", 30); any = true; } if (m.read?.done) { add(d, "R", 30); any = true; } if (m.write?.done) { add(d, "W", 30); any = true; }
    if (any) { xp += 100; c.m++; }
  }
  for (const v of VOCAB) if (v.last && (v.reps || 0) + (v.lapses || 0) > 0) { add(v.last, "V", 1); xp += 1; c.v++; }
  return { day, xp, c, days: Object.keys(day).length };
}
function rqNeed() {
  if (!P || P.rebuilt || RQ.hide || store.kind !== "db" || UI.dbSwitching) return false;
  if (!RQ.scan) { if (!RQ.busy) { RQ.busy = true; rqScan().then(s => { RQ.scan = s; RQ.busy = false; render(); }, () => { RQ.busy = false; }); } return false; }
  return RQ.scan.xp > (P.xp || 0) + 50 && RQ.scan.days >= 2;
}
function rqApply() {
  const s = RQ.scan, q = dqS(), n = Math.max(0, Math.min(90, Math.round(+RQ.streak || 0)));
  let done = 0, first = today();
  for (const [d, est] of Object.entries(s.day)) {
    if (d < first) first = d;
    const lg = P.log[d] ||= { min: 0, acts: [] }, by = lg.by ||= {}; if (!by.f && lg.sk) by.f = { ...lg.sk }; const b = by.f ||= {};
    let sum = 0; for (const k of ["L", "S", "R", "W"]) if (est[k]) { b[k] = Math.max(b[k] || 0, est[k]); sum += est[k]; }
    if (est.V) { lg.vr ||= 1; sum += Math.min(10, est.V); }
    lg.min = Math.max(+lg.min || 0, sum);
  }
  for (const d of Object.keys(s.day)) if (dqToday(d).ok && q.days[d] !== 1) { q.days[d] = 1; q.fin[d] ||= new Date(d + "T21:00:00").getTime(); done++; }
  for (let i = 1; i <= n; i++) { const d = addDays(today(), -i); if (d < first) first = d; if (!q.days[d]) { q.days[d] = 1; q.fin[d] ||= new Date(d + "T21:00:00").getTime(); } }
  if (first < (q.joined || today())) q.joined = first;
  P.xp = Math.max(P.xp || 0, s.xp + done * 20);
  P.rebuilt = Date.now(); saveProfile();
  try { dqRecheck(); dqPublish(true); } catch {}
  toast(`Đã tính lại: ${P.xp} XP, chuỗi ${dqStreak(q.days)} ngày.`); render();
}
function rqCard() {
  if (!rqNeed()) return null;
  const s = RQ.scan, inp = h("input", { type: "number", min: 0, max: 90, inputmode: "numeric", value: RQ.streak, placeholder: "vd 12", style: "width:90px", oninput: e => { RQ.streak = e.target.value; } });
  return h("section", { class: "card stack rq-card", style: "gap:10px;border-color:var(--coral,#d9480f)" },
    h("h2", { style: "margin:0" }, "🛟 Tiến độ của bạn bị mất? Tính lại từ bài đã lưu"),
    h("p", { class: "small", style: "margin:0" }, "Một lỗi của web đã xóa XP, nhiệm vụ và chuỗi ngày của một số bạn (lỗi đã được sửa). Bài làm của bạn vẫn còn, web dùng chúng để tính lại."),
    h("p", { class: "small muted", style: "margin:0" }, `Tìm thấy: ${s.c.w} bài viết, ${s.c.r} lần làm bài đọc, ${s.c.s} bài nói, ${s.c.m} đề thi thử, ${s.c.v} từ đã ôn, trải trên ${s.days} ngày. Ước tính khoảng ${s.xp} XP. Phần nghe và bài học ngữ pháp không lưu riêng nên không tính lại được.`),
    h("label", { class: "row", style: "gap:8px;flex-wrap:wrap;align-items:center" }, h("span", { class: "small" }, "Chuỗi ngày của bạn trước khi mất (nếu nhớ, tính đến hôm qua):"), inp, h("span", { class: "small muted" }, "ngày")),
    h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" },
      h("button", { class: "btn" + (RQ.sure ? " btn-primary" : ""), type: "button", onclick: () => { if (!RQ.sure) { RQ.sure = true; render(); return; } RQ.sure = false; rqApply(); } }, RQ.sure ? "Bấm lần nữa để tính lại" : "Tính lại tiến độ"),
      h("button", { class: "btn btn-quiet", type: "button", onclick: () => { RQ.hide = true; render(); } }, "Để sau")),
    h("span", { class: "small muted" }, "Chỉ dùng được một lần. Nếu có bản sao lưu ở cuối trang Hôm nay thì nên khôi phục bản đó trước."));
}
(function () {
  const _pt = pageToday; pageToday = function () { const n = _pt(), c = rqCard(); if (c) { const hd = n.firstElementChild; hd ? hd.after(c) : n.prepend(c); } return n; };
  const _pg = pageGroup; pageGroup = function () { const n = _pg(), c = rqCard(); if (c) { const hd = n.firstElementChild; hd ? hd.after(c) : n.prepend(c); } return n; };
})();
/* Chỉnh một lần cho riêng tài khoản chủ trang: nhiệm vụ ngày 22/11/2026 đã làm đủ (Nghe, Nói, Đọc bằng game; Viết bằng khóa Viết;
   Từ vựng: qua bài 1 chủ đề đầu tiên) nhưng bị lỗi xóa mất. */
function fix1122() {
  const d = "2026-11-22", q = dqS(), lg = P.log[d] ||= { min: 0, acts: [] }, by = lg.by ||= {};
  if (!by.f && lg.sk) by.f = { ...lg.sk }; const b = by.f ||= {};
  for (const [k, m] of [["L", 5], ["S", 5], ["R", 10], ["W", 15]]) b[k] = Math.max(b[k] || 0, m);
  lg.vr = 1; lg.min = Math.max(+lg.min || 0, 35);
  const s = vrL("topic-education", 0); s.c = 1; s.x = Math.max(s.x || 0, 3);
  if (q.days[d] !== 1) { q.days[d] = 1; q.fin[d] ||= new Date(d + "T18:30:00").getTime(); P.xp = (P.xp || 0) + 20; const xd = (P.xpDay ||= {})[d] ||= {}; xd.daily = (xd.daily || 0) + 20; }
  q.sk[d] = "VLSRW"; if (!q.joined || q.joined > d) q.joined = d;
  P.fix1122 = Date.now(); saveProfile();
  try { dqPublish(true); } catch {} render();
}
setTimeout(function w() {
  if (window.__isOwner === false || P?.fix1122) return;
  if (window.__isOwner && P && store.kind === "db" && !UI.dbSwitching) { try { fix1122(); } catch (e) { console.warn(e); } return; }
  setTimeout(w, 1500);
}, 2500);
/* Trả lại XP cho riêng tài khoản chủ trang: trước lỗi là Level 3 dư 20 XP (220 XP, đã gồm 20 XP nhiệm vụ 22/11 trả lại ở trên).
   XP kiếm thêm sau lỗi vẫn giữ. */
setTimeout(function w() {
  if (window.__isOwner === false || P?.fixXp) return;
  if (!(window.__isOwner && P && P.fix1122 && store.kind === "db" && !UI.dbSwitching)) { setTimeout(w, 1500); return; }
  const before = P.xp || 0;
  P.xp = P.rebuilt ? Math.max(before, 220) : Math.max(before + 200, 220);
  P.fixXp = Date.now(); saveProfile(); try { dqPublish(true); } catch {}
  toast(`Đã trả lại XP: ${P.xp} XP (Level ${levelOf(P.xp).L}).`); render();
}, 3000);
