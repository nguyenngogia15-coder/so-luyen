/* ===== Cho vui hơn: rương phần thưởng (có hiệu ứng mở), boss tuần đánh chung, thần thú nuôi chung (Thanh Long, Bạch Hổ,
   Chu Tước, Huyền Vũ), thành tựu, lịch sử học kiểu ô vuông cả năm ===== */
const RAR = { c: ["Thường", "#8a8f98"], r: ["Hiếm", "#2f7de1"], e: ["Sử thi", "#9b51e0"], l: ["Huyền thoại", "#e8a800"] };
const RARE_EMO = ["🦚", "🦩", "🪐", "💎", "🌋", "🦋", "🌈", "🍄", "🧿", "🪷", "🐋", "🦭"];
const LEGEND_FRAME = "Khung huyền thoại";
FRAME_C[LEGEND_FRAME] = "#e8a800";
const fq = () => { const q = dqS(); q.chest ||= 0; q.opened ||= 0; q.chD ||= {}; q.frzX ||= 0; q.emo ||= []; q.ach ||= {}; q.gfull ||= {}; q.bossW ||= {}; q.hm ||= {}; q.best ||= 0; q.pokeN ||= 0; return q; };
const frnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/* ----- Rương ----- */
function chestRoll() {
  const q = fq(), x = frnd();
  if (x < 0.01) { q.rew.frame.includes(LEGEND_FRAME) || q.rew.frame.push(LEGEND_FRAME); award("chest", 200); return { r: "l", ico: "👑", t: "+200 XP và " + LEGEND_FRAME, d: "Khung ảnh lấp lánh chỉ 1% người mở được." }; }
  if (x < 0.05) { q.x2 = addDays(today(), 1); return { r: "e", ico: "⚡", t: "Nhân đôi XP ngày mai", d: "Mọi XP bạn kiếm ngày mai được nhân 2." }; }
  if (x < 0.12) { const left = RARE_EMO.filter(e => !q.emo.includes(e)); if (left.length) { const e = left[Math.floor(frnd() * left.length)]; q.emo.push(e); AVA_EMO.includes(e) || AVA_EMO.push(e); return { r: "e", ico: e, t: "Ảnh đại diện hiếm " + e, d: "Đã thêm vào mục Đổi tên và ảnh." }; } }
  if (x < 0.20) { q.frzX++; return { r: "r", ico: "🧊", t: "1 vé đóng băng thêm", d: "Tự dùng khi vé của tuần đã hết mà bạn lỡ 1 ngày." }; }
  if (x < 0.40) { award("chest", 50); return { r: "r", ico: "💠", t: "+50 XP", d: "Một túi XP lớn." }; }
  const n = 10 + Math.floor(frnd() * 21); award("chest", n); return { r: "c", ico: "✨", t: `+${n} XP`, d: "Mỗi ngày làm đủ là một cơ hội mở trúng đồ hiếm." };
}
const CHEST_SVG = `<svg viewBox="0 0 120 110" class="ch-svg" aria-hidden="true"><g class="ch-body"><rect x="14" y="52" width="92" height="50" rx="6" fill="#a8642a" stroke="#1d1d1d" stroke-width="4"/><rect x="14" y="66" width="92" height="9" fill="#e8a800" stroke="#1d1d1d" stroke-width="3"/><rect x="50" y="60" width="20" height="24" rx="3" fill="#e8a800" stroke="#1d1d1d" stroke-width="3"/><circle cx="60" cy="72" r="3" fill="#1d1d1d"/></g><g class="ch-lid"><path d="M14 54 V40 Q14 20 60 20 Q106 20 106 40 V54 Z" fill="#c07a36" stroke="#1d1d1d" stroke-width="4"/><path d="M14 44 Q60 30 106 44" fill="none" stroke="#e8a800" stroke-width="6"/><path d="M14 44 Q60 30 106 44" fill="none" stroke="#1d1d1d" stroke-width="2"/></g></svg>`;
function chestOpen() {
  const q = fq(); if (q.chest <= 0 || document.getElementById("ch-ov")) return;
  q.chest--; q.opened++; const res = chestRoll(); saveProfile(); dqPublish(true);
  const [rn, rc] = RAR[res.r];
  const ov = h("div", { id: "ch-ov", class: "ch-ov", role: "dialog", "aria-label": "Mở rương" });
  const stage = h("div", { class: "ch-stage", style: `--rc:${rc}` }, h("div", { class: "ch-rays" }), h("div", { class: "ch-box", html: CHEST_SVG }),
    h("div", { class: "ch-item" }, h("div", { class: "ch-ico" }, res.ico), h("span", { class: "ch-rar" }, rn), h("b", null, res.t), h("span", { class: "small" }, res.d)));
  const btns = h("div", { class: "ch-btns" }, q.chest > 0 ? h("button", { class: "btn btn-primary", type: "button", onclick: () => { ov.remove(); chestOpen(); } }, `Mở tiếp (còn ${q.chest})`) : null, h("button", { class: "btn", type: "button", onclick: () => { ov.remove(); render(); } }, "Đóng"));
  ov.append(stage, btns); document.body.append(ov);
  const conf = () => { for (let i = 0; i < 46; i++) { const s = h("i", { class: "ch-cf" }); const a = frnd() * Math.PI * 2, d = 120 + frnd() * 220; s.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 80}px;--r:${frnd() * 720 - 360}deg;background:${[rc, "#ffd43b", "#ff6b6b", "#51cf66", "#4dabf7"][i % 5]};animation-delay:${frnd() * 0.15}s`; stage.append(s); } };
  stage.classList.add("shake"); setTimeout(() => { stage.classList.remove("shake"); stage.classList.add("open", "r-" + res.r); conf(); }, 1100);
}
function chestBar() {
  const q = fq(); if (!q.chest && !q.x2 && !q.frzX) return null;
  return h("section", { class: "card row ch-bar", style: "gap:12px;align-items:center;flex-wrap:wrap" },
    h("span", { class: "ch-mini", html: CHEST_SVG }),
    h("div", { class: "stack", style: "gap:2px;flex:1;min-width:0" }, h("b", null, q.chest ? `Bạn có ${q.chest} rương chưa mở` : "Rương"),
      h("span", { class: "small muted" }, [q.x2 === today() ? "⚡ Hôm nay XP được nhân đôi. " : q.x2 > today() ? "⚡ Ngày mai XP được nhân đôi. " : "", q.frzX ? `🧊 Vé đóng băng thêm: ${q.frzX}. ` : "", "Mỗi ngày làm đủ nhiệm vụ được 1 rương, hạ boss tuần được thêm 1."].join(""))),
    q.chest ? h("button", { class: "btn btn-primary ch-go", type: "button", onclick: chestOpen }, "🎁 Mở rương") : null);
}

/* ----- Boss tuần: cả nhóm cùng đánh, mỗi XP là 1 sát thương ----- */
const BOSSES = [["Bóng Ma Trì Hoãn", "#6c5ce7"], ["Quỷ Lướt Điện Thoại", "#e17055"], ["Khổng Lồ Band 5.0", "#00897b"], ["Nhện Câu Bị Động", "#5d4037"], ["Golem Từ Quên", "#607d8b"], ["Phù Thủy Phát Âm Sai", "#ad1457"], ["Sứa Mất Tập Trung", "#0288d1"], ["Trùm Ngủ Nướng", "#f57c00"]];
const BOSS_HP_PER = 300;
function bossOf(wid) { const n = Math.round(new Date(wid + "T00:00:00").getTime() / 6048e5); const [name, col] = BOSSES[((n % BOSSES.length) + BOSSES.length) % BOSSES.length]; return { name, col }; }
function bossSvg(col, dead, hurt) {
  const eyes = dead ? `<path d="M40 52l10 10M50 52l-10 10M70 52l10 10M80 52l-10 10" stroke="#1d1d1d" stroke-width="5" stroke-linecap="round"/>` : `<path d="M36 46l16 6M84 46l-16 6" stroke="#1d1d1d" stroke-width="5" stroke-linecap="round"/><circle cx="46" cy="60" r="7" fill="#fff" stroke="#1d1d1d" stroke-width="3"/><circle cx="74" cy="60" r="7" fill="#fff" stroke="#1d1d1d" stroke-width="3"/><circle cx="47" cy="61" r="3" fill="#1d1d1d"/><circle cx="73" cy="61" r="3" fill="#1d1d1d"/>`;
  return `<svg viewBox="0 0 120 120" class="boss-svg${hurt ? " hurt" : ""}${dead ? " dead" : ""}" aria-hidden="true"><path d="M30 34 L22 10 L44 28 M90 34 L98 10 L76 28" fill="${col}" stroke="#1d1d1d" stroke-width="4" stroke-linejoin="round"/><path d="M18 100 Q10 40 60 26 Q110 40 102 100 Q92 92 84 104 Q74 92 64 104 Q56 92 46 104 Q36 92 28 104 Q22 96 18 100Z" fill="${col}" stroke="#1d1d1d" stroke-width="4" stroke-linejoin="round"/>${eyes}<path d="${dead ? "M46 84 Q60 76 74 84" : "M44 80 Q60 92 76 80"}" fill="none" stroke="#1d1d1d" stroke-width="4" stroke-linecap="round"/>${dead ? "" : `<path d="M50 82 l3 6 l3 -5 M64 83 l3 5 l3 -6" fill="#fff" stroke="#1d1d1d" stroke-width="2"/>`}</svg>`;
}
let bossLast = null;
function bossCard(list) {
  const wid = weekOf(today()), b = bossOf(wid), mem = list.filter(m => (m.joined || "0") <= addDays(wid, 6));
  const hp = BOSS_HP_PER * Math.max(1, mem.length), hits = mem.map(m => ({ m, x: m.wx?.[wid] || 0 })).sort((a, b) => b.x - a.x);
  const dmg = hits.reduce((s, x) => s + x.x, 0), left = Math.max(0, hp - dmg), dead = left === 0, hurt = bossLast != null && dmg > bossLast; bossLast = dmg;
  const ends = Math.max(0, Math.ceil((new Date(addDays(wid, 7) + "T00:00:00") - Date.now()) / 864e5));
  const cols = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f08c00"];
  return h("section", { class: "card stack boss-card", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Boss tuần"), h("span", { class: "small muted" }, dead ? "Đã bị hạ! Cả nhóm nhận thêm 1 rương." : `Còn ${ends} ngày để hạ`)),
    h("div", { class: "row", style: "gap:16px;align-items:center;flex-wrap:wrap" }, h("div", { class: "boss-wrap", html: bossSvg(b.col, dead, hurt) }),
      h("div", { class: "stack", style: "gap:8px;flex:1;min-width:200px" }, h("b", { style: "font-size:1.15rem" }, b.name),
        h("div", { class: "boss-hp" }, h("i", { style: `width:${left / hp * 100}%;background:${dead ? "var(--line)" : "#e03131"}` }), h("span", null, dead ? "0 máu" : `${left} / ${hp} máu`)),
        h("div", { class: "boss-dmg" }, hits.map((x, i) => x.x ? h("i", { title: `${x.m.name}: ${x.x}`, style: `width:${Math.min(100, x.x / hp * 100)}%;background:${cols[i % cols.length]}` }) : null)),
        h("div", { class: "row small", style: "gap:12px;flex-wrap:wrap" }, hits.map((x, i) => h("span", null, h("i", { class: "boss-dot", style: `background:${cols[i % cols.length]}` }), `${x.m.name}: ${x.x}`))),
        h("span", { class: "small muted" }, `Mỗi XP bất kỳ ai kiếm được trong tuần là 1 sát thương. Máu boss = ${BOSS_HP_PER} × số người.`))));
}

/* ----- Thần thú nuôi chung ----- */
const PET_DAYS = 12;
const BEASTS = [
  { id: "long", name: "Thanh Long", dir: "phương Đông", col: "#1f9e8f" },
  { id: "ho", name: "Bạch Hổ", dir: "phương Tây", col: "#e9e4d8" },
  { id: "tuoc", name: "Chu Tước", dir: "phương Nam", col: "#e0452b" },
  { id: "vu", name: "Huyền Vũ", dir: "phương Bắc", col: "#34495e" }];
function petEyes(x1, x2, y, mood, r = 5) {
  if (mood === "happy") return `<path d="M${x1 - r} ${y + 1} Q${x1} ${y - r - 2} ${x1 + r} ${y + 1} M${x2 - r} ${y + 1} Q${x2} ${y - r - 2} ${x2 + r} ${y + 1}" fill="none" stroke="#1d1d1d" stroke-width="3" stroke-linecap="round"/>`;
  if (mood === "sick") return `<path d="M${x1 - 4} ${y - 4}l8 8M${x1 + 4} ${y - 4}l-8 8M${x2 - 4} ${y - 4}l8 8M${x2 + 4} ${y - 4}l-8 8" stroke="#1d1d1d" stroke-width="3" stroke-linecap="round"/>`;
  const e = `<circle cx="${x1}" cy="${y}" r="${r}" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/><circle cx="${x1 + 1}" cy="${y + 1}" r="${r * 0.5}" fill="#1d1d1d"/><circle cx="${x2 + 1}" cy="${y + 1}" r="${r * 0.5}" fill="#1d1d1d"/>`;
  return mood === "sad" ? e + `<path d="M${x1 - 6} ${y - 9}l9 3M${x2 + 6} ${y - 9}l-9 3" stroke="#1d1d1d" stroke-width="2.5" stroke-linecap="round"/><path d="M${x2 + 5} ${y + 6} q3 6 0 9 q-3 -3 0 -9z" fill="#4dabf7" stroke="#1d1d1d" stroke-width="1.5"/>` : e;
}
function beastArt(id, mood) {
  const K = "#1d1d1d";
  if (id === "long") return `<path d="M18 98 C34 66 62 104 74 76 S68 46 84 40" fill="none" stroke="${K}" stroke-width="20" stroke-linecap="round"/><path d="M18 98 C34 66 62 104 74 76 S68 46 84 40" fill="none" stroke="#1f9e8f" stroke-width="13" stroke-linecap="round"/><path d="M22 92 C36 70 60 100 70 76" fill="none" stroke="#9ee6d6" stroke-width="3" stroke-dasharray="4 5"/><path d="M14 100 l-8 -2 l6 -6 l-6 -6 l10 2" fill="#ffd43b" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M84 26 l-6 -14 M96 26 l4 -14" stroke="#e8a800" stroke-width="5" stroke-linecap="round"/><path d="M84 26 l-6 -14 M96 26 l4 -14" stroke="${K}" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="90" cy="38" rx="18" ry="14" fill="#1f9e8f" stroke="${K}" stroke-width="3.5"/><ellipse cx="104" cy="44" rx="9" ry="7" fill="#9ee6d6" stroke="${K}" stroke-width="3"/><circle cx="106" cy="42" r="1.6" fill="${K}"/><path d="M108 48 q10 4 10 14 M104 50 q4 10 -2 16" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round"/>${petEyes(84, 95, 34, mood, 4.5)}`;
  if (id === "ho") return `<ellipse cx="60" cy="96" rx="30" ry="16" fill="#e9e4d8" stroke="${K}" stroke-width="3.5"/><path d="M44 92 l6 8 M56 90 l2 10 M70 90 l-2 10" stroke="${K}" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="34" r="11" fill="#e9e4d8" stroke="${K}" stroke-width="3.5"/><circle cx="86" cy="34" r="11" fill="#e9e4d8" stroke="${K}" stroke-width="3.5"/><circle cx="34" cy="34" r="5" fill="#f4a6b5"/><circle cx="86" cy="34" r="5" fill="#f4a6b5"/><ellipse cx="60" cy="60" rx="34" ry="30" fill="#e9e4d8" stroke="${K}" stroke-width="3.5"/><path d="M52 34 l2 8 M60 32 v9 M68 34 l-2 8 M28 56 h10 M28 64 h8 M92 56 h-10 M92 64 h-8" stroke="${K}" stroke-width="3.5" stroke-linecap="round"/>${petEyes(48, 72, 58, mood, 5.5)}<path d="M55 68 h10 l-5 6z" fill="#f4a6b5" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 74 q-6 6 -11 2 M60 74 q6 6 11 2" fill="none" stroke="${K}" stroke-width="2.5" stroke-linecap="round"/><path d="M40 70 l-14 2 M40 74 l-13 6 M80 70 l14 2 M80 74 l13 6" stroke="${K}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (id === "tuoc") return `<path d="M44 84 Q20 96 8 116 M50 88 Q36 104 30 118 M40 80 Q12 84 4 100" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round"/><path d="M44 84 Q20 96 8 116 M50 88 Q36 104 30 118 M40 80 Q12 84 4 100" fill="none" stroke="#e0452b" stroke-width="5" stroke-linecap="round"/><path d="M8 116 l-4 -8 l8 2z M30 118 l-6 -6 l8 -2z M4 100 l-2 -9 l8 4z" fill="#ffd43b" stroke="${K}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="62" cy="78" rx="26" ry="20" fill="#e0452b" stroke="${K}" stroke-width="3.5"/><path d="M52 74 Q64 62 78 76 Q66 92 52 74Z" fill="#ff8a5c" stroke="${K}" stroke-width="2.5"/><path d="M66 30 q-4 -14 6 -20 q-2 10 6 12 q2 -10 10 -12 q-6 12 0 22z" fill="#ffd43b" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="76" cy="44" r="18" fill="#e0452b" stroke="${K}" stroke-width="3.5"/><path d="M92 44 l14 4 l-14 6z" fill="#ffb000" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>${petEyes(72, 84, 42, mood, 4)}<path d="M56 98 v10 l-4 4 M66 98 v10 l4 4" stroke="${K}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  return `<ellipse cx="66" cy="78" rx="40" ry="26" fill="#34495e" stroke="${K}" stroke-width="3.5"/><path d="M28 80 Q66 30 104 80" fill="#4a6278" stroke="${K}" stroke-width="3.5"/><path d="M50 56 l10 -8 l12 0 l10 8 l-6 12 h-20z M44 72 l6 -16 M88 72 l-6 -16" fill="none" stroke="#9fb3c8" stroke-width="2.5" stroke-linejoin="round"/><path d="M38 98 v10 h10 v-8 M84 98 v10 h10 v-12" fill="#5c7a8a" stroke="${K}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="18" cy="74" rx="14" ry="11" fill="#5c7a8a" stroke="${K}" stroke-width="3.5"/>${petEyes(12, 22, 71, mood, 3.5)}<path d="M104 82 Q122 70 110 52 Q98 36 110 24" fill="none" stroke="${K}" stroke-width="11" stroke-linecap="round"/><path d="M104 82 Q122 70 110 52 Q98 36 110 24" fill="none" stroke="#3c8d5a" stroke-width="6" stroke-linecap="round"/><ellipse cx="104" cy="20" rx="10" ry="7" fill="#3c8d5a" stroke="${K}" stroke-width="3"/><circle cx="100" cy="18" r="1.8" fill="${K}"/><path d="M95 22 l-6 1 l3 2 l-3 2 l6 -1" fill="none" stroke="#e03131" stroke-width="1.5"/>`;
}
function petSvg(bi, stage, mood) {
  const b = BEASTS[bi], tint = "";
  if (stage === 0) return `<svg viewBox="0 0 120 120" class="pet-svg m-${mood}"><ellipse cx="60" cy="108" rx="30" ry="6" fill="#000" opacity=".12"/><path d="M60 18 C88 18 98 62 96 80 C94 100 80 108 60 108 C40 108 26 100 24 80 C22 62 32 18 60 18Z" fill="${b.col}" stroke="#1d1d1d" stroke-width="4"/><path d="M34 64 q8 -8 16 0 t16 0 t16 0 t12 -2" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/><circle cx="46" cy="44" r="5" fill="#fff" opacity=".6"/>${stage === 0 && mood === "near" ? `<path d="M52 20 l4 12 l-6 8 l8 10" fill="none" stroke="#1d1d1d" stroke-width="3"/>` : ""}${tint}</svg>`;
  const sc = [0, 0.72, 0.88, 1][stage], tr = `translate(${60 - 60 * sc} ${118 - 118 * sc}) scale(${sc})`;
  const aura = stage === 3 ? `<circle cx="60" cy="62" r="56" fill="url(#pa-${b.id})" class="pet-aura"/><defs><radialGradient id="pa-${b.id}"><stop offset="0" stop-color="#ffe066" stop-opacity=".75"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient></defs>` : "";
  return `<svg viewBox="0 0 120 120" class="pet-svg m-${mood}">${aura}<ellipse cx="60" cy="114" rx="${30 * sc}" ry="5" fill="#000" opacity=".12"/><g transform="${tr}">${beastArt(b.id, mood === "near" ? "normal" : mood)}</g>${stage === 3 ? `<g class="pet-spark"><path d="M14 30 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z M104 92 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="#ffd43b" stroke="#1d1d1d" stroke-width="1.5"/></g>` : ""}${tint}</svg>`;
}
function petState(list) {
  const gc = Math.max(fq().gfullN || 0, ...list.map(m => m.gc || 0)), bi = Math.floor(gc / PET_DAYS), p = gc % PET_DAYS;
  const stage = p <= 2 ? 0 : p <= 6 ? 1 : p <= 10 ? 2 : 3;
  return { gc, bi: bi % 4, round: Math.floor(bi / 4), p, stage, owned: Math.min(4, bi) };
}
function petCard(list) {
  const S = petState(list), t = today(), y = addDays(t, -1), b = BEASTS[S.bi];
  const memY = list.filter(m => (m.joined || "0") <= y), missY = memY.filter(m => !m.days?.[y]), notT = list.filter(m => m.days?.[t] !== 1 && m.days?.[t] !== 2);
  let mood, say;
  if (grpDayAll(t, list)) { mood = "happy"; say = "Vui quá! Cả nhóm đã xong hôm nay, mình lớn thêm rồi."; }
  else if (memY.length && !grpDayAll(y, list) && !grpDayAll(addDays(y, -1), list) && list.some(m => (m.joined || "0") <= addDays(y, -1))) { mood = "sick"; say = "Mình bị ốm rồi… 2 ngày liền nhóm chưa làm đủ. " + (notT.length ? "Còn chờ: " + notT.map(m => m.name).join(", ") + "." : ""); }
  else if (memY.length && missY.length) { mood = "sad"; say = "Buồn quá, hôm qua " + missY.map(m => m.name).join(", ") + " chưa làm bài. Hôm nay đừng bỏ nhé!"; }
  else { mood = S.stage === 0 && S.p === 2 ? "near" : "normal"; say = notT.length ? "Đang chờ " + notT.map(m => m.name).join(", ") + " làm xong hôm nay." : "Mọi người đều xong rồi!"; }
  const stName = ["Trứng", "Con non", "Trưởng thành", "Thần thú"][S.stage], need = PET_DAYS - S.p;
  return h("section", { class: "card stack pet-card", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Thần thú của nhóm"), h("span", { class: "small muted" }, `Đã thuần hóa ${S.owned}/4` + (S.round ? ` · vòng ${S.round + 1}` : ""))),
    h("div", { class: "row", style: "gap:18px;align-items:center;flex-wrap:wrap" },
      h("div", { class: "pet-wrap", html: petSvg(S.bi, S.stage, mood) }),
      h("div", { class: "stack", style: "gap:8px;flex:1;min-width:200px" }, h("b", { style: "font-size:1.15rem" }, `${b.name} · ${stName}`), h("span", { class: "small muted" }, `Thần thú trấn giữ ${b.dir}`),
        h("div", { class: "pet-say" }, say),
        h("div", { class: "g-pass" }, h("i", { style: `width:${S.p / PET_DAYS * 100}%;background:${b.id === "ho" ? "#adb5bd" : b.col}` })),
        h("span", { class: "small muted" }, `Lớn lên mỗi ngày cả nhóm cùng làm đủ nhiệm vụ. Còn ${need} ngày như vậy nữa để ${S.stage === 3 ? "thuần hóa xong" : "trưởng thành"} và ấp trứng thần thú tiếp theo.`))),
    h("div", { class: "pet-col" }, BEASTS.map((x, i) => h("div", { class: "pet-slot" + (i < S.owned ? " on" : i === S.bi ? " cur" : "") }, h("div", { html: i < S.owned || i === S.bi && S.stage > 0 ? petSvg(i, i < S.owned ? 3 : S.stage, "normal") : petSvg(i, 0, "normal") }), h("span", { class: "small" }, i < S.owned ? x.name : i === S.bi ? x.name + " (đang nuôi)" : "???")))));
}

/* ----- Thành tựu ----- */
function runLen(dates, ok) { let best = 0, cur = 0, prev = null; for (const d of dates.sort()) { if (!ok(d)) { cur = 0; prev = d; continue; } cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur); prev = d; } return best; }
const ACH = [
  ["d1", "🌱", "Bước đầu", "Lần đầu làm đủ nhiệm vụ trong ngày", q => Object.values(q.days).includes(1)],
  ["s7", "🔥", "Một tuần lửa", "Chuỗi 7 ngày", q => q.best >= 7], ["s30", "🌋", "Núi lửa", "Chuỗi 30 ngày", q => q.best >= 30], ["s100", "☄️", "Bất diệt", "Chuỗi 100 ngày", q => q.best >= 100],
  ["early", "🐓", "Chim sớm", "Xong nhiệm vụ trước 7 giờ sáng", q => Object.values(q.fin).some(t => new Date(t).getHours() < 7)],
  ["owl", "🦉", "Cú đêm", "Xong nhiệm vụ sau 23 giờ", q => Object.values(q.fin).some(t => new Date(t).getHours() >= 23)],
  ["week", "📅", "Trọn tuần", "Làm đủ cả 7 ngày từ thứ Hai đến Chủ nhật", q => Object.keys(q.days).some(d => new Date(d + "T00:00:00").getDay() === 1 && dqWeekDays(d).every(x => q.days[x] === 1))],
  ["vr10", "📗", "Mọt từ", "Qua 10 bài Lộ trình từ vựng", () => vrPassN() >= 10], ["vr50", "📚", "Từ điển sống", "Qua 50 bài Lộ trình từ vựng", () => vrPassN() >= 50],
  ["spk", "🎙️", "Miệng không nghỉ", "14 ngày liền làm đủ phần Nói", q => runLen(Object.keys(q.sk), d => q.sk[d].includes("S")) >= 14],
  ["lst", "🎧", "Tai thính", "7 ngày liền làm đủ phần Nghe", q => runLen(Object.keys(q.sk), d => q.sk[d].includes("L")) >= 7],
  ["boss", "⚔️", "Diệt boss", "Cùng nhóm hạ một boss tuần", q => Object.keys(q.bossW).length > 0],
  ["pet1", "🥚", "Người chăn thú", "Nuôi một thần thú đến lúc thuần hóa", () => petState(grpMine()).gc >= PET_DAYS], ["pet4", "🏯", "Tứ linh hội tụ", "Thuần hóa đủ 4 thần thú", () => petState(grpMine()).gc >= PET_DAYS * 4],
  ["chest", "🎁", "Thợ săn rương", "Mở 10 rương", q => q.opened >= 10], ["legend", "👑", "Vận may huyền thoại", "Mở trúng đồ Huyền thoại", q => q.rew.frame.includes(LEGEND_FRAME)],
  ["poke", "👉", "Người nhắc nhở", "Chọc bạn 10 lần", q => q.pokeN >= 10],
  ["lv5", "⭐", "Level 5", "Đạt Level 5", () => levelOf(P.xp || 0).L >= 5], ["lv10", "🌟", "Level 10", "Đạt Level 10", () => levelOf(P.xp || 0).L >= 10],
  ["top", "🥇", "Quán quân tuần", "Đứng đầu xếp hạng một tuần đã kết thúc", q => !!q.topW]];
function vrPassN() { let n = 0; for (const s of Object.values(P.vr || {})) for (const l of Object.values(s.l || {})) if (l.c && l.x) n++; return n; }
function achCheck() {
  const q = fq(); let ch = false;
  for (const [id, ico, name, , ok] of ACH) if (!q.ach[id]) { let v = false; try { v = ok(q); } catch {} if (v) { q.ach[id] = today(); ch = true; toast(`Thành tựu mới: ${ico} ${name}`); } }
  return ch;
}
function achCard(list) {
  const q = fq(), me = window.__grp?.uid;
  return h("section", { class: "card stack", style: "gap:12px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Thành tựu"), h("b", null, `${Object.keys(q.ach).length}/${ACH.length}`)),
    h("div", { class: "ach-grid" }, ACH.map(([id, ico, name, how]) => h("div", { class: "ach" + (q.ach[id] ? " on" : ""), title: how }, h("span", { class: "ach-ico" }, ico), h("b", null, name), h("span", { class: "small muted" }, how), q.ach[id] ? h("span", { class: "small" }, "Mở ngày " + fmtDate(new Date(q.ach[id] + "T00:00:00"))) : null))),
    h("div", { class: "stack", style: "gap:6px" }, list.filter(m => m.id !== me).map(m => h("div", { class: "row small", style: "gap:8px;flex-wrap:wrap;align-items:center" }, gAva(m, 22), h("b", null, m.name + ":"), (m.ach || []).length ? (m.ach || []).map(a => { const x = ACH.find(z => z[0] === a); return x ? h("span", { title: x[2] }, x[1]) : null; }) : h("span", { class: "muted" }, "chưa có")))));
}

