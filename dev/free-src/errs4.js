/* ===== Sổ lỗi 4 kỹ năng: ngoài lỗi viết và câu Reading sai (sổ lỗi cũ), gom thêm từ nghe sót khi nghe chép,
   số và đánh vần nghe sai, các âm hay đọc sai khi chấm phát âm, từ vựng hay sai; rồi ra "bài luyện hôm nay" từ đúng các lỗi đó ===== */
const e4 = () => { const e = P.e4 ||= {}; e.ls ||= []; e.nd ||= []; e.ph ||= {}; return e; };
function e4Listen(sent, missed, key, pct) {
  const E = e4(), i = E.ls.findIndex(x => x.k === key);
  if (pct >= 100) { if (i >= 0) { E.ls.splice(i, 1); saveProfile(); } return; }
  const it = { k: key, x: sent, miss: missed.slice(0, 12), at: Date.now() };
  if (i >= 0) E.ls[i] = { ...it, n: (E.ls[i].n || 1) + 1 }; else E.ls.push({ ...it, n: 1 });
  if (E.ls.length > 150) E.ls.splice(0, E.ls.length - 150);
}
function e4Nd(it, typed) {
  const E = e4(); E.nd = E.nd.filter(x => x.id !== it.id); E.nd.push({ id: it.id, c: it.c, a: it.a, typed: String(typed || "").slice(0, 40), at: Date.now() });
  if (E.nd.length > 80) E.nd.splice(0, E.nd.length - 80);
}
/* Âm: thống kê có phai dần (lần chấm mới nặng hơn lần cũ), giữ vài từ bạn hay đọc sai âm đó */
function e4Phones(r) {
  if (!r?.words) return; const E = e4();
  for (const w of r.words) for (const p of w.phones || []) {
    if (!p.p) continue; const s = E.ph[p.p] ||= { n: 0, bad: 0, w: [] };
    s.n = s.n * 0.97 + 1; const bad = p.miss || p.s < 60; s.bad = s.bad * 0.97 + (bad ? 1 : 0);
    if (bad && w.w && !s.w.includes(w.w.toLowerCase())) { s.w.unshift(w.w.toLowerCase()); s.w = s.w.slice(0, 8); }
  }
  saveProfile();
}
function e4WeakPhones() {
  return Object.entries(e4().ph).filter(([, s]) => s.n >= 2.5).map(([p, s]) => ({ p, rate: s.bad / s.n, n: s.n, w: s.w })).filter(x => x.rate >= 0.25).sort((a, b) => b.rate - a.rate);
}
const e4Lesson = p => typeof PR_LESSONS !== "undefined" ? PR_LESSONS.find(l => String(l.ph || "").split(",").includes(p)) : null;
const e4Ipa = p => { try { return "/" + phIpa(p) + "/"; } catch { return p; } };
/* Bài luyện hôm nay: mỗi kỹ năng một việc nhỏ nhắm đúng lỗi */
function e4Plan() {
  const E = e4(), out = [], wp = e4WeakPhones()[0], ls = E.ls.slice().sort((a, b) => (b.n || 1) - (a.n || 1))[0], vr = typeof vrRevDue === "function" ? vrRevDue().length : 0;
  const gram = (typeof MIST !== "undefined" ? MIST : []).filter(m => isGramErr(m) && !m.res && mGL(m)), gc = {}; for (const m of gram) gc[mGL(m)] = (gc[mGL(m)] || 0) + 1;
  const gTop = Object.entries(gc).sort((a, b) => b[1] - a[1])[0];
  const ndBad = Object.entries(P.ndStat || {}).filter(([, s]) => s[0] >= 5).map(([c, s]) => [c, s[1] / s[0]]).sort((a, b) => a[1] - b[1])[0];
  if (wp) { const l = e4Lesson(wp.p); out.push({ sk: "Nói", t: `Luyện âm ${e4Ipa(wp.p)}: bạn đọc sai ${Math.round(wp.rate * 100)}% số lần`, sub: wp.w.length ? "Hay sai trong: " + wp.w.slice(0, 5).join(", ") : "", href: l ? "#pr-" + l.id : "#ipa" }); }
  if (ls) out.push({ sk: "Nghe", t: `Nghe chép lại câu bạn sót ${ls.miss.length} từ`, sub: "Sót: " + ls.miss.slice(0, 6).join(", "), go: () => e4Redo(ls) });
  if (ndBad && ndBad[1] < 0.8) out.push({ sk: "Nghe", t: `Số và đánh vần: phần ${ND_CAT[ndBad[0]]?.[0] || ndBad[0]} mới đúng ${Math.round(ndBad[1] * 100)}%`, sub: "Luyện 10 câu đúng loại này", go: () => { (UI.nd ||= {}).cat = ndBad[0]; UI.nd.round = null; UI.nd.done = false; UI.nd.ans = {}; UI.lsTab = "nd"; location.hash = "#listen"; } });
  if (gTop) { const l = lessonById(gTop[0]); if (l) out.push({ sk: "Viết", t: `Xem lại bài ngữ pháp: ${l.title}`, sub: `${gTop[1]} lỗi trong bài viết của bạn thuộc bài này`, href: "#lesson-" + l.id }); }
  if (vr) out.push({ sk: "Từ vựng", t: `Ôn ${vr} từ hay sai trong Lộ trình từ vựng`, sub: "Đúng thì giãn lịch, sai thì gặp lại ngày mai", go: () => { UI.vTab = "road"; (UI.vr ||= { mode: "topic" }).view = { k: "rev" }; location.hash = "#vocab"; } });
  return out;
}
function e4Redo(it) {
  const [id, i] = String(it.k).split(":"); UI.lsD = { ...(UI.lsD || {}), id, i: +i || 0, typed: "", res: null }; UI.lsTab = "dict"; location.hash = "#listen";
}
function e4Card() {
  const E = e4(), plan = e4Plan(), wps = e4WeakPhones(), read = (typeof MIST !== "undefined" ? MIST : []).filter(m => !isGramErr(m)).length, gram = (typeof MIST !== "undefined" ? MIST : []).filter(m => isGramErr(m) && !m.res).length;
  const missW = {}; for (const x of E.ls) for (const w of x.miss) { const k = w.toLowerCase().replace(/[^a-z0-9']/g, ""); if (k) missW[k] = (missW[k] || 0) + 1; }
  const topMiss = Object.entries(missW).sort((a, b) => b[1] - a[1]).slice(0, 14);
  return h("div", { class: "stack", style: "gap:16px" },
    h("div", { class: "e4-grid" }, [["Viết", gram, "lỗi ngữ pháp chưa xử lý"], ["Đọc", read, "câu Reading làm sai"], ["Nghe", E.ls.length + E.nd.length, "câu nghe sót, số và chữ nghe sai"], ["Nói", wps.length, "âm hay đọc sai"]].map(([k, n, t]) => h("div", { class: "stat" }, h("b", null, n), h("span", null, k + ": " + t)))),
    h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Bài luyện hôm nay từ lỗi của bạn"),
      plan.length ? h("div", { class: "plan" }, plan.map(x => h("a", { href: x.href || "#errors", onclick: x.go ? e => { e.preventDefault(); x.go(); } : null }, h("span", { class: "tick" }, ""), h("span", { class: "stack", style: "gap:0" }, h("span", { class: "ptitle" }, h("span", { class: "ptag" }, x.sk), x.t), x.sub ? h("span", { class: "small muted" }, x.sub) : null), h("span", { class: "muted", "aria-hidden": "true" }, "›"))))
        : h("p", { class: "empty" }, "Chưa đủ dữ liệu. Làm nghe chép, bài phát âm, số và đánh vần, bài viết, web sẽ gom lỗi và ra bài luyện ở đây.")),
    wps.length ? h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Âm bạn hay đọc sai"),
      h("div", { class: "e4-ph" }, wps.slice(0, 8).map(x => { const l = e4Lesson(x.p); return h("a", { class: "e4-p", href: l ? "#pr-" + l.id : "#ipa" }, h("b", null, e4Ipa(x.p)), h("span", { class: "small" }, `sai ${Math.round(x.rate * 100)}%`), h("span", { class: "small muted" }, x.w.slice(0, 3).join(", ") || " "), h("span", { class: "small" }, l ? "Học bài này ›" : "Xem bảng IPA ›")); })),
      h("p", { class: "small muted", style: "margin:0" }, "Tính từ mọi lần chấm phát âm (bài phát âm, luyện nói, phòng thi, shadowing). Lần gần đây được tính nặng hơn, nên sửa được là âm tự rời danh sách.")) : null,
    E.ls.length ? h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, `Câu nghe chép còn sót (${E.ls.length})`),
      topMiss.length ? h("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, h("span", { class: "small muted" }, "Từ hay sót:"), topMiss.map(([w, n]) => h("span", { class: "chip warn" }, w + (n > 1 ? " ×" + n : "")))) : null,
      h("div", { class: "stack", style: "gap:0" }, E.ls.slice().reverse().slice(0, 12).map(x => h("div", { class: "errline" }, h("span", null, x.x), h("span", { class: "small bad-t" }, "Sót: " + x.miss.join(", ")), h("button", { class: "btn btn-quiet small", type: "button", style: "align-self:flex-start", onclick: () => e4Redo(x) }, "Nghe chép lại ›")))),
      h("p", { class: "small muted", style: "margin:0" }, "Chép lại đúng hết thì câu tự rời danh sách.")) : null,
    E.nd.length ? h("section", { class: "card stack", style: "gap:8px" }, h("h2", { style: "margin:0" }, `Số và đánh vần nghe sai (${E.nd.length})`),
      h("div", { class: "stack", style: "gap:0" }, E.nd.slice().reverse().slice(0, 10).map(x => h("div", { class: "errline" }, h("span", { class: "small muted" }, ND_CAT[x.c]?.[0] || x.c), h("span", { class: "bad-t" }, x.typed || "(bỏ trống)"), h("span", { class: "good-t" }, x.a))))) : null);
}
(function () {
  const _sc = spCheckText; spCheckText = async function () { const r = await _sc.apply(this, arguments); try { e4Phones(r); } catch {} return r; };
  if (typeof spAnalyze === "function") { const _sa = spAnalyze; spAnalyze = async function () { const r = await _sa.apply(this, arguments); try { e4Phones(r?.pron || r); } catch {} return r; }; }
  const _pm = pageMistakes;
  pageMistakes = function () {
    const n = _pm(); if (UI.mReview) return n;
    const ban = n.querySelector(".page-banner"); if (ban) { ban.querySelector("h1").textContent = "Sổ lỗi 4 kỹ năng"; const p = ban.querySelector("p"); if (p) p.textContent = "Gom lỗi từ bài viết, câu Reading sai, câu nghe chép còn sót, số và đánh vần nghe sai, các âm hay đọc sai. Mỗi ngày web ra vài bài luyện nhắm đúng các lỗi đó."; }
    n.querySelector(":scope > .stats")?.remove(); const E = e4(); if (E.ls.length || E.nd.length || Object.keys(E.ph).length) n.querySelector(":scope > p.empty")?.remove();
    (ban || n.firstElementChild).after(e4Card()); return n;
  };
  const _pt = pageToday;
  pageToday = function () {
    const n = _pt(), plan = e4Plan(); if (!plan.length) return n;
    const box = h("a", { class: "card row e4-today", href: "#errors", style: "justify-content:space-between;align-items:center;text-decoration:none;color:inherit;gap:10px" }, h("div", { class: "stack", style: "gap:2px" }, h("b", null, `Sổ lỗi: ${plan.length} bài luyện nhắm đúng lỗi của bạn`), h("span", { class: "small muted" }, plan.slice(0, 2).map(x => x.t).join(" · "))), h("span", { class: "btn" }, "Mở ›"));
    const after = n.querySelector(".push-card") || n.querySelector(".dq-card"); after ? after.after(box) : n.append(box); return n;
  };
  document.head.append(h("style", null, `.e4-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}@media (max-width:700px){.e4-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.e4-ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.e4-p{border:2px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px;text-decoration:none;color:inherit}.e4-p b{font-size:1.4rem}`));
})();
