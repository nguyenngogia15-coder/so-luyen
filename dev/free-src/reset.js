/* ===== Đặt lại thành tựu và tiến độ cả nhóm (chỉ tài khoản chủ trang bấm được).
   Xóa: XP, level, chuỗi ngày, nhiệm vụ đã tick, vé, rương, game pass, thành tựu, huy hiệu, kỷ lục game, lịch sử học, sổ lỗi,
   kết quả làm thử (band Writing/Reading/Listening/Speaking, bài viết đã chấm, đề thi thử, bài nói đã chấm, thống kê âm hay sai, shadowing).
   Giữ: bài đã học (ngữ pháp, khóa Đọc/Viết, Lộ trình từ vựng, lộ trình nghe/nói), từ vựng đã thêm, bài đọc (chỉ xóa lần làm), tên và ảnh. ===== */
const RS = { at: 0, busy: false, sure: 0 };
const RS_KEYS = ["dq", "xp", "xpDay", "wk", "badges", "rbadge", "log", "gm", "e4", "mm", "petSeen", "pron", "shStat", "lsTests", "ls", "placement", "wscores", "ndStat", "ndSeen", "errAdvice", "lsQt", "placePend"];
function rsApply(at) {
  for (const k of RS_KEYS) delete P[k];
  Object.assign(P, { xp: 0, xpDay: {}, wk: {}, badges: {}, rbadge: {}, log: {} });
  P.resetAt = at; saveProfile();
  /* Kết quả làm thử: bài viết đã chấm, đề thi thử, bài nói đã chấm, sổ lỗi; bài đọc giữ lại nhưng xóa các lần làm */
  (async () => {
    try {
      for (const c of ["writings", "mocks", "speaks", "mistakes"]) for (const d of await store.list(c).catch(() => [])) await store.del(c, d.id).catch(() => {});
      for (const d of await store.list("readings").catch(() => [])) if (d.attempts?.length) { const { id, ...doc } = d; doc.attempts = []; await store.put("readings", id, doc).catch(() => {}); }
      try { SPEAKS.splice(0, SPEAKS.length); } catch {}
      await store.setProfile(P); await loadAll(); render();
    } catch (e) { console.warn(e); }
  })();
  try { G.last = ""; G.pokes.forEach(p => window.__grp.clear(p.id).catch(() => {})); } catch {}
  setTimeout(() => { try { dqTick(); dqPublish(true); } catch {} render(); }, 300);
}
async function rsCheck() {
  if (!window.__grp?.getCfg || !P) return;
  try { const c = await window.__grp.getCfg(); RS.at = +c?.at || 0; if (RS.at && (P.resetAt || 0) < RS.at) { rsApply(RS.at); toast("Chủ nhóm đã đặt lại tiến độ cả nhóm. Bắt đầu lại từ đầu nhé!"); } } catch {}
}
setTimeout(function w() { if (P && window.__grp) rsCheck(); else setTimeout(w, 1500); }, 2000);
async function rsAll() {
  if (RS.busy) return; RS.busy = true; render();
  try { const at = Date.now(); await window.__grp.setCfg({ at }); RS.at = at; rsApply(at); toast("Đã đặt lại. Các bạn khác sẽ được đặt lại khi mở web."); }
  catch (e) { toast("Chưa đặt lại được: " + (e?.code || e?.message || "lỗi") + ". Kiểm tra quy tắc Firestore mục cfg."); }
  RS.busy = false; RS.sure = 0; render();
}
function rsCard() {
  if (!window.__isOwner) return null;
  return h("section", { class: "card stack rs-card", style: "gap:8px" }, h("h2", { style: "margin:0" }, "🛠 Quản lý nhóm (chỉ bạn thấy)"),
    h("p", { class: "small muted", style: "margin:0" }, "Đặt lại của tất cả thành viên, cả bạn: XP, level, chuỗi ngày, nhiệm vụ, rương, game pass, thành tựu, boss, thần thú, kỷ lục game, lịch sử học, sổ lỗi và mọi kết quả làm thử (band 4 kỹ năng, bài viết và bài nói đã chấm, đề thi thử, âm hay sai). Giữ nguyên bài đã học, từ vựng đã thêm, bài đọc, tên và ảnh."),
    h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" },
      h("button", { class: "btn" + (RS.sure ? " btn-primary" : ""), type: "button", disabled: RS.busy || null, onclick: () => { if (!RS.sure) { RS.sure = 1; render(); return; } rsAll(); } }, RS.busy ? "Đang đặt lại…" : RS.sure ? "Bấm lần nữa để xác nhận đặt lại cả nhóm" : "Đặt lại tiến độ cả nhóm"),
      RS.sure ? h("button", { class: "btn btn-quiet", type: "button", onclick: () => { RS.sure = 0; render(); } }, "Hủy") : null),
    RS.at ? h("span", { class: "small muted" }, "Lần đặt lại gần nhất: " + new Date(RS.at).toLocaleString("vi-VN")) : null);
}
(function () {
  /* Bạn nào chưa mở web sau khi đặt lại thì bảng nhóm tạm coi như mới bắt đầu */
  const _gm = grpMine;
  grpMine = function () { const l = _gm(), me = window.__grp?.uid; return RS.at ? l.map(m => m.id !== me && (m.at || 0) < RS.at ? { id: m.id, name: m.name, ava: m.ava, color: m.color, frame: m.frame, lv: 1, xp: 0, streak: 0, days: {}, skd: {}, td: {}, wx: {}, tier: 0, badges: [], ach: [], gc: 0, mm: {}, joined: today(), at: m.at } : m) : l; };
  const _pg = pageGroup; pageGroup = function () { const n = _pg(), c = rsCard(); if (c) n.append(c); return n; };
})();
