/* ===== Thi thử 4 kỹ năng mỗi tháng: lấy kết quả thi thật trong tháng (đề Listening đầy đủ, Reading chế độ thi,
   Writing tính giờ hoặc đề đầy đủ, phòng thi Speaking), ra band tổng, vẽ đường tiến bộ theo tháng của cả nhóm ===== */
const MM_SK = [["L", "Listening", "#listen", "Làm 1 đề Listening đầy đủ (40 câu)"], ["R", "Reading", "#mock", "Reading 3 bài trong 60 phút (mục Thi thử)"], ["W", "Writing", "#mock", "Task 1 và Task 2 trong 60 phút (mục Thi thử)"], ["S", "Speaking", "#speak-room", "Vào phòng thi Speaking đủ 3 phần"]];
const mmMonth = (d = today()) => d.slice(0, 7);
const mmName = m => "tháng " + +m.slice(5) + "/" + m.slice(0, 4);
function mmOf(month) {
  const hist = planHistory().filter(x => (x.date || "").startsWith(month)), last = a => a.sort((x, y) => x.t - y.t).slice(-1)[0] || null;
  const inM = ts => new Date(ts).toLocaleDateString("en-CA").startsWith(month);
  const mk = k => (MOCKS || []).filter(m => inM(m.created) && m[k]?.band != null).map(m => ({ band: m[k].band, t: m.created }));
  const pick = {
    L: last(hist.filter(x => x.k === "L")),
    R: last([...hist.filter(x => x.k === "R" && /thi thử/.test(x.sub || "")), ...mk("read")]),
    W: last([...hist.filter(x => x.k === "W" && /thi thật/.test(x.sub || "")), ...mk("write")]),
    S: last(hist.filter(x => x.k === "S" && /Thi thử đầy đủ|Phòng thi/.test(x.title || "")))
  };
  const b = {}; for (const k of ["L", "R", "W", "S"]) b[k] = pick[k]?.band ?? null;
  const have = Object.values(b).filter(v => v != null);
  b.n = have.length; b.ov = have.length === 4 ? roundBand(have.reduce((s, v) => s + v, 0) / 4) : null;
  return b;
}
/* Lưu kết quả các tháng (để vẽ và gửi cho nhóm), thưởng khi lần đầu thi đủ 4 kỹ năng trong tháng */
function mmSync() {
  const m = mmMonth(), b = mmOf(m), mm = P.mm ||= {}, old = JSON.stringify(mm[m] || {});
  mm[m] = b; if (JSON.stringify(b) === old) return b;
  if (b.n === 4 && !mm[m].paid) { mm[m].paid = 1; award("mock", 150); const q = fq(); q.chest++; toast("Thi đủ 4 kỹ năng tháng này! +150 XP và 1 rương 🎁"); }
  for (const k of Object.keys(mm)) if (k < mmMonth(addDays(today(), -400))) delete mm[k];
  saveProfile(); return b;
}
function mmCard() {
  const m = mmMonth(), b = mmSync(), d = new Date(), left = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
  return h("section", { class: "card stack mm-card", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px" }, h("h2", { style: "margin:0" }, `Thi thử 4 kỹ năng · ${mmName(m)}`),
      h("b", { class: "mm-ov" }, b.ov != null ? `Band tổng ${b.ov.toFixed(1)}` : `${b.n}/4 kỹ năng`)),
    h("p", { class: "small muted", style: "margin:0" }, "Mỗi tháng thi đủ 4 phần như thi thật để thấy mình tiến bộ bao nhiêu. Web tự lấy kết quả thi trong tháng, không tính bài luyện tập." + (b.n < 4 ? ` Còn ${left} ngày trong tháng.` : "") + " Thi đủ được +150 XP và 1 rương."),
    h("div", { class: "mm-grid" }, MM_SK.map(([k, name, href, how]) => h("a", { class: "mm-t" + (b[k] != null ? " ok" : ""), href, onclick: k === "L" ? () => { UI.lsTab = "test"; } : null },
      h("span", { class: "small muted" }, name), h("b", null, b[k] != null ? b[k].toFixed(1) : "–"), h("span", { class: "small" }, b[k] != null ? "✓ Đã thi tháng này" : how)))),
    mmChart([{ name: "Bạn", mm: P.mm, me: true }]));
}
/* Đường band theo tháng: band tổng nếu đủ 4 kỹ năng (chấm đặc), chưa đủ thì trung bình các phần đã thi (chấm rỗng) */
function mmChart(people, months = 6) {
  const ms = []; let d = today(); for (let i = 0; i < months; i++) { ms.unshift(mmMonth(d)); d = addDays(d.slice(0, 7) + "-01", -1); }
  const val = x => x ? (x.ov != null ? [x.ov, 1] : (() => { const a = ["L", "R", "W", "S"].map(k => x[k]).filter(v => v != null); return a.length ? [a.reduce((s, v) => s + v, 0) / a.length, 0] : null; })()) : null;
  const series = people.map(p => ({ ...p, pts: ms.map(m => val(p.mm?.[m])) })).filter(s => s.pts.some(Boolean));
  if (!series.length) return h("p", { class: "small muted", style: "margin:0" }, "Chưa có tháng nào thi thử. Thi xong phần đầu tiên là đường tiến bộ bắt đầu hiện.");
  const all = series.flatMap(s => s.pts.filter(Boolean).map(v => v[0])); let lo = Math.max(0, Math.floor(Math.min(...all)) - 1), hi = Math.min(9, Math.ceil(Math.max(...all)) + 1); if (hi - lo < 3) hi = Math.min(9, lo + 3);
  const W = 640, H = 220, M = { l: 34, r: 14, t: 14, b: 30 }, X = i => M.l + (W - M.l - M.r) * i / (ms.length - 1), Y = v => H - M.b - (H - M.t - M.b) * (v - lo) / (hi - lo);
  const cols = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f08c00"];
  let s = ""; for (let v = lo; v <= hi; v++) s += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--line)"/><text x="${M.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" style="fill:var(--muted)">${v}</text>`;
  ms.forEach((m, i) => { s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="11" style="fill:var(--muted)">T${+m.slice(5)}</text>`; });
  series.forEach((p, j) => { const c = cols[j % cols.length], pts = p.pts.map((v, i) => v && [X(i), Y(v[0]), v[1]]).filter(Boolean);
    s += `<polyline points="${pts.map(q => q[0] + "," + q[1]).join(" ")}" fill="none" stroke="${c}" stroke-width="2.5"/>` + pts.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="${q[2] ? c : "var(--surface)"}" stroke="${c}" stroke-width="2.5"/>`).join(""); });
  return h("div", { class: "stack", style: "gap:6px" }, h("div", { class: "mm-svg", html: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Band thi thử theo tháng">${s}</svg>` }),
    series.length > 1 ? h("div", { class: "row small", style: "gap:12px;flex-wrap:wrap" }, series.map((p, j) => h("span", null, h("i", { class: "boss-dot", style: `background:${cols[j % cols.length]}` }), p.name))) : null,
    h("span", { class: "small muted" }, "Chấm đặc: band tổng đủ 4 kỹ năng. Chấm rỗng: trung bình các phần đã thi trong tháng."));
}
function mmGroupCard(list) {
  const me = window.__grp?.uid, ppl = list.map(m => ({ name: m.id === me ? (m.name || "Bạn") + " (bạn)" : m.name, mm: m.id === me ? P.mm : m.mm }));
  const m = mmMonth();
  return h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Band thi thử theo tháng của cả nhóm"),
    h("div", { class: "row small", style: "gap:14px;flex-wrap:wrap" }, list.map(x => { const b = (x.id === me ? P.mm : x.mm)?.[m]; return h("span", null, h("b", null, x.name + ": "), b?.ov != null ? b.ov.toFixed(1) : `${b?.n || 0}/4 phần tháng này`); })),
    mmChart(ppl));
}
(function () {
  ACH.push(["mock4", "🎯", "Thi đủ 4 kỹ năng", "Thi thử đủ Listening, Reading, Writing, Speaking trong một tháng", () => Object.values(P.mm || {}).some(x => x.n === 4)]);
  const _pub = dqPublic; dqPublic = function () { const d = _pub(), mm = {}; for (const [k, v] of Object.entries(P.mm || {})) if (k >= mmMonth(addDays(today(), -190))) mm[k] = { L: v.L, R: v.R, W: v.W, S: v.S, ov: v.ov, n: v.n }; return { ...d, mm }; };
  const _pp = pagePlan; pagePlan = function () { const n = _pp(), c = mmCard(), hd = n.querySelector(".lhead") || n.querySelector(".page-banner"); hd ? hd.after(c) : n.prepend(c); return n; };
  const _pg = pageGroup; pageGroup = function () { const n = _pg(), list = grpMine(), rank = [...n.querySelectorAll(":scope > section")].find(s => /Xếp hạng tuần/.test(s.querySelector("h2")?.textContent || "")); const c = mmGroupCard(list); rank ? rank.after(c) : n.append(c); return n; };
  document.head.append(h("style", null, `.mm-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}@media (max-width:700px){.mm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mm-t{border:2px dashed var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px;text-decoration:none;color:inherit;min-width:0}.mm-t b{font-size:1.6rem}.mm-t.ok{border-style:solid;border-color:var(--good,#0e8a6a)}
.mm-ov{font-size:1.15rem}.mm-svg svg{width:100%;height:auto;display:block}`));
})();
