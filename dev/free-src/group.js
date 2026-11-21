/* ===== Nhóm học: nhiệm vụ bắt buộc mỗi ngày (4 kỹ năng + từ vựng/ngữ pháp), bảng cả nhóm, chuỗi cá nhân và chuỗi nhóm,
   vé đóng băng, level, xếp hạng tuần, game pass tháng, chọc bạn, tổng kết tuần, đổi tên và ảnh đại diện ===== */
const DQ_T = [
  { k: "V", name: "Từ vựng / Ngữ pháp", need: 1, unit: "", href: "#vocab", go: () => { UI.vTab = "road"; }, how: "Qua 1 bài tập trong Lộ trình từ vựng (bài mới hoặc ôn lại bài cũ), ôn xong phần Ôn từ hay sai, hoặc qua 1 bài ngữ pháp. Từ tự thêm vào sổ không tính." },
  { k: "L", name: "Nghe", need: 5, unit: "phút", href: "#listen", how: "Làm bài nghe, nghe chép, số và đánh vần." },
  { k: "S", name: "Nói", need: 5, unit: "phút", href: "#speak", how: "Shadowing, bài phát âm, luyện nói hoặc phòng thi Speaking." },
  { k: "R", name: "Đọc", need: 10, unit: "phút", href: "#reading", how: "Làm 1 bài đọc hoặc 1 bài trong khóa Đọc." },
  { k: "W", name: "Viết", need: 10, unit: "phút", href: "#writing", how: "Nộp 1 bài viết để chấm hoặc qua 1 bài trong khóa Viết." }];
