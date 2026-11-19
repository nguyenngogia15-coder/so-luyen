/* ===== Đồng bộ 4 kỹ năng cho web ngoài: band ước tính, Mục tiêu, Hôm nay, Lộ trình, phân tích cá nhân và lộ trình đề xuất ===== */
const SK4 = [["listening", "Listening", "#listen", "L"], ["reading", "Reading", "#reading", "R"], ["writing", "Writing", "#writing", "W"], ["speaking", "Speaking", "#speak", "S"]];
const SK4_ICO = { L: "M4 14v-2a8 8 0 0116 0v2M4 14h3v6H5a1 1 0 01-1-1zM20 14h-3v6h2a1 1 0 001-1z", S: "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3", R: "M3 5h7a3 3 0 013 3v12a2 2 0 00-2-2H3zM21 5h-7a3 3 0 00-3 3v12a2 2 0 012-2h8z", W: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4" };
const avgOf = a => a.reduce((s, x) => s + x, 0) / a.length;
/* Listening: đề đầy đủ gần nhất; chưa có thì quy từ các phần đã làm (ít nhất 2 phần) */
function lsBandEst() {
  const t = Object.values(P.lsTests || {}).filter(x => x.band != null).sort((a, b) => a.date < b.date ? -1 : 1).slice(-2);
  if (t.length) return roundBand(avgOf(t.map(x => x.band)));
  const s = Object.entries(P.ls || {}).filter(([id, v]) => id !== "dict" && v.score != null && LS_BANK.some(x => x.id === id)).map(([, v]) => v.last ?? v.score);
  return s.length >= 2 ? lsBand(Math.round(avgOf(s.slice(-6)) * 4)) : null;
}
function spBandEst() { loadSpeaks(); const s = SPEAKS.filter(x => x.result?.overall != null).slice(0, 2); return s.length ? roundBand(avgOf(s.map(x => x.result.overall))) : null; }
const _sb4 = skillBands;
skillBands = function () { const b = _sb4(); return { ...b, listening: lsBandEst(), speaking: spBandEst() }; };
const tgOf = k => +(P.skillTarget?.[k] ?? P.target);

/* ----- Điểm yếu từng kỹ năng (tính trên máy, không gọi AI) ----- */
function sk4Weak() {
  const out = { listening: [], reading: [], writing: [], speaking: [] };
  const nd = Object.entries(P.ndStat || {}).filter(([, s]) => s[0] >= 5 && s[1] / s[0] < 0.75).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0]);
  if (nd.length) out.listening.push({ t: `Số và đánh vần: ${ND_CAT[nd[0][0]][0]} mới đúng ${Math.round(nd[0][1][1] / nd[0][1][0] * 100)}%`, href: "#listen-nd" });
  const qt = Object.entries(P.lsQt || {}).filter(([, s]) => s[0] >= 8).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0])[0];
  if (qt && qt[1][1] / qt[1][0] < 0.75) { const L = { gap: ["Điền từ", "lp-limit"], mcq: ["Trắc nghiệm A/B/C", "lp-mcq"], match: ["Nối thông tin", "lp-match"] }[qt[0]]; if (L) out.listening.push({ t: `Dạng ${L[0]} mới đúng ${Math.round(qt[1][1] / qt[1][0] * 100)}%`, href: "#lp-" + L[1] }); }
  const lpN = LP_PATH.find(l => !lpDone(l)); if (lpN) out.listening.push({ t: `Lộ trình Nghe: ${LP_PATH.filter(lpDone).length}/${LP_PATH.length} bài`, href: "#lp-" + lpN.id });
  const lastW = [...WRIT].reverse().find(w => w.result?.criteria?.length);
  if (lastW) { const c = lastW.result.criteria.slice().sort((a, b) => a.band - b.band)[0]; out.writing.push({ t: `Tiêu chí thấp nhất bài gần nhất: ${c.name} (${c.band})`, href: "#writing" }); }
  const wl = WL.find(l => !P.lessons[l.id]?.done); if (wl) out.writing.push({ t: `Khóa Viết: còn ${WL.filter(l => !P.lessons[l.id]?.done).length} bài`, href: "#wl-" + wl.id });
  const gram = MIST.filter(m => isGramErr(m) && !m.res && mGL(m)), gg = {}; for (const m of gram) gg[mGL(m)] = (gg[mGL(m)] || 0) + 1;
  const gt = Object.entries(gg).sort((a, b) => b[1] - a[1])[0]; if (gt) out.writing.push({ t: `Lỗi ngữ pháp hay gặp: ${lessonById(gt[0]).title} (${gt[1]} lỗi)`, href: "#lesson-" + gt[0] });
  const rl = RL.find(l => !P.lessons[l.id]?.done); if (rl) out.reading.push({ t: `Khóa Đọc: ${RL.filter(l => P.lessons[l.id]?.done).length}/${RL.length} bài`, href: "#rl-" + rl.id });
  const rA = READS.flatMap(r => r.attempts || []).slice(-5); if (rA.length) out.reading.push({ t: `5 bài gần nhất đúng ${Math.round(rA.reduce((a, x) => a + x.score, 0) / Math.max(1, rA.reduce((a, x) => a + x.total, 0)) * 100)}% số câu`, href: "#reading" });
  const sp = SPEAKS.find(x => x.result?.criteria?.length); if (sp) { const c = sp.result.criteria.slice().sort((a, b) => a.band - b.band)[0]; out.speaking.push({ t: `Tiêu chí thấp nhất lần thi gần nhất: ${c.name} (${c.band})`, href: "#speak" }); }
  const weak = Object.entries(P.pron || {}).filter(([, v]) => v[0] >= 8 && v[1] / v[0] > 0.3).sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0]).slice(0, 3);
  if (weak.length) { const les = PR_LESSONS.find(l => l.ph.includes(weak[0][0])); out.speaking.push({ t: "Âm hay sai: " + weak.map(([b, v]) => `/${phIpa(b)}/ ${Math.round(v[1] / v[0] * 100)}%`).join(", "), href: les ? "#pr-" + les.id : "#ipa" }); }
  const prN = PR_LESSONS.find(l => !prDone(l)); if (prN) out.speaking.push({ t: `Lộ trình phát âm: ${PR_LESSONS.filter(prDone).length}/${PR_LESSONS.length} bài`, href: "#pr-" + prN.id });
  if (P.shStat?.n) out.speaking.push({ t: `Shadowing: ${P.shStat.n} câu, trung bình ${P.shStat.avg}/100`, href: "#speak-shadow" });
  return out;
}
function sk4Brief() { const w = sk4Weak(); return "điểm yếu: " + SK4.map(([k, n]) => n + ": " + (w[k].map(x => x.t).join("; ") || "chưa có dữ liệu")).join(" | "); }
/* Lộ trình đề xuất: kỹ năng xa mục tiêu nhất (hoặc chưa có điểm) đi trước */
function sk4Next(sb) {
  const gap = k => sb[k] == null ? 9 : tgOf(k) - sb[k], order = SK4.slice().sort((a, b) => gap(b[0]) - gap(a[0])), out = [];
  for (const [k, name, href] of order) {
    if (sb[k] == null) { out.push({ k, t: { listening: "Làm 1 đề Listening đầy đủ để biết band hiện tại", reading: "Làm 1 bài Reading ở chế độ thi", writing: "Viết 1 bài Task 2 để được chấm", speaking: "Vào phòng thi Speaking để có band đầu tiên" }[k], href: { listening: "#listen", reading: "#reading", writing: "#writing", speaking: "#speak-room" }[k] }); continue; }
    const w = sk4Weak()[k][0]; if (gap(k) > 0 && w) out.push({ k, t: `${name} (${sb[k].toFixed(1)} → ${tgOf(k).toFixed(1)}): ${w.t}`, href: w.href });
  }
  return out.slice(0, 5);
}
function sk4Card(opt = {}) {
  loadSpeaks();
  const sb = skillBands(), w = sk4Weak(), nx = sk4Next(sb), have = SK4.filter(([k]) => sb[k] != null);
  const ov = have.length === 4 ? roundBand(avgOf(SK4.map(([k]) => sb[k]))) : null;
  return h("section", { class: "card stack sk4", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline" }, h("h2", null, "Phân tích 4 kỹ năng"), h("span", { class: "small muted" }, ov != null ? `Band tổng ước tính ${ov.toFixed(1)} / mục tiêu ${(+P.target).toFixed(1)}` : `Đã có điểm ${have.length}/4 kỹ năng`)),
    h("div", { class: "sk4-grid" }, SK4.map(([k, name, href, K]) => h("div", { class: "sk4-row" },
      h("a", { class: "sk4-h", href }, h("span", { class: "pl-ic " + K, html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SK4_ICO[K]}"/></svg>` }), h("b", null, name), h("span", { class: "sk4-b" }, sb[k] == null ? "–" : sb[k].toFixed(1), h("small", null, " / " + tgOf(k).toFixed(1)))),
      h("div", { class: "pl-bar" }, h("i", { style: `width:${sb[k] == null ? 0 : Math.min(100, sb[k] / tgOf(k) * 100)}%` })),
      w[k].length ? h("ul", { class: "sk4-w" }, w[k].slice(0, opt.full ? 4 : 2).map(x => h("li", null, h("a", { href: x.href }, x.t)))) : h("span", { class: "small muted" }, "Chưa có dữ liệu, làm vài bài để web phân tích.")))),
    nx.length ? h("div", { class: "stack", style: "gap:6px" }, h("h3", null, "Lộ trình đề xuất (ưu tiên kỹ năng xa mục tiêu nhất)"), h("ol", { class: "sk4-next" }, nx.map(x => h("li", null, h("a", { href: x.href }, x.t))))) : null,
    h("p", { class: "small muted", style: "margin:0" }, "Tính ngay trên máy từ bài bạn đã làm, không tốn lượt AI. Band là ước tính để định hướng, không phải điểm thi."));
}
/* ----- Hôm nay: thêm Nghe và Nói/Phát âm, giữ cố định trong ngày ----- */
PLAN_LINKS.push("listen", "speak", "listen-nd", "speak-shadow", "speak-room", "quota", ...LP_PATH.map(l => "lp-" + l.id), ...PR_LESSONS.map(l => "pr-" + l.id), ...SP_PATH.map(l => "sl-" + l.id));
function today4(t) {
  if (P.day4?.date === t) return P.day4;
  const odd = new Date(t + "T00:00:00").getDate() % 2 === 1, lp = LP_PATH.find(l => !lpDone(l)), pr = PR_LESSONS.find(l => !prDone(l)), sl = SP_PATH.find(l => !splSt(l.id).done);
  const ndWeak = Object.entries(P.ndStat || {}).some(([, s]) => s[0] >= 5 && s[1] / s[0] < 0.75), sec = LS_BANK.slice().sort((a, b) => ((P.ls || {})[a.id]?.n || 0) - ((P.ls || {})[b.id]?.n || 0) || a.test - b.test)[0];
  const l = lp ? { k: "lp", id: lp.id } : ndWeak && odd ? { k: "nd" } : { k: "sec", id: sec.id };
  const s = pr && (odd || !sl) ? { k: "pr", id: pr.id } : sl ? { k: "sl", id: sl.id } : { k: "sh" };
  P.day4 = { date: t, l, s }; saveProfile(); return P.day4;
}
const _ti4 = todayItems;
todayItems = function (t, lg) {
  const items = _ti4(t, lg), D = today4(t), odd = new Date(t + "T00:00:00").getDate() % 2 === 1;
  let L = null, S = null;
  if (D.l.k === "lp") { const l = LP_PATH.find(x => x.id === D.l.id); L = { title: `Bài ${LP_PATH.indexOf(l) + 1}/${LP_PATH.length}: ${l.t}`, sub: "Hiểu kỹ năng nghe rồi làm bài ngắn, máy chấm · khoảng 15 phút", href: "#lp-" + l.id, ok: (P.lp || {})[l.id]?.done === t }; }
  else if (D.l.k === "nd") L = { title: "Luyện số, ngày giờ và đánh vần", sub: "Một lượt 10 câu nghe ngắn, ưu tiên dạng bạn hay sai · khoảng 8 phút", href: "#listen-nd", ok: P.ndDay === t };
  else { const s = LS_BANK.find(x => x.id === D.l.id); L = { title: `Đề ${s.test} · Section ${s.sec}: ${s.title}`, sub: "Nghe và làm 10 câu, xong mở lời thoại xem lại câu sai · khoảng 12 phút", href: "#ls-" + s.id, ok: (P.ls || {})[s.id]?.date === t }; }
  if (D.s.k === "pr") { const l = PR_LESSONS.find(x => x.id === D.s.id); S = { tag: "Phát âm", title: `Bài ${PR_LESSONS.indexOf(l) + 1}/${PR_LESSONS.length}: ${l.t}`, sub: "Nghe chọn, đọc từng từ rồi đọc câu, máy chấm từng âm · khoảng 15 phút", href: "#pr-" + l.id, ok: (P.pr || {})[l.id]?.done === t }; }
  else if (D.s.k === "sl") { const l = SP_PATH.find(x => x.id === D.s.id); S = { tag: "Nói", title: `Bài ${SP_PATH.indexOf(l) + 1}/${SP_PATH.length}: ${l.t}`, sub: "Học khung trả lời rồi nói, máy đo độ trôi chảy và phát âm · khoảng 15 phút", href: "#sl-" + l.id, ok: splSt(l.id).done === t }; }
  else S = { tag: "Nói", title: "Shadowing 8 câu", sub: "Nghe từng câu rồi nói lại, máy chấm âm, nhịp và tốc độ · khoảng 10 phút", href: "#speak-shadow", ok: (P.shDay?.[t] || 0) >= 8 };
  if (!P.dayLight || odd) items.push({ tag: "Nghe", min: 15, doneSub: "Đã xong hôm nay", ...L });
  if (!P.dayLight || !odd) items.push({ min: 15, doneSub: "Đã xong hôm nay", ...S });
  return items;
};
const _pt4 = pageToday;
pageToday = function () {
  const n = _pt4(), more = n.querySelector(".today-more");
  if (more) more.before(sk4Card());
  const lp = n.querySelector(".today-head + section .row .small.muted:not(.plan *)");
  n.querySelectorAll("span.small.muted").forEach(el => { if (/Chế độ gọn: Đọc và Viết luân phiên|Chế độ đủ: mỗi ngày có cả Ngữ pháp, Đọc và Viết/.test(el.textContent)) el.textContent = P.dayLight ? "Chế độ gọn: ngày lẻ Đọc + Nghe, ngày chẵn Viết + Nói." : "Chế độ đủ: mỗi ngày có Từ vựng, Ngữ pháp, Đọc, Viết, Nghe và Nói."; });
  return n;
};
const _wr4 = weekReport;
weekReport = function () {
  const t = today(), wid = weekOf(t), end = addDays(wid, 6), sb = skillBands(), f = x => x == null ? "chưa có" : x.toFixed(1);
  const sp = SPEAKS.filter(x => { const d = new Date(x.created).toLocaleDateString("en-CA"); return d >= wid && d <= end; });
  return _wr4().replace(/• Band ước tính:[^\n]*/, m => `• Band ước tính: Listening ${f(sb.listening)}, Reading ${f(sb.reading)}, Writing ${f(sb.writing)}, Speaking ${f(sb.speaking)}` + (m.includes(" · mục tiêu") ? m.slice(m.indexOf(" · mục tiêu")) : ""))
    + `\n• Speaking: ${sp.length} lần thi` + (sp.length ? `, band gần nhất ${sp[0].result.overall.toFixed(1)}` : "") + `; phát âm: ${PR_LESSONS.filter(prDone).length}/${PR_LESSONS.length} bài` + `\n• Listening: lộ trình ${LP_PATH.filter(lpDone).length}/${LP_PATH.length} bài, ${Object.keys(P.lsTests || {}).length} đề đầy đủ đã làm`;
};
/* ----- Lộ trình: bảng 4 kỹ năng, biểu đồ và lịch sử có cả Nghe, Nói ----- */
const _ph4 = planHistory;
planHistory = function () {
  const out = _ph4();
  for (const [t, r] of Object.entries(P.lsTests || {})) out.push({ k: "L", badge: "Listening", t: Date.parse(r.date + "T12:00:00"), date: r.date, title: "Đề Listening " + t, band: r.band, sub: `${r.raw}/40 câu đúng · đề đầy đủ`, act: "Làm lại", go: () => goRoute("#lt-" + t) });
  for (const s of SPEAKS) if (s.result?.overall != null) { const d = new Date(s.created).toLocaleDateString("en-CA"); out.push({ k: "S", badge: "Speaking", t: s.created, date: d, title: { full: "Thi thử đầy đủ", room: "Phòng thi Speaking", p1: "Speaking Part 1", p2: "Speaking Part 2", p3: "Speaking Part 3" }[s.kind] || "Speaking", band: s.result.overall, sub: s.result.criteria.map(c => c.name.split(" ")[0] + " " + c.band).join(" · "), act: "Xem kết quả", go: () => goRoute("#speak", () => { UI.spTab = "hist"; UI.spView = s.id; }) }); }
  return out.sort((a, b) => a.t - b.t);
};
planChart = function (hist) {
  const pts = hist.filter(x => x.k !== "M" && x.band != null);
  if (pts.length < 2) return null;
  const W = 760, H = 300, m = { l: 40, r: 18, t: 34, b: 40 }, n = pts.length, tgt = +P.target;
  const vals = [...pts.map(p => p.band), tgt]; let lo = Math.max(0, Math.floor(Math.min(...vals)) - 1), hi = Math.min(9, Math.ceil(Math.max(...vals)) + 1); if (hi - lo < 3) { lo = Math.max(0, hi - 3); hi = lo + 3; }
  const X = i => m.l + (W - m.l - m.r) * (i / (n - 1)), Y = b => H - m.b - (H - m.t - m.b) * (b - lo) / (hi - lo);
  let s = "";
  for (let b = lo; b <= hi; b++) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(b)}" y2="${Y(b)}" style="stroke:var(--line)"/><text x="${m.l - 8}" y="${Y(b) + 4}" text-anchor="end" font-size="12" style="fill:var(--muted)">${b}</text>`;
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(tgt)}" y2="${Y(tgt)}" style="stroke:var(--coral)" stroke-width="2" stroke-dasharray="6 5"/><text x="${W - m.r}" y="${Y(tgt) - 7}" text-anchor="end" font-size="12" font-weight="700" style="fill:var(--coral-ink)">Mục tiêu ${tgt.toFixed(1)}</text>`;
  const step = Math.max(1, Math.ceil(n / 6)), lab = new Set(); for (let i = 0; i < n; i += step) lab.add(i); lab.add(n - 1);
  lab.forEach(i => { const [, mo, d] = pts[i].date.split("-"); s += `<text x="${X(i)}" y="${H - m.b + 22}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${d}/${mo}</text>`; });
  const NAME = { L: "Listening", R: "Reading", W: "Writing", S: "Speaking" };
  for (const [k, col] of [["L", "var(--s1)"], ["R", "var(--s3)"], ["W", "var(--s2)"], ["S", "var(--s5)"]]) {
    const ser = pts.map((p, i) => [p, i]).filter(([p]) => p.k === k); if (!ser.length) continue;
    s += `<path d="${ser.map(([p, i], j) => (j ? "L" : "M") + X(i).toFixed(1) + "," + Y(p.band).toFixed(1)).join("")}" fill="none" style="stroke:${col}" stroke-width="3" stroke-linejoin="round"/>`;
    ser.forEach(([p, i], j) => { s += `<rect x="${X(i) - 5}" y="${Y(p.band) - 5}" width="10" height="10" style="fill:${j === ser.length - 1 ? col : "var(--surface)"};stroke:${col}" stroke-width="2.5"><title>${esc(p.date.split("-").reverse().join("/") + " · " + NAME[k] + " " + p.band.toFixed(1) + " · " + p.title)}</title></rect>`; });
    const [lp, li] = ser[ser.length - 1]; s += `<text x="${X(li)}" y="${Y(lp.band) - 12}" text-anchor="${li === n - 1 ? "end" : "middle"}" font-size="13" font-weight="800" style="fill:${col}">${lp.band.toFixed(1)}</text>`;
  }
  return h("div", { class: "pl-chart", html: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Band 4 kỹ năng qua các lần làm bài">${s}</svg>` });
};
const _pp4 = pagePlan;
pagePlan = function () {
  const n = _pp4(), sb = skillBands(), hist = planHistory();
  const board = n.querySelector(".pl-board");
  if (board) {
    const have = SK4.filter(([k]) => sb[k] != null), ov = have.length === 4 ? roundBand(avgOf(SK4.map(([k]) => sb[k]))) : null;
    const nOf = K => hist.filter(x => x.k === K).length;
    const note = { listening: sb.listening == null ? "Chưa làm đề hay phần nghe nào" : Object.keys(P.lsTests || {}).length ? "Từ đề đầy đủ gần nhất" : "Quy từ các phần đã làm", reading: sb.reading == null ? "Chưa làm bài đọc nào" : `Ước tính từ ${Math.min(5, nOf("R")) || 1} bài gần nhất`, writing: sb.writing == null ? "Chưa có bài viết nào được chấm" : "Task 2 tính gấp đôi Task 1", speaking: sb.speaking == null ? "Chưa có lần thi Speaking nào" : "Trung bình 2 lần thi gần nhất" };
    const cell = ([k, name, href, K]) => h("a", { class: "pl-cell", href }, h("span", { class: "pl-ch" }, h("span", { class: "pl-ic " + K, html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SK4_ICO[K]}"/></svg>` }), h("b", null, name)),
      h("span", { class: "pl-big" }, sb[k] == null ? "–" : sb[k].toFixed(1), h("small", null, " / " + tgOf(k).toFixed(1))), h("div", { class: "pl-bar" }, h("i", { style: `width:${sb[k] == null ? 0 : Math.min(100, sb[k] / tgOf(k) * 100)}%` })), h("span", { class: "small muted" }, note[k]));
    board.replaceWith(h("div", { class: "pl-board b4" },
      h("div", { class: "pl-now" }, h("div", { class: "pl-nt" }, h("div", null, h("span", { class: "pl-lab" }, "Hiện tại"), h("span", { class: "pl-huge" }, ov == null ? "–" : ov.toFixed(1))), h("span", { class: "pl-arrow", "aria-hidden": "true" }, "→"), h("div", null, h("span", { class: "pl-lab coral" }, "Mục tiêu"), h("span", { class: "pl-huge coral" }, (+P.target).toFixed(1)))),
        h("span", { class: "small muted" }, ov == null ? `Band tổng có khi đủ 4 kỹ năng (đang có ${have.length}/4).` : "Trung bình 4 kỹ năng, làm tròn như bài thi thật.")),
      ...SK4.map(cell)));
  }
  const leg = n.querySelector(".pl-leg"); if (leg) leg.replaceChildren(...[["var(--s1)", "Listening"], ["var(--s3)", "Reading"], ["var(--s2)", "Writing"], ["var(--s5)", "Speaking"]].map(([c, t]) => h("span", null, h("i", { style: "background:" + c }), t)), h("span", null, h("i", { class: "dash" }), "Mục tiêu"));
  const trs = n.querySelector(".pl-trs"); if (trs) for (const [K, name] of [["L", "Listening"], ["S", "Speaking"]]) { const tr = planTrend(hist, K); trs.append(h("div", { class: "pl-tr" }, h("span", { class: "pl-trk" }, name), tr ? [h("b", null, tr.a1.toFixed(1)), h("span", { class: "small muted" }, ` trung bình ${Math.min(5, tr.n)} bài gần nhất · ${tr.n} bài`)] : h("span", { class: "small muted" }, "chưa có bài"))); }
  n.querySelectorAll(".empty span").forEach(el => { if (/Cần ít nhất 2 bài Reading hoặc Writing/.test(el.textContent)) el.textContent = "Cần ít nhất 2 bài đã chấm (Nghe, Đọc, Viết hoặc Nói) để vẽ đường tiến bộ."; });
  n.querySelectorAll("p.small.muted").forEach(el => { if (/^Mỗi điểm là một lần làm bài\./.test(el.textContent)) el.textContent = "Mỗi điểm là một lần làm bài. Listening và Reading quy đổi từ số câu đúng theo bảng điểm thô tham khảo; Writing và Speaking do AI chấm. Di chuột vào điểm để xem tên bài."; });
  n.querySelectorAll(".ph-k").forEach(el => { if (el.textContent === "Listening") el.classList.add("L"); if (el.textContent === "Speaking") el.classList.add("S"); });
  const place = n.querySelector(".pl-board"); if (place) place.after(sk4Card({ full: true }));
  return n;
};
/* Lối tắt từ Hôm nay / Lộ trình vào đúng thẻ */
(function () {
  const AL4 = { "listen-nd": () => { UI.lsTab = "nd"; return "#listen"; }, "speak-shadow": () => { UI.spTab = "shadow"; return "#speak"; }, "speak-room": () => { UI.spTab = "test"; if (!UI.room) roomNew(); return "#speak"; } };
  const _or = onRoute;
  onRoute = function () { const raw = (location.hash || "").slice(1); if (AL4[raw]) { const to = AL4[raw](); location.replace(to); if (UI.route === to.slice(1)) render(); else _or(); return; } return _or(); };
  window.addEventListener("hashchange", () => { const raw = (location.hash || "").slice(1); if (AL4[raw]) onRoute(); });
})();