/* ----- Lịch sử học kiểu ô vuông cả năm ----- */
function hmEnc(q) { const t = today(), arr = []; for (let i = 370; i >= 0; i--) arr.push(Math.min(1295, Math.round(q.hm[addDays(t, -i)] || 0)).toString(36)); return { end: t, v: arr.join(",") }; }
function hmDec(m) { const o = {}; if (!m?.hm?.v) return o; const a = m.hm.v.split(","); a.forEach((v, i) => { const n = parseInt(v, 36); if (n) o[addDays(m.hm.end, i - (a.length - 1))] = n; }); return o; }
let hmWho = null;
function heatCard(list) {
  const me = window.__grp?.uid; hmWho ||= me; const m = list.find(x => x.id === hmWho) || list[0];
  const data = m.id === me ? fq().hm : hmDec(m), t = today(), start = addDays(t, -364 - ((new Date(t + "T00:00:00").getDay() + 6) % 7));
  const lvl = n => !n ? 0 : n < 15 ? 1 : n < 30 ? 2 : n < 50 ? 3 : 4, cells = [], months = [];
  let d = start, col = 0, lastM = "";
  while (d <= t) { const wd = (new Date(d + "T00:00:00").getDay() + 6) % 7; if (wd === 0 && d.slice(5, 7) !== lastM && d.slice(8) <= "07") { months.push(h("span", { style: `grid-column:${col + 1}` }, "Th" + +d.slice(5, 7))); lastM = d.slice(5, 7); }
    cells.push(h("i", { class: "hm l" + lvl(data[d]), style: `grid-column:${col + 1};grid-row:${wd + 1}`, title: `${fmtDate(new Date(d + "T00:00:00"))}: ${data[d] || 0} phút` })); if (wd === 6) col++; d = addDays(d, 1); }
  const days = Object.values(data).filter(Boolean).length, mins = Object.values(data).reduce((a, b) => a + b, 0);
  return h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Lịch sử học cả năm"),
    h("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, list.map(x => h("button", { class: "btn" + (x.id === m.id ? " btn-primary" : ""), type: "button", onclick: () => { hmWho = x.id; render(); } }, x.name))),
    h("span", { class: "small muted" }, `${m.name}: học ${days} ngày, tổng ${Math.round(mins / 60)} giờ ${mins % 60} phút trong 12 tháng qua.`),
    h("div", { class: "hm-wrap" }, h("div", { class: "hm-mon" }, months), h("div", { class: "hm-grid" }, cells)),
    h("div", { class: "row small muted", style: "gap:6px;align-items:center" }, "Ít", [0, 1, 2, 3, 4].map(l => h("i", { class: "hm l" + l, style: "display:inline-block" })), "Nhiều", h("span", null, "· theo số phút học mỗi ngày")));
}

