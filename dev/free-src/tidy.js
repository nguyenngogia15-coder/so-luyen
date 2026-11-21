/* ===== Dọn gọn web ngoài: gộp Phát âm vào Nói, gộp danh sách việc ở Hôm nay, bỏ thử thách tuần cũ (đã có boss và xếp hạng tuần) ===== */
(function () {
  const i = NAV.findIndex(x => x[0] === "ipa"); if (i >= 0) NAV.splice(i, 1);
  const _nav = navTab; navTab = r => { const x = _nav(r); return x === "ipa" || r === "ipa" || r === "ipa-chart" || r.startsWith("pr-") ? "speak" : x; };
  /* Thử thách tuần cũ: tắt, thay bằng thẻ cấp độ gọn dẫn sang trang Nhóm */
  checkWeek = function () {};
  progressCard = function () {
    const xp = P.xp || 0, lv = levelOf(xp);
    return h("section", { class: "card stack", style: "gap:8px" },
      h("div", { class: "row", style: "justify-content:space-between;align-items:flex-end" }, h("div", { class: "stack", style: "gap:2px" }, h("span", { class: "eyebrow" }, "Cấp độ"), h("span", { class: "row", style: "gap:10px;align-items:baseline" }, h("span", { class: "band-big", style: "font-size:2.2rem" }, lv.L), h("span", { class: "small muted" }, `${xp} XP · còn ${lv.to - xp} XP lên cấp ${lv.L + 1}`))),
        h("a", { class: "btn", href: "#group" }, "Boss tuần, xếp hạng, game pass ›")),
      h("div", { class: "meter" }, h("i", { style: `width:${(xp - lv.from) / (lv.to - lv.from) * 100}%` })));
  };
  /* Hôm nay: nhiệm vụ bắt buộc đứng đầu, danh sách cũ thành "Gợi ý thêm" thu gọn */
  const _pt = pageToday;
  pageToday = function () {
    const n = _pt(), st = dqToday(today()), left = DQ_T.length - st.met.length;
    for (const el of n.querySelectorAll(".today-head .chip, :scope > p.small")) el.textContent = el.textContent.replace(/tài khoản Claude của bạn|tài khoản Claude/g, "tài khoản Google của bạn");
    const h1 = n.querySelector(".today-head h1"); if (h1) h1.textContent = left ? `Còn ${left} nhiệm vụ bắt buộc hôm nay` : "Xong nhiệm vụ hôm nay 🎉";
    const old = [...n.querySelectorAll(":scope > section.card")].find(s => s.querySelector("h2")?.textContent === "Việc cần làm");
    if (old) {
      const d = h("details", { class: "today-more", open: UI.todaySug || null, ontoggle: e => { UI.todaySug = e.currentTarget.open; } }, h("summary", null, h("b", null, "Gợi ý thêm (không bắt buộc)"), h("span", { class: "small muted" }, "Bài kế tiếp trong khóa học, ôn sổ từ, sổ lỗi")));
      old.querySelector("h2").textContent = "Gợi ý thêm"; old.style.marginTop = "12px"; d.append(old);
      const dq = n.querySelector(".dq-card"); (dq || n.firstElementChild).after(d);
    }
    return n;
  };
})();
