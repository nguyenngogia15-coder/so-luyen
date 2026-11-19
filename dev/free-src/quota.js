/* ===== Bảng lượt AI còn lại hôm nay (cả nhóm dùng chung một key Gemini miễn phí) ===== */
const QT = { d: null, at: 0, p: null, err: null };
function quotaLoad(force) {
  if (!window.__quota) return Promise.resolve(null);
  if (!force && (QT.d || QT.err) && Date.now() - QT.at < (QT.err ? 300000 : 60000)) return Promise.resolve(QT.d);
  return QT.p ||= window.__quota().then(d => { if (!d?.tiers) throw { message: "Worker chưa có bảng lượt (cần cập nhật bản mới)" }; Object.assign(QT, { d, at: Date.now(), err: null }); return d; }).catch(e => { QT.err = e?.message || e?.code || "lỗi"; QT.at = Date.now(); return null; }).finally(() => { QT.p = null; });
}
const TIER_INFO = {
  top: ["Mạnh nhất", "Chấm bài Writing đầy đủ, chấm thi thử Speaking, chữa bài viết dài từ 150 từ, soạn bài đọc và bài nghe mới, phân tích tiến bộ"],
  mid: ["Vừa", "Chữa đoạn ngắn trong bài ngữ pháp và khóa Viết, chấm game viết câu và bài dịch, ra đề, giải thích đề, lập kế hoạch tuần, chép lời video YouTube"],
  lite: ["Nhẹ", "Tra từ, sổ từ vựng, phân tích câu, giải thích câu Reading làm sai, chấm paraphrase"]
};
function quotaSum(rows) {
  let left = 0, known = true, used = 0;
  for (const r of rows) { used += r.used; if (r.out) continue; if (r.lim == null) { known = false; continue; } left += Math.max(0, r.lim - r.used); }
  return { left, known, used, allOut: rows.length > 0 && rows.every(r => r.out) };
}
function quotaChip() {
  const d = QT.d; if (!d) { quotaLoad(); return null; }
  const s = quotaSum(d.tiers.mid);
  return h("a", { class: "chip " + (s.allOut ? "bad" : s.known && s.left < 20 ? "warn" : "good"), href: "#quota", title: "Lượt AI còn lại hôm nay" }, "⚡ " + (s.allOut ? "Hết lượt AI" : (s.known ? "" : "≥") + s.left + " lượt AI"));
}
function pageQuota() {
  const d = QT.d;
  if (!d) { quotaLoad(true).then(() => document.querySelector(".qt-page") && render()); }
  const reset = d ? new Date(d.resetAt) : null;
  const tbl = (rows, label) => h("table", { class: "qt-tbl" }, h("thead", null, h("tr", null, h("th", null, label), h("th", null, "Đã dùng"), h("th", null, "Giới hạn/ngày"), h("th", null, "Còn"), h("th", null, "Trạng thái"))),
    h("tbody", null, rows.map(r => h("tr", { class: r.out ? "out" : "" }, h("td", null, h("code", null, r.model)), h("td", null, String(r.used)), h("td", null, r.lim ?? "chưa biết"), h("td", null, r.out ? "0" : r.lim != null ? String(Math.max(0, r.lim - r.used)) : "?"),
      h("td", null, r.out ? h("span", { class: "chip bad" }, "Hết lượt hôm nay") : r.busy ? h("span", { class: "chip warn" }, "Đang quá nhanh, chờ 1 phút") : h("span", { class: "chip good" }, "Dùng được"))))));
  return h("div", { class: "stack qt-page", style: "gap:18px" },
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Dùng chung cả nhóm"), h("h1", null, "Lượt AI hôm nay"),
      h("p", { class: "muted", style: "max-width:68ch;margin:0" }, "Cả nhóm dùng chung một key Gemini miễn phí. Mỗi model có giới hạn lượt riêng mỗi ngày; model đầu hết lượt thì web tự chuyển sang model sau trong cùng hạng. Phần chấm phát âm, nghe, số và đánh vần, shadowing chạy trên máy nên không tốn lượt."),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { QT.d = null; quotaLoad(true).then(() => render()); render(); } }, "↻ Cập nhật"), d ? h("span", { class: "small muted" }, "Cập nhật lúc " + new Date(QT.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })) : null)),
    QT.err && !d ? h("p", { class: "note bad" }, "Chưa lấy được số liệu (" + QT.err + "). Có thể Worker chưa được cập nhật bản mới.") : null,
    !d ? h("p", { class: "muted" }, "Đang tải…") : [
      !d.kv ? h("p", { class: "note warn" }, "Worker chưa gắn nơi lưu AUDIO nên chưa đếm được lượt.") : null,
      h("section", { class: "card stack", style: "gap:10px" },
        h("div", { class: "statgrid" }, [["Bạn đã dùng hôm nay", d.me + " lượt"], ["Cả nhóm đã dùng", d.total + " lượt"], ["Số người dùng hôm nay", d.people], ["Đặt lại lượt lúc", reset.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " (giờ VN)"]].map(([k, v]) => h("div", null, h("span", { class: "small muted" }, k), h("b", null, String(v))))),
        h("p", { class: "small muted", style: "margin:0" }, "Google đặt lại lượt lúc 0 giờ theo giờ California, tức khoảng 14–15 giờ chiều giờ Việt Nam.")),
      ...["top", "mid", "lite"].map(t => { const s = quotaSum(d.tiers[t]);
        return h("section", { class: "card stack", style: "gap:8px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline" }, h("h2", null, `Hạng ${TIER_INFO[t][0].toLowerCase()}`), h("b", { class: s.allOut ? "bad-t" : "" }, s.allOut ? "Hết lượt" : `Còn ${s.known ? "" : "ít nhất "}${s.left} lượt`)),
          h("p", { class: "small muted", style: "margin:0" }, "Dùng cho: " + TIER_INFO[t][1] + "."), h("div", { class: "qt-wrap" }, tbl(d.tiers[t], "Model (theo thứ tự ưu tiên)"))); }),
      h("section", { class: "card stack", style: "gap:8px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline" }, h("h2", null, "Giọng đọc Gemini"), (() => { const s = quotaSum(d.tts); return h("b", null, s.allOut ? "Hết lượt" : `Còn ${s.known ? "" : "ít nhất "}${s.left} lượt`); })()),
        h("p", { class: "small muted", style: "margin:0" }, "Dùng để đọc bài nghe và giọng giám khảo Speaking. Máy chủ tự thu ban đêm; bài đã thu thì cả nhóm nghe lại không tốn lượt."), h("div", { class: "qt-wrap" }, tbl(d.tts, "Model giọng đọc"))),
      h("p", { class: "small muted" }, "“Chưa biết”: Google không báo trước giới hạn; Worker tự ghi lại con số khi model đó báo hết lượt lần đầu. Chủ trang có thể ghi sẵn giới hạn trong biến RPD của Worker.")]);
}
(function () {
  const mine = r => r === "quota";
  const _or = onRoute; window.removeEventListener("hashchange", _or);
  onRoute = function () { const raw = (location.hash || "").slice(1); if (!mine(raw)) return _or(); if (raw !== UI.route) { UI.route = raw; $("#lookup").hidden = true; render(); window.scrollTo(0, 0); } };
  window.addEventListener("hashchange", () => onRoute());
  const _ri = renderInner;
  renderInner = function () { if (UI.route !== "quota") return _ri(); renderNav(); UI.keyH = null; $("#main").replaceChildren(pageQuota()); renderAsk(); };
  const _nav = navTab; navTab = r => r === "quota" ? "today" : _nav(r);
})();
/* Chip nhỏ cạnh tài khoản ở thanh trên: luôn thấy còn bao nhiêu lượt */
setInterval(() => { const box = document.getElementById("acct"); if (!box || !window.__quota) return; quotaLoad().then(() => { const c = quotaChip(); if (!c) return; c.id = "qchip"; const old = document.getElementById("qchip"); old ? old.replaceWith(c) : box.prepend(c); }); }, 4000);