/* ----- Gắn vào nhóm ----- */
(function () {
  const _aw = award;
  award = function (type, xp, ...rest) { return _aw(type, P?.dq?.x2 === today() ? xp * 2 : xp, ...rest); };
  const _fz = dqFreeze;
  dqFreeze = function () { if (_fz()) return true; const q = fq(), y = addDays(today(), -1); if (!q.days[y] && q.days[addDays(y, -1)] && q.frzX > 0 && y >= q.joined) { q.days[y] = 2; q.frzX--; return true; } return false; };
  const _tk = dqTick;
  dqTick = function () {
    _tk(); if (!P) return;
    const q = fq(), t = today(); let ch = false;
    for (const e of q.emo) AVA_EMO.includes(e) || AVA_EMO.push(e);
    if (q.days[t] === 1 && !q.chD[t]) { q.chD[t] = 1; q.chest++; ch = true; setTimeout(() => toast("Bạn nhận được 1 rương 🎁"), 900); }
    for (const k of Object.keys(q.chD)) if (k < addDays(t, -10)) { delete q.chD[k]; ch = true; }
    const s = dqStreak(q.days); if (s > q.best) { q.best = s; ch = true; }
    for (const [d, l] of Object.entries(P.log || {})) { const v = Math.round(l.min || 0); if (v && q.hm[d] !== v) { q.hm[d] = v; ch = true; } }
    for (const k of Object.keys(q.hm)) if (k < addDays(t, -371)) delete q.hm[k];
    const list = grpMine();
    if (list.length) {
      for (let i = 0; i < 14; i++) { const d = addDays(t, -i); if (!q.gfull[d] && grpDayAll(d, list)) { q.gfull[d] = 1; ch = true; } }
      const n = Object.keys(q.gfull).length; if (q.gfullN !== n) { q.gfullN = n; ch = true; }
      for (const wid of [weekOf(t), addDays(weekOf(t), -7)]) {
        if (q.bossW[wid]) continue; const mem = list.filter(m => (m.joined || "0") <= addDays(wid, 6));
        const dmg = mem.reduce((s, m) => s + (m.wx?.[wid] || 0), 0); if (mem.length && dmg >= BOSS_HP_PER * mem.length) { q.bossW[wid] = 1; q.chest++; ch = true; setTimeout(() => toast("Đã hạ boss tuần! +1 rương 🎁"), 1200); }
      }
      const lw = addDays(weekOf(t), -7);
      if (list.length > 1 && !q.topW?.[lw]) { const r = list.map(m => ({ m, ...grpWeekStat(m, lw) })).filter(x => x.el).sort((a, b) => b.pct - a.pct || b.xp - a.xp); if (r[0]?.m.id === window.__grp?.uid && r[0].pct > 0 && (!r[1] || r[0].pct > r[1].pct || r[0].xp > r[1].xp)) { (q.topW ||= {})[lw] = 1; ch = true; } }
    }
    if (achCheck()) ch = true;
    if (ch) saveProfile();
  };
  const _pub = dqPublic;
  dqPublic = function () { const d = _pub(), q = fq(); return { ...d, ach: Object.keys(q.ach), gc: q.gfullN || 0, hm: hmEnc(q), opened: q.opened }; };
  const _pk = grpPoke;
  grpPoke = function (m) { fq().pokeN++; return _pk(m); };
  const _dc = dqCard;
  dqCard = function () { const n = _dc(), q = fq(); if (q.chest) n.querySelector("h2")?.after(h("button", { class: "btn btn-primary ch-go", type: "button", onclick: chestOpen, style: "align-self:flex-start" }, `🎁 Mở rương (${q.chest})`)); return n; };
  const _pg = pageGroup;
  pageGroup = function () {
    const n = _pg(), list = grpMine(), secs = [...n.querySelectorAll(":scope > section")];
    const prof = secs[0], board = secs.find(s => s.querySelector("h2")?.textContent === "Hôm nay của cả nhóm");
    const cb = chestBar(); if (cb && prof) prof.after(cb);
    board?.after(bossCard(list), petCard(list));
    const sum = secs.find(s => /Tổng kết/.test(s.querySelector("h2")?.textContent || "")); sum ? sum.before(achCard(list), heatCard(list)) : n.append(achCard(list), heatCard(list));
    return n;
  };
  document.head.append(h("style", null, `.ch-ov{position:fixed;inset:0;z-index:90;background:rgba(10,10,20,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:16px}
.ch-stage{position:relative;width:min(320px,86vw);height:320px;display:grid;place-items:center}
.ch-box{width:170px;position:relative;z-index:2}.ch-svg{width:100%;overflow:visible}.ch-lid{transform-origin:20px 52px;transition:transform .6s cubic-bezier(.3,1.6,.5,1),opacity .6s}
.ch-stage.shake .ch-box{animation:chShake .12s linear infinite}.ch-stage.shake .ch-box::after{content:"";position:absolute;inset:-20px;border-radius:50%;background:radial-gradient(var(--rc),transparent 65%);opacity:.0;animation:chGlow 1.1s ease-in forwards}
.ch-stage.open .ch-lid{transform:translate(-30px,-70px) rotate(-55deg);opacity:0}.ch-stage.open .ch-box{animation:chDrop .5s ease-out forwards}
.ch-rays{position:absolute;width:520px;height:520px;left:50%;top:50%;margin:-260px 0 0 -260px;border-radius:50%;background:repeating-conic-gradient(from 0deg,var(--rc) 0 10deg,transparent 10deg 24deg);opacity:0;transform:scale(.2);-webkit-mask:radial-gradient(#000 20%,transparent 68%);mask:radial-gradient(#000 20%,transparent 68%)}
.ch-stage.open .ch-rays{animation:chRays 6s linear forwards}
.ch-item{position:absolute;z-index:3;top:4px;left:50%;width:min(260px,80vw);transform:translate(-50%,40px) scale(.3);opacity:0;background:#fffdf6;color:#1d1d1d;border:4px solid var(--rc);border-radius:16px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;box-shadow:0 0 40px var(--rc)}
.ch-stage.open .ch-item{animation:chItem .7s .25s cubic-bezier(.2,1.6,.4,1) forwards}.ch-ico{font-size:46px;line-height:1}.ch-rar{font:700 .72rem/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--rc)}
.ch-stage.r-l .ch-item{background:linear-gradient(135deg,#fff7d1,#ffe8a3,#fff7d1);animation:chItem .7s .25s cubic-bezier(.2,1.6,.4,1) forwards,chShine 1.6s 1s ease-in-out infinite}
.ch-cf{position:absolute;left:50%;top:55%;width:9px;height:14px;border-radius:2px;z-index:4;opacity:0;animation:chCf 1.4s ease-out forwards}
.ch-btns{display:flex;gap:10px;opacity:0;animation:chIn .3s 1.8s forwards}.ch-mini{width:56px;flex:none}.ch-go{animation:chPulse 1.6s ease-in-out infinite}
@keyframes chShake{0%{transform:rotate(-4deg) translateX(-3px)}50%{transform:rotate(4deg) translateX(3px)}100%{transform:rotate(-4deg) translateX(-3px)}}
@keyframes chGlow{to{opacity:.9}}@keyframes chDrop{to{transform:translateY(70px) scale(.8);opacity:.85}}
@keyframes chRays{0%{opacity:0;transform:scale(.2) rotate(0)}12%{opacity:.85;transform:scale(1) rotate(20deg)}100%{opacity:.5;transform:scale(1) rotate(200deg)}}
@keyframes chItem{to{transform:translate(-50%,0) scale(1);opacity:1}}@keyframes chShine{50%{box-shadow:0 0 70px #ffd43b}}
@keyframes chCf{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--x),calc(var(--y) + 160px)) rotate(var(--r))}}
@keyframes chIn{to{opacity:1}}@keyframes chPulse{50%{transform:scale(1.05)}}
.boss-wrap{width:130px;flex:none}.boss-svg{width:100%;animation:bossIdle 2.4s ease-in-out infinite}.boss-svg.hurt{animation:bossHurt .5s 3}.boss-svg.dead{animation:none;transform:rotate(90deg) translateX(20px);filter:grayscale(.7);opacity:.8}
@keyframes bossIdle{50%{transform:translateY(-5px) scale(1.02)}}@keyframes bossHurt{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px);filter:brightness(2) saturate(0)}75%{transform:translateX(8px)}}
.boss-hp{position:relative;height:22px;border:3px solid var(--edge,#1d1d1d);border-radius:6px;background:var(--line);overflow:hidden}.boss-hp i{display:block;height:100%;transition:width .8s}
.boss-hp span{position:absolute;inset:0;display:grid;place-items:center;font:700 .78rem/1 ui-monospace,monospace;color:#fff;text-shadow:0 1px 2px #000}
.boss-dmg{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--line)}.boss-dmg i{display:block;height:100%}.boss-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.pet-wrap{width:150px;flex:none}.pet-svg{width:100%;overflow:visible}.pet-svg.m-happy{animation:petHop 1s ease-in-out infinite}.pet-svg.m-normal,.pet-svg.m-near{animation:petBreath 3s ease-in-out infinite}
.pet-svg.m-sad{transform:translateY(4px);filter:saturate(.6)}.pet-svg.m-sick{animation:petWob 2.4s ease-in-out infinite;filter:saturate(.4) hue-rotate(40deg)}.pet-svg.m-near{animation:petWob .5s ease-in-out infinite}
.pet-aura{animation:petAura 2.4s ease-in-out infinite;transform-origin:60px 62px}.pet-spark{animation:petSpark 1.6s ease-in-out infinite}
@keyframes petHop{0%,100%{transform:translateY(0)}40%{transform:translateY(-12px) scaleY(1.04)}60%{transform:translateY(0) scaleY(.94)}}@keyframes petBreath{50%{transform:scale(1.025)}}
@keyframes petWob{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}@keyframes petAura{50%{transform:scale(1.08);opacity:.7}}@keyframes petSpark{50%{opacity:.3}}
.pet-say{position:relative;background:var(--surface);border:2px solid var(--edge,#1d1d1d);border-radius:12px;padding:8px 12px;font-size:.92rem}
.pet-col{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pet-slot{border:2px dashed var(--line);border-radius:12px;padding:6px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px}
.pet-slot>div{width:64px}.pet-slot:not(.on):not(.cur)>div{filter:brightness(0);opacity:.25}.pet-slot.on{border-style:solid;border-color:var(--good,#0e8a6a)}.pet-slot.cur{border-style:solid}
.ach-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.ach{border:1px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:3px;opacity:.45;filter:grayscale(1)}
.ach.on{opacity:1;filter:none;border-color:var(--good,#0e8a6a);border-width:2px}.ach-ico{font-size:26px;line-height:1.1}
.hm-wrap{overflow-x:auto;padding-bottom:4px}.hm-mon{display:grid;grid-template-columns:repeat(53,13px);gap:3px;font-size:.68rem;color:var(--muted,#777);min-width:max-content;height:14px}
.hm-grid{display:grid;grid-template-columns:repeat(53,13px);grid-template-rows:repeat(7,13px);gap:3px;min-width:max-content}.hm{width:13px;height:13px;border-radius:3px;background:var(--line)}
.hm.l1{background:#b7e4c7}.hm.l2{background:#74c69d}.hm.l3{background:#2d9d63}.hm.l4{background:#1b6b42}
@media (prefers-reduced-motion:reduce){.ch-ov *,.boss-svg,.pet-svg,.ch-go{animation-duration:.01s!important;animation-iteration-count:1!important}}`));
})();
