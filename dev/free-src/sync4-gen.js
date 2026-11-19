/* Tự sinh từ app gốc bởi gen_sync4.py: bản 4 kỹ năng. Đừng sửa tay. */
function goalCard() {
  const sb = skillBands(), t = today();
  const daysLeft = P.examDate ? Math.round((new Date(P.examDate + "T00:00:00") - new Date(t + "T00:00:00")) / 86400000) : null;
  const skills = SK4.map(x => x.slice(0, 3));
  const missing = skills.filter(([k]) => sb[k] == null);
  const known = skills.filter(([k]) => sb[k] != null).sort((a, b) => (sb[a[0]] - (P.skillTarget?.[a[0]] ?? P.target)) - (sb[b[0]] - (P.skillTarget?.[b[0]] ?? P.target)));
  const focus = missing[0] || known[0];
  const rep = h("div");
  return h("section", { class: "card" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:flex-end" },
      h("div", { class: "stack", style: "gap:2px" }, h("span", { class: "eyebrow" }, "Mục tiêu"), h("h2", null, `Band ${(+P.target).toFixed(1)}` + (daysLeft != null ? (daysLeft >= 0 ? ` · còn ${daysLeft} ngày` : " · đã qua ngày thi") : ""))),
      h("a", { class: "btn btn-primary", href: "#mock" }, "Thi thử")),
    h("div", { class: "row" }, skills.map(([k, l]) => h("span", { class: "chip " + (sb[k] == null ? "" : sb[k] >= (P.skillTarget?.[k] ?? P.target) ? "good" : "warn") }, `${l} ${sb[k] == null ? "chưa có" : sb[k].toFixed(1)} / ${(P.skillTarget?.[k] ?? P.target).toFixed(1)}`))),
    focus ? h("p", { class: "note small" }, missing.length ? `Tuần này nên tập trung: ${focus[1]}. Chưa có điểm ${focus[1]} để ước tính, làm 1–2 bài để web biết bạn đang ở đâu. ` : `Tuần này nên tập trung: ${focus[1]} (thấp nhất, ước tính ${sb[focus[0]].toFixed(1)}). `, h("a", { href: focus[2] }, "Đi tới " + focus[1])) : null,
    h("p", { class: "small muted" }, "Listening và Reading quy đổi từ số câu đúng; Writing và Speaking do AI chấm theo 4 tiêu chí (Speaking lấy 2 lần thi gần nhất)."),
    h("details", { open: UI.goalOpen || null, ontoggle: e => UI.goalOpen = e.currentTarget.open }, h("summary", { class: "small" }, "Sửa ngày thi, band mục tiêu, thời gian học"),
      goalEditor()),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: async () => { const txt = weekReport(); try { await navigator.clipboard.writeText(txt); toast("Đã sao chép báo cáo tuần"); } catch { const ta = h("textarea", { rows: "9", readonly: true }); ta.value = txt; rep.replaceChildren(h("p", { class: "small muted" }, "Không sao chép tự động được, hãy chọn và sao chép đoạn dưới:"), ta); ta.select(); } } }, "Sao chép báo cáo tuần")), rep);
}
function goalEditor() {
  const bands = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5];
  const apply = fn => { fn(); UI.goalOpen = true; saveProfileNow("goal"); };
  const chips = (vals, cur, label, on) => h("div", { class: "row", style: "gap:6px" }, vals.map(v => h("button", { type: "button", class: "opt", "aria-pressed": cur === v ? "true" : "false", onclick: () => apply(() => on(v)) }, label(v))));
  const dIn = h("input", { type: "text", id: "exdate2", inputmode: "numeric", placeholder: "ví dụ 20/03/2027", style: "max-width:170px", value: P.examDate ? P.examDate.split("-").reverse().join("/") : "" });
  const dMsg = h("span", { class: "small", style: "color:var(--bad)" });
  const saveDate = () => { const m = dIn.value.trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if (!dIn.value.trim()) { apply(() => P.examDate = null); return; } if (!m) { dMsg.textContent = "Nhập dạng ngày/tháng/năm, ví dụ 20/03/2027."; return; } const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; if (isNaN(new Date(iso + "T00:00:00"))) { dMsg.textContent = "Ngày không hợp lệ."; return; } apply(() => P.examDate = iso); };
  return h("div", { class: "stack", style: "gap:12px;margin-top:10px" },
    saveMsgNode("goal") || h("span", { class: "small muted" }, "Chạm vào lựa chọn là lưu luôn."),
    h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "small" }, "Band mục tiêu tổng"), chips(bands, +P.target, v => v.toFixed(1), v => P.target = v)),
    SK4.map(x => x[0]).map(k => h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "small" }, { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" }[k] + " (để “=” thì bằng band tổng)"),
      chips(["=", ...bands], P.skillTarget?.[k] ?? "=", v => v === "=" ? "=" : v.toFixed(1), v => { P.skillTarget ||= {}; if (v === "=") delete P.skillTarget[k]; else P.skillTarget[k] = v; }))),
    h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "small" }, "Phút học mỗi ngày"), chips([15, 20, 30, 45, 60, 90, 120], P.minutesPerDay || 20, v => v + "′", v => P.minutesPerDay = v)),
    h("div", { class: "stack", style: "gap:6px" }, h("label", { class: "small", for: "exdate2" }, "Ngày thi (ngày/tháng/năm, để trống nếu chưa có)"),
      h("div", { class: "row" }, dIn, h("button", { class: "btn btn-primary", type: "button", onclick: saveDate }, "Lưu ngày thi"), P.examDate ? h("button", { class: "btn btn-quiet", type: "button", onclick: () => apply(() => P.examDate = null) }, "Xoá") : null), dMsg));
}
function planCard() {
  const PL = P.plan, t = today();
  const out = h("div", { class: "stack" });
  const btn = aiBtn(PL ? "Lập lại kế hoạch" : "Claude lập kế hoạch 7 ngày", async () => {
    out.replaceChildren(h("p", { class: "small muted" }, "Claude đang xếp lịch…"));
    const sb = skillBands(), next = LESSONS.filter(l => !P.lessons[l.id]?.done).slice(0, 6).map(l => `lesson-${l.id}: ${l.title}`);
    try {
      const r = await ai(`Lập kế hoạch học IELTS đủ 4 kỹ năng (Listening, Reading, Writing, Speaking, kèm phát âm IPA) cho 7 ngày bắt đầu từ ${t} cho một sinh viên Việt Nam. Mỗi ngày khoảng ${P.minutesPerDay || 20} phút.
Dữ liệu: mục tiêu band ${P.target}; ${P.examDate ? "ngày thi " + P.examDate : "chưa có ngày thi"}; band ước tính Listening ${sb.listening ?? "chưa có"}, Reading ${sb.reading ?? "chưa có"}, Writing ${sb.writing ?? "chưa có"}, Speaking ${sb.speaking ?? "chưa có"}; ${sk4Brief()}; lỗi hay gặp: ${Object.entries(P.errors || {}).sort((a, b) => b[1].n - a[1].n).slice(0, 4).map(([k, v]) => k + " " + v.n + " lần").join(", ") || "chưa có"}; từ vựng đến hạn ${VOCAB.filter(v => v.due <= t).length}; sổ lỗi đến hạn ${MIST.filter(m => m.due <= t).length}; bài ngữ pháp chưa học: ${next.join("; ") || "đã học hết"}.
Ưu tiên kỹ năng yếu nhất, mỗi ngày 2–3 việc, cộng phút đúng khoảng thời gian trên. Có 1 ngày nhẹ. Nếu còn dưới 14 ngày tới ngày thi thì thêm thi thử.
Mỗi việc có "link" là MỘT trong các giá trị: ${PLAN_LINKS.join(", ")}.
Chỉ trả lời JSON: {"focus":"1 câu tiếng Việt: trọng tâm tuần","days":[{"date":"YYYY-MM-DD","tasks":[{"what":"việc cụ thể bằng tiếng Việt","minutes":10,"link":"reading"}]}]}`, { json: true, cache: false });
      const days = (Array.isArray(r?.days) ? r.days : []).slice(0, 7).map((d, i) => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : addDays(t, i), tasks: (Array.isArray(d.tasks) ? d.tasks : []).slice(0, 4).map(x => ({ what: String(x.what || ""), minutes: Number(x.minutes) || 0, link: PLAN_LINKS.includes(x.link) ? x.link : "today" })) }));
      if (!days.length) throw { code: "invalid_json" };
      P.plan = { created: t, focus: String(r.focus || ""), days, done: {} }; saveProfile(); render();
    } catch (e) { out.replaceChildren(h("p", { class: "note bad small" }, aiMsg(e))); }
  }, PL ? "btn" : "btn btn-primary");
  const kids = [h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "Kế hoạch 7 ngày"), btn)];
  if (!PL) kids.push(h("p", { class: "small muted" }, `Claude xếp lịch theo ngày thi, kỹ năng yếu nhất, sổ lỗi và ${P.minutesPerDay || 20} phút mỗi ngày của bạn (đổi số phút ở phần Mục tiêu).`), aiNote());
  else {
    if (PL.focus) kids.push(h("p", { class: "note small" }, PL.focus));
    const dayNode = (d, di) => h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "eyebrow" }, new Date(d.date + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" }) + (d.date === t ? " · hôm nay" : "")),
      d.tasks.map((x, ti) => { const k = di + "-" + ti, ok = !!PL.done[k];
        return h("div", { class: "goal" }, h("button", { type: "button", class: "tick" + (ok ? " on" : ""), style: "cursor:pointer;background:" + (ok ? "var(--good)" : "transparent"), "aria-label": "Đánh dấu xong", onclick: () => { PL.done[k] = !ok; saveProfile(); render(); } }, ok ? "✓" : ""), h("a", { href: "#" + x.link, style: "color:var(--ink);text-decoration:none" }, x.what), h("span", { class: "small muted" }, x.minutes ? x.minutes + "′" : "")); }));
    const ti = PL.days.findIndex(d => d.date === t);
    if (ti >= 0) kids.push(dayNode(PL.days[ti], ti)); else kids.push(h("p", { class: "small muted" }, "Kế hoạch này không có ngày hôm nay. Bấm lập lại để có kế hoạch mới."));
    kids.push(h("details", null, h("summary", { class: "small" }, "Xem cả tuần"), h("div", { class: "stack", style: "gap:12px;margin-top:10px" }, PL.days.map((d, i) => i === ti ? null : dayNode(d, i)))));
  }
  kids.push(out);
  return h("section", { class: "card" }, kids);
}