const DQ_SK = { listening: "L", speaking: "S", reading: "R", rcourse: "R", writing: "W", wcourse: "W" };
const PASS_R = [[1, "badge", "🌱", "Khởi động"], [3, "color", "#0e8a6a", "Tên xanh lá"], [5, "frame", "bronze", "Khung đồng"], [7, "badge", "🔥", "Một tuần"], [10, "color", "#6b4fd8", "Tên tím"], [14, "frame", "silver", "Khung bạc"], [18, "color", "#d9480f", "Tên cam"], [21, "badge", "⚡", "Ba tuần"], [25, "frame", "gold", "Khung vàng"], [28, "color", "#b8860b", "Tên vàng"], [30, "badge", "👑", "Trọn tháng"]];
const AVA_EMO = ["🦊", "🐼", "🐯", "🐸", "🐧", "🦉", "🐙", "🦄", "🐳", "🐝", "🌵", "🍀", "🔥", "⚡", "🌙", "🎧", "📚", "🚀"];
const G = { list: [], err: null, pokes: [], started: false, pubT: null, last: "", edit: null };
const dqS = () => {
  const q = P.dq ||= {}; q.days ||= {}; q.fin ||= {}; q.frz ||= {}; q.sk ||= {}; q.rew ||= { color: [], frame: [], badge: [] }; q.poked ||= {}; q.joined ||= today();
  return q;
};
/* Phút theo kỹ năng của một ngày: cộng ngăn web riêng và ngăn web ngoài (dữ liệu cũ chỉ có lg.sk là của web ngoài) */
function dqSkOf(lg) {
  const by = { ...(lg.by || {}) }; if (!by.f && lg.sk) by.f = lg.sk;
  const out = {}; for (const b of Object.values(by)) for (const [k, v] of Object.entries(b || {})) out[k] = (out[k] || 0) + v; return out;
}
/* Sau khi đồng bộ: chấm lại hôm qua và hôm nay, để bài làm bên web riêng vẫn được tính */
function dqRecheck() {
  const q = dqS(); let ch = false;
  for (const t of [addDays(today(), -1), today()]) {
    if (t < q.joined) continue;
    const st = dqToday(t), skStr = st.met.join(""); if (q.sk[t] !== skStr) { q.sk[t] = skStr; ch = true; }
    if (st.ok && q.days[t] !== 1) {
      if (q.days[t] === 2) { const w = weekOf(t); if (q.frz[w] === t) delete q.frz[w]; }
      q.days[t] = 1; q.fin[t] ||= t === today() ? Date.now() : new Date(t + "T21:00:00").getTime(); ch = true;
      award("daily", 20); toast(`Đã tính đủ nhiệm vụ ${t === today() ? "hôm nay" : "hôm qua"} từ dữ liệu đồng bộ. +20 XP`);
    }
  }
  if (ch) saveProfile(); dqPublish(true);
}
/* Tiến độ nhiệm vụ của ngày t */
function dqToday(t) {
  const lg = P.log[t] || {}, sk = dqSkOf(lg), out = {};
  out.V = lg.vr || (t === today() && LESSONS.some(l => P.lessons[l.id]?.done && P.lessons[l.id].date === t)) || lg.gr ? 1 : 0;
  for (const x of DQ_T) if (x.k !== "V") out[x.k] = Math.round((sk[x.k] || 0) * 10) / 10;
  const met = DQ_T.filter(x => (out[x.k] || 0) >= x.need).map(x => x.k);
  return { ...out, met, ok: met.length === DQ_T.length };
}
function dqStreak(days) { let d = today(), n = 0; if (!days?.[d]) d = addDays(d, -1); while (days?.[d]) { n++; d = addDays(d, -1); } return n; }
function dqWeekDays(wid) { return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(wid, i)); }
const dqWx = wid => dqWeekDays(wid).reduce((s, d) => s + Object.values(P.xpDay?.[d] || {}).reduce((a, b) => a + b, 0), 0);
const dqMonth = () => today().slice(0, 7);
const dqTier = (days, m = dqMonth()) => Object.entries(days || {}).filter(([d, v]) => v === 1 && d.startsWith(m)).length;
/* Vé đóng băng: mỗi tuần 1 vé, tự dùng để nối chuỗi khi lỡ đúng 1 ngày */
function dqFreeze() {
  const q = dqS(), y = addDays(today(), -1), w = weekOf(y);
  if (!q.days[y] && q.days[addDays(y, -1)] && !q.frz[w] && y >= q.joined) { q.days[y] = 2; q.frz[w] = y; return true; }
  return false;
}
let dqBusy = false;
function dqTick() {
  if (dqBusy || !P) return; dqBusy = true;
  try {
    const q = dqS(), t = today(), st = dqToday(t);
    let ch = dqFreeze();
    const skStr = st.met.join(""); if (q.sk[t] !== skStr) { q.sk[t] = skStr; ch = true; }
    if (st.ok && q.days[t] !== 1) { q.days[t] = 1; q.fin[t] = Date.now(); ch = true; award("daily", 20); toast("Xong hết nhiệm vụ hôm nay! +20 XP"); }
    const tier = dqTier(q.days);
    for (const [n, type, val, label] of PASS_R) if (tier >= n) {
      const id = type === "badge" ? val + " " + label + " " + dqMonth().slice(5) + "/" + dqMonth().slice(0, 4) : val;
      if (!q.rew[type].includes(id)) { q.rew[type].push(id); ch = true; toast("Game pass: mở khóa " + label); }
    }
    for (const o of [q.days, q.fin, q.sk]) for (const k of Object.keys(o)) if (k < addDays(t, -75)) delete o[k];
    if (ch) saveProfile();
    dqPublish();
  } finally { dqBusy = false; }
}
/* Gửi bản tóm tắt công khai cho cả nhóm xem */
function dqPublic() {
  const q = dqS(), t = today(), st = dqToday(t), wid = weekOf(t), lv = levelOf(P.xp || 0).L;
  const days = {}; for (const [d, v] of Object.entries(q.days)) if (d >= addDays(t, -70)) days[d] = v;
  const skd = {}; for (const [d, v] of Object.entries(q.sk)) if (d >= addDays(t, -21)) skd[d] = v;
  const wx = {}; for (const k of [0, 1, 2]) { const w = addDays(wid, -7 * k); wx[w] = dqWx(w); }
  const me = P.me || {};
  return { name: (me.name || window.__grp?.dname || "Bạn học").slice(0, 24), ava: me.ava || "", color: me.color || "", frame: me.frame || "", badges: q.rew.badge.slice(-6),
    lv, xp: P.xp || 0, streak: dqStreak(q.days), frzLeft: q.frz[wid] ? 0 : 1, days, skd, td: { d: t, V: st.V, L: st.L, S: st.S, R: st.R, W: st.W, fin: q.fin[t] || null }, wx, tier: dqTier(q.days), joined: q.joined };
}
function dqPublish(now) {
  if (!window.__grp) return;
  clearTimeout(G.pubT);
  G.pubT = setTimeout(() => {
    const d = dqPublic(), s = JSON.stringify(d); if (s === G.last) return;
    window.__grp.put({ ...d, at: Date.now() }).then(() => { G.last = s; G.err = null; }, e => { G.err = e?.code || "lỗi"; });
  }, now ? 0 : 3000);
}
/* Đếm phút theo kỹ năng mỗi khi làm bài */
(function () {
  const _sp = saveProfile;
  saveProfile = function () { const r = _sp.apply(this, arguments); setTimeout(dqTick, 0); return r; };
})();
function grpStart() {
  if (G.started || !window.__grp || !P) return; G.started = true;
  dqTick(); dqPublish(true);
  window.__grp.watch(list => { G.list = list; G.err = null; if (UI.route === "group" && !G.edit) render(); else if (UI.route === "today") { const box = document.querySelector(".dq-mini"); if (box) box.replaceWith(dqFriendsMini()); } }, e => { G.err = e?.code || "lỗi"; if (UI.route === "group") render(); });
  window.__grp.pokes(ps => { G.pokes = ps; grpPokeBar(); });
}
setInterval(() => { if (!G.started) grpStart(); }, 1500);

/* ----- Giao diện ----- */
const FRAME_C = { bronze: "#b87333", silver: "#9aa4ad", gold: "#d4a017" };
function gAva(m, sz = 40) {
  const st = `width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.55)}px;` + (m.frame && FRAME_C[m.frame] ? `box-shadow:0 0 0 3px ${FRAME_C[m.frame]};` : "");
  if (m.ava && /^(data:image\/|https:\/\/)/.test(m.ava)) return h("img", { class: "g-ava", src: m.ava, alt: "", style: st, referrerpolicy: "no-referrer", onerror: e => { e.target.replaceWith(h("span", { class: "g-ava", style: st }, (m.name || "?").trim().charAt(0).toUpperCase())); } });
  return h("span", { class: "g-ava", style: st }, m.ava || (m.name || "?").trim().charAt(0).toUpperCase());
}
const gName = m => h("b", { class: "g-name", style: m.color ? "color:" + m.color : null }, m.name || "Bạn học");
function dqRow(x, st) {
  const v = st[x.k] || 0, done = v >= x.need, pct = Math.min(100, Math.round(v / x.need * 100));
  return h("a", { class: "dq-row" + (done ? " ok" : ""), href: x.href, onclick: () => x.go?.() },
    h("span", { class: "dq-tick", "aria-hidden": "true" }, done ? "✓" : ""),
    h("span", { class: "stack", style: "gap:2px;min-width:0;flex:1" }, h("b", null, x.name), h("span", { class: "small muted" }, x.how),
      x.unit ? h("span", { class: "dq-bar" }, h("i", { style: `width:${pct}%` })) : null),
    h("span", { class: "dq-v small" }, done ? "Xong" : x.unit ? `${v}/${x.need} ${x.unit}` : "Chưa"));
}
function dqCard() {
  const q = dqS(), t = today(), st = dqToday(t), streak = dqStreak(q.days), wid = weekOf(t);
  return h("section", { class: "card stack dq-card", style: "gap:10px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px" },
      h("h2", { style: "margin:0" }, `Nhiệm vụ bắt buộc hôm nay · ${st.met.length}/${DQ_T.length}`),
      h("span", { class: "small muted" }, `🔥 Chuỗi ${streak} ngày · 🧊 vé đóng băng tuần này: ${q.frz[wid] ? "đã dùng" : "còn 1"} · hạn 23:59`)),
    DQ_T.map(x => dqRow(x, st)),
    st.ok ? h("p", { class: "note good", style: "margin:0" }, "Bạn đã xong hết nhiệm vụ hôm nay. Chuỗi được giữ, game pass lên 1 bậc.") : null,
    window.__grp ? dqFriendsMini() : null);
}
function dqFriendsMini() {
  const t = today(), others = G.list.filter(m => m.id !== window.__grp?.uid);
  if (!others.length) return h("div", { class: "dq-mini" });
  return h("a", { class: "dq-mini row", href: "#group" }, others.map(m => { const n = m.td?.d === t ? DQ_T.filter(x => (m.td[x.k] || 0) >= x.need).length : 0; return h("span", { class: "row", style: "gap:6px" }, gAva(m, 24), h("span", { class: "small" }, `${m.name}: ${n}/${DQ_T.length}`)); }), h("span", { class: "small muted" }, "Xem nhóm ›"));
}
function grpPokeBar() {
  document.getElementById("g-poke")?.remove(); if (!G.pokes.length) return;
  const last = G.pokes.slice().sort((a, b) => b.at - a.at)[0];
  const names = [...new Set(G.pokes.map(p => p.name || "Bạn"))].join(", ");
  const bar = h("div", { id: "g-poke", role: "status" }, h("span", null, `👉 ${names} chọc bạn lúc ${new Date(last.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}: làm nhiệm vụ hôm nay đi!`),
    h("a", { class: "btn btn-primary", href: "#today", onclick: () => grpClearPokes() }, "Làm ngay"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => grpClearPokes() }, "Đã biết"));
  document.body.append(bar);
}
function grpClearPokes() { const ps = G.pokes; G.pokes = []; grpPokeBar(); for (const p of ps) window.__grp.clear(p.id).catch(() => {}); }
function grpPoke(m) { const q = dqS(); q.poked[m.id] = today(); saveProfile(); window.__grp.poke(m.id, (P.me?.name || window.__grp.dname || "Bạn học").slice(0, 24)).then(() => toast("Đã chọc " + m.name), () => toast("Chưa chọc được, thử lại sau.")); render(); }
/* Chuỗi nhóm: ngày mà mọi người (đã tham gia từ trước ngày đó) đều xong hoặc dùng vé */
function grpDayAll(d, list) { const mem = list.filter(m => (m.joined || "0") <= d); return mem.length > 0 && mem.every(m => m.days?.[d]); }
function grpStreak(list) { let d = today(), n = 0; if (!grpDayAll(d, list)) d = addDays(d, -1); while (grpDayAll(d, list)) { n++; d = addDays(d, -1); } return n; }
function grpWeekStat(m, wid) {
  const ds = dqWeekDays(wid).filter(d => d <= today() && d >= (m.joined || "0"));
  const done = ds.filter(d => m.days?.[d] === 1).length, fz = ds.filter(d => m.days?.[d] === 2).length;
  return { done, fz, el: ds.length, pct: ds.length ? Math.round(done / ds.length * 100) : 0, xp: m.wx?.[wid] || 0 };
}
function grpMine() { const me = window.__grp?.uid, pub = dqPublic(); return [{ ...pub, id: me }, ...G.list.filter(m => m.id !== me)]; }
function grpBoard(list) {
  const t = today();
  const order = list.slice().sort((a, b) => (a.td?.d === t && a.td.fin ? a.td.fin : 9e15) - (b.td?.d === t && b.td.fin ? b.td.fin : 9e15));
  return h("section", { class: "card stack", style: "gap:12px" }, h("h2", { style: "margin:0" }, "Hôm nay của cả nhóm"),
    h("div", { class: "g-board" }, order.map((m, i) => {
      const td = m.td?.d === t ? m.td : {}, n = DQ_T.filter(x => (td[x.k] || 0) >= x.need).length, ok = n === DQ_T.length, me = m.id === window.__grp?.uid;
      const seen = m.at ? Math.round((Date.now() - m.at) / 60000) : null;
      return h("div", { class: "g-col" + (ok ? " ok" : "") },
        h("div", { class: "row", style: "gap:10px;align-items:center" }, gAva(m, 44), h("div", { class: "stack", style: "gap:2px;min-width:0" }, gName(m), h("span", { class: "small muted" }, `Lv ${m.lv || 1} · 🔥 ${m.streak || 0} ngày` + (me ? " · bạn" : "")))),
        ok ? h("span", { class: "chip good" }, `Xong · thứ ${i + 1} · ${new Date(td.fin).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`) : h("span", { class: "chip " + (n ? "warn" : "bad") }, `${n}/${DQ_T.length} nhiệm vụ`),
        h("div", { class: "g-tasks" }, DQ_T.map(x => { const v = td[x.k] || 0, d = v >= x.need; return h("span", { class: "g-task" + (d ? " ok" : ""), title: x.name }, (d ? "✓ " : "") + x.name + (x.unit && !d ? ` ${v}/${x.need}′` : "")); })),
        m.badges?.length ? h("span", { class: "small", title: m.badges.join(", ") }, m.badges.map(b => b.split(" ")[0]).join(" ")) : null,
        !me && !ok ? (dqS().poked[m.id] === t ? h("span", { class: "small muted" }, "Đã chọc hôm nay") : h("button", { class: "btn", type: "button", onclick: () => grpPoke(m) }, "👉 Chọc")) : null,
        !me && seen != null ? h("span", { class: "small muted" }, seen < 2 ? "Vừa mở web" : seen < 60 ? `Mở web ${seen} phút trước` : seen < 1440 ? `Mở web ${Math.round(seen / 60)} giờ trước` : `Mở web ${Math.round(seen / 1440)} ngày trước`) : null);
    })));
}
function grpStreakCard(list) {
  const n = grpStreak(list), ds = [...Array(14)].map((_, i) => addDays(today(), i - 13));
  return h("section", { class: "card stack", style: "gap:10px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Chuỗi nhóm"), h("b", { class: "g-big" }, `🔥 ${n} ngày`)),
    h("p", { class: "small muted", style: "margin:0" }, "Chuỗi nhóm chỉ tăng khi tất cả cùng xong nhiệm vụ trong ngày (ngày dùng vé đóng băng vẫn tính). Một người bỏ là cả nhóm đứt chuỗi."),
    h("div", { class: "g-strip" }, ds.map(d => { const all = grpDayAll(d, list), some = list.some(m => m.days?.[d]); return h("span", { class: "g-day" + (all ? " all" : some ? " some" : ""), title: d + (all ? ": cả nhóm xong" : some ? ": chưa đủ người" : ": không ai xong") }, String(+d.slice(8))); })),
    h("div", { class: "row small muted", style: "gap:14px;flex-wrap:wrap" }, h("span", null, "■ cả nhóm xong"), h("span", null, "▨ chưa đủ người"), h("span", null, "□ chưa ai xong")));
}
function grpRank(list) {
  const wid = weekOf(today()), rows = list.map(m => ({ m, ...grpWeekStat(m, wid) })).sort((a, b) => b.pct - a.pct || b.xp - a.xp);
  return h("section", { class: "card stack", style: "gap:10px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Xếp hạng tuần này"), h("span", { class: "small muted" }, "Đặt lại mỗi thứ Hai")),
    h("p", { class: "small muted", style: "margin:0" }, "Xếp theo % số ngày làm đủ nhiệm vụ trong tuần, bằng nhau thì xét XP tuần."),
    h("div", { class: "qt-wrap" }, h("table", { class: "qt-tbl" }, h("thead", null, h("tr", null, h("th", null, "#"), h("th", null, "Người học"), h("th", null, "Ngày đủ"), h("th", null, "XP tuần"), h("th", null, "Level"))),
      h("tbody", null, rows.map((r, i) => h("tr", null, h("td", null, ["🥇", "🥈", "🥉"][i] || String(i + 1)), h("td", null, h("span", { class: "row", style: "gap:8px" }, gAva(r.m, 26), gName(r.m))), h("td", null, `${r.done}/${r.el} (${r.pct}%)` + (r.fz ? ` · 🧊${r.fz}` : "")), h("td", null, String(r.xp)), h("td", null, String(r.m.lv || 1))))))));
}
function grpPass() {
  const q = dqS(), tier = dqTier(q.days), m = dqMonth(), days = new Date(+m.slice(0, 4), +m.slice(5), 0).getDate();
  return h("section", { class: "card stack", style: "gap:10px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, `Game pass tháng ${+m.slice(5)}`), h("b", null, `Bậc ${tier}/30`)),
    h("p", { class: "small muted", style: "margin:0" }, `Mỗi ngày làm đủ nhiệm vụ lên 1 bậc. Tháng này có ${days} ngày, đầu tháng sau bắt đầu lại từ bậc 0. Phần thưởng đã mở giữ mãi.`),
    h("div", { class: "g-pass" }, h("i", { style: `width:${Math.min(100, tier / 30 * 100)}%` })),
    h("div", { class: "g-rew" }, PASS_R.map(([n, type, val, label]) => h("span", { class: "g-rw" + (tier >= n ? " on" : "") }, h("b", null, n), type === "color" ? h("span", { style: `color:${val};font-weight:700` }, "Aa") : type === "frame" ? h("span", { class: "g-fr", style: `box-shadow:0 0 0 3px ${FRAME_C[val]}` }) : h("span", null, val), h("span", { class: "small" }, label)))));
}
function grpSummary(list) {
  const t = today(), sun = new Date(t + "T00:00:00").getDay() === 0, wid = sun ? weekOf(t) : addDays(weekOf(t), -7), prev = addDays(wid, -7);
  const rows = list.filter(m => (m.joined || "0") <= addDays(wid, 6)).map(m => ({ m, ...grpWeekStat(m, wid), up: (m.wx?.[wid] || 0) - (m.wx?.[prev] || 0) }));
  if (!rows.length) return null;
  const ds = dqWeekDays(wid), cnt = Object.fromEntries(DQ_T.map(x => [x.k, 0]));
  for (const m of list) for (const d of ds) for (const c of m.skd?.[d] || "") if (c in cnt) cnt[c]++;
  const weak = DQ_T.slice().sort((a, b) => cnt[a.k] - cnt[b.k])[0], best = rows.slice().sort((a, b) => b.up - a.up)[0];
  const full = rows.filter(r => r.done + r.fz >= 7);
  return h("section", { class: "card stack" + (sun ? " g-sun" : ""), style: "gap:10px" }, h("h2", { style: "margin:0" }, sun ? "Tổng kết tuần này (Chủ nhật)" : "Tổng kết tuần trước"),
    h("span", { class: "small muted" }, `Từ ${fmtDate(new Date(wid + "T00:00:00"))} đến ${fmtDate(new Date(addDays(wid, 6) + "T00:00:00"))}`),
    h("ul", { style: "margin:0;padding-left:18px;line-height:1.8" },
      rows.map(r => h("li", null, h("b", null, r.m.name), `: đủ nhiệm vụ ${r.done}/7 ngày` + (r.fz ? `, dùng ${r.fz} vé` : "") + `, ${r.xp} XP`)),
      best && best.up > 0 ? h("li", null, `Tiến bộ nhất: `, h("b", null, best.m.name), ` (+${best.up} XP so với tuần trước đó)`) : null,
      full.length ? h("li", null, "Không bỏ ngày nào: " + full.map(r => r.m.name).join(", ")) : null,
      h("li", null, `Kỹ năng cả nhóm làm ít nhất: `, h("b", null, weak.name), ` (${cnt[weak.k]} lượt đạt trong tuần). Tuần tới ưu tiên phần này.`)));
}
function grpProfile() {
  const me = P.me ||= {}, q = dqS(), E = G.edit;
  const pubMe = { ...dqPublic(), id: window.__grp?.uid };
  if (!E) return h("section", { class: "card row", style: "gap:14px;align-items:center;flex-wrap:wrap" }, gAva(pubMe, 64),
    h("div", { class: "stack", style: "gap:4px;flex:1;min-width:0" }, gName(pubMe), h("span", { class: "small muted" }, `Level ${pubMe.lv} · ${pubMe.xp} XP · cần ${levelOf(P.xp || 0).to - (P.xp || 0)} XP nữa để lên Level ${pubMe.lv + 1}`),
      h("div", { class: "g-lvbar" }, h("i", { style: `width:${Math.round(((P.xp || 0) - levelOf(P.xp || 0).from) / (levelOf(P.xp || 0).to - levelOf(P.xp || 0).from) * 100)}%` }))),
    h("button", { class: "btn", type: "button", onclick: () => { G.edit = { name: pubMe.name, ava: me.ava || "", color: me.color || "", frame: me.frame || "" }; render(); } }, "Đổi tên và ảnh"));
  const nameIn = h("input", { type: "text", maxlength: 24, value: E.name, oninput: e => { E.name = e.target.value; } });
  const up = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async e => { const f = e.target.files?.[0]; if (!f) return; try { E.ava = await grpShrink(f); render(); } catch { toast("Ảnh này không đọc được"); } } });
  const pick = (k, v) => { E[k] = v; render(); };
  return h("section", { class: "card stack", style: "gap:12px" }, h("h2", { style: "margin:0" }, "Đổi tên và ảnh đại diện"),
    h("div", { class: "row", style: "gap:14px;align-items:center" }, gAva({ ...E, name: E.name }, 64), h("label", { class: "stack", style: "gap:4px;flex:1" }, h("span", { class: "small muted" }, "Tên hiện với cả nhóm (tối đa 24 ký tự)"), nameIn)),
    h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "small muted" }, "Ảnh đại diện"),
      h("div", { class: "g-emo" }, h("button", { type: "button", class: "g-e" + (!E.ava ? " on" : ""), onclick: () => pick("ava", "") }, (E.name || "?").charAt(0).toUpperCase()), AVA_EMO.map(x => h("button", { type: "button", class: "g-e" + (E.ava === x ? " on" : ""), onclick: () => pick("ava", x) }, x)),
        up),
      h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" },
        h("button", { type: "button", class: "btn", onclick: () => up.click() }, "📷 Tải ảnh từ máy"),
        window.__grp?.photo ? h("button", { type: "button", class: "btn", onclick: () => grpUrlAva(window.__grp.photo, E) }, "Dùng ảnh tài khoản Google") : null),
      h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, (() => { const inp = h("input", { type: "url", placeholder: "Hoặc dán link ảnh (https://…)", style: "flex:1;min-width:200px" }); return [inp, h("button", { type: "button", class: "btn", onclick: () => grpUrlAva(inp.value.trim(), E) }, "Dùng link này")]; })()),
      h("span", { class: "small muted" }, "Ảnh được thu nhỏ còn 96×96 (khoảng 5 KB) và thay thẳng ảnh cũ, nên ảnh cũ bị xóa luôn, không chiếm thêm chỗ.")),
    h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "small muted" }, "Màu tên (mở thêm bằng game pass)"),
      h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, ["", ...q.rew.color].map(c => h("button", { type: "button", class: "btn" + (E.color === c ? " btn-primary" : ""), onclick: () => pick("color", c) }, h("span", { style: c ? `color:${E.color === c ? "inherit" : c};font-weight:700` : null }, c ? PASS_R.find(r => r[2] === c)?.[3] || "Màu" : "Mặc định"))))),
    h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "small muted" }, "Khung ảnh (mở thêm bằng game pass)"),
      h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, ["", ...q.rew.frame].map(f => h("button", { type: "button", class: "btn" + (E.frame === f ? " btn-primary" : ""), onclick: () => pick("frame", f) }, f ? PASS_R.find(r => r[2] === f)?.[3] || f : "Không khung")))),
    h("div", { class: "row", style: "gap:8px" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => { Object.assign(me, { name: (E.name || "").trim().slice(0, 24), ava: E.ava, color: E.color, frame: E.frame }); G.edit = null; saveProfile(); dqPublish(true); render(); } }, "Lưu"),
      h("button", { class: "btn btn-quiet", type: "button", onclick: () => { G.edit = null; render(); } }, "Hủy")));
}
/* Ảnh từ link: thu nhỏ được thì lưu bản nhỏ; trang ảnh chặn đọc thì lưu nguyên link */
function grpUrlAva(u, E) {
  if (!/^https:\/\/\S+$/.test(u || "")) { toast("Link ảnh phải bắt đầu bằng https://"); return; }
  const img = new Image(); img.crossOrigin = "anonymous"; img.referrerPolicy = "no-referrer";
  img.onload = () => { try { const c = document.createElement("canvas"); c.width = c.height = 96; const s = Math.min(img.width, img.height); c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 96, 96); E.ava = c.toDataURL("image/jpeg", 0.8); } catch { E.ava = u.slice(0, 500); } render(); };
  img.onerror = () => { const t = new Image(); t.referrerPolicy = "no-referrer"; t.onload = () => { E.ava = u.slice(0, 500); render(); }; t.onerror = () => toast("Không mở được ảnh từ link này"); t.src = u; };
  img.src = u;
}
/* Thu ảnh về 96×96 để lưu gọn (khoảng 5 KB) */
function grpShrink(file) {
  return new Promise((ok, no) => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 96; const s = Math.min(img.width, img.height); c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 96, 96); URL.revokeObjectURL(img.src); ok(c.toDataURL("image/jpeg", 0.8)); }; img.onerror = no; img.src = URL.createObjectURL(file); });
}
function pageGroup() {
  grpStart();
  const list = grpMine();
  return h("div", { class: "stack g-page", style: "gap:18px" },
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Học cùng nhau"), h("h1", null, "Nhóm học"),
      h("p", { class: "muted", style: "max-width:68ch;margin:0" }, "Mọi người trong nhóm thấy level, chuỗi ngày và nhiệm vụ hôm nay của nhau. Nhiệm vụ tự đánh dấu khi bạn làm bài thật trên web.")),
    G.err ? h("p", { class: "note bad" }, `Chưa đọc được dữ liệu nhóm (${G.err}). Chủ trang cần cập nhật quy tắc Firestore cho mục "group".`) : null,
    grpProfile(), dqCard(), grpBoard(list), grpStreakCard(list), grpRank(list), grpPass(), grpSummary(list));
}
(function () {
  const css = `.dq-card .dq-row{display:flex;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;text-decoration:none;color:inherit;background:var(--surface)}
.dq-row.ok{background:color-mix(in srgb,var(--good,#0e8a6a) 10%,var(--surface))}.dq-tick{width:26px;height:26px;flex:none;border:2px solid var(--edge,#222);border-radius:8px;display:grid;place-items:center;font-weight:800}
.dq-row.ok .dq-tick{background:var(--good,#0e8a6a);color:#fff;border-color:transparent}.dq-v{flex:none;font-weight:700;white-space:nowrap}
.dq-bar,.g-pass,.g-lvbar{display:block;height:6px;border-radius:6px;background:var(--line);overflow:hidden;max-width:260px}.dq-bar i,.g-pass i,.g-lvbar i{display:block;height:100%;background:var(--good,#0e8a6a)}
.g-pass{max-width:none;height:10px}.dq-mini{display:flex;gap:14px;flex-wrap:wrap;align-items:center;text-decoration:none;color:inherit;padding-top:4px}
.g-ava{display:inline-grid;place-items:center;border-radius:50%;background:var(--line);object-fit:cover;flex:none;font-weight:800;line-height:1}
.g-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.g-col{border:2px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;align-items:flex-start;min-width:0}
.g-col.ok{border-color:var(--good,#0e8a6a)}.g-tasks{display:flex;flex-wrap:wrap;gap:6px}.g-task{font-size:.78rem;padding:3px 8px;border-radius:20px;border:1px solid var(--line)}
.g-task.ok{background:var(--good,#0e8a6a);color:#fff;border-color:transparent}.g-big{font-size:1.5rem}
.g-strip{display:grid;grid-template-columns:repeat(14,minmax(0,1fr));gap:4px}.g-day{aspect-ratio:1;display:grid;place-items:center;font-size:.72rem;border:1px solid var(--line);border-radius:6px}
.g-day.all{background:var(--good,#0e8a6a);color:#fff;border-color:transparent}.g-day.some{background:repeating-linear-gradient(45deg,var(--line),var(--line) 3px,transparent 3px,transparent 6px)}
.g-rew{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}.g-rw{border:1px solid var(--line);border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;opacity:.45}
.g-rw.on{opacity:1;border-color:var(--good,#0e8a6a)}.g-fr{width:18px;height:18px;border-radius:50%;display:inline-block}.g-sun{border-width:2px;border-color:var(--good,#0e8a6a)}
.g-emo{display:flex;flex-wrap:wrap;gap:6px}.g-e{width:40px;height:40px;border-radius:50%;border:2px solid var(--line);background:var(--surface);font-size:20px;cursor:pointer}.g-e.on{border-color:var(--good,#0e8a6a);box-shadow:0 0 0 2px var(--good,#0e8a6a)}
#g-poke{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:min(560px,calc(100% - 24px));padding:12px 14px;background:var(--surface);border:2px solid var(--edge,#222);box-shadow:5px 5px 0 var(--shadow-c,#222);border-radius:12px}`;
  document.head.append(h("style", null, css));
  const at = NAV.findIndex(x => x[0] === "plan"); NAV.splice(at + 1, 0, ["group", "Nhóm", "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7.5M22 21v-1a6 6 0 00-4-5.6"]);
  const mine = r => r === "group";
  /* bảng lượt AI (quota.js) đã gắn sẵn một bộ nghe hashchange gọi onRoute toàn cục, nên chỉ cần bọc onRoute */
  const _or = onRoute;
  onRoute = function () { const raw = (location.hash || "").slice(1); if (!mine(raw)) return _or(); if (raw !== UI.route) { UI.route = raw; $("#lookup").hidden = true; render(); window.scrollTo(0, 0); } };
  const _ri = renderInner;
  renderInner = function () { if (UI.route !== "group") return _ri(); renderNav(); UI.keyH = null; $("#main").replaceChildren(pageGroup()); renderAsk(); };
  const _nav = navTab; navTab = r => r === "group" ? "group" : _nav(r);
  const _pt = pageToday;
  pageToday = function () { const n = _pt(); const head = n.firstElementChild; const c = dqCard(); head ? head.after(c) : n.prepend(c); return n; };
})();

(function () { const _ap = syncApply; syncApply = async function () { const r = await _ap.apply(this, arguments); try { dqRecheck(); } catch (e) { console.warn(e); } return r; }; })();
