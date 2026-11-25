/* ===== Tháp vô tận: mỗi người leo tháp riêng, so tầng với nhóm. Không mạng, không rơi: sai thì làm lại tầng đó với câu mới.
   Càng cao càng khó: nhiều câu hơn mỗi tầng, có đồng hồ, mở thêm dạng khó, từ vựng cấp CEFR cao hơn. Không gọi AI. ===== */
const TW_BANK = [
  /* Collocation */
  ["W", "Governments must ___ measures to reduce air pollution.", ["take", "do", "make", "put"], 0, "take measures: thực hiện biện pháp."],
  ["W", "Social media can ___ awareness of environmental issues.", ["raise", "rise", "arise", "grow"], 0, "raise awareness: nâng cao nhận thức (raise là ngoại động từ)."],
  ["W", "Scientists need more funding to ___ research on rare diseases.", ["do", "make", "take", "give"], 0, "do research, không nói make research."],
  ["W", "Overcrowded cities ___ a serious threat to public health.", ["pose", "put", "give", "set"], 0, "pose a threat: gây ra mối đe dọa."],
  ["W", "Online courses can help ___ the gap between rural and urban students.", ["bridge", "close up", "build", "fill up"], 0, "bridge the gap: thu hẹp khoảng cách."],
  ["W", "Farmers are struggling to ___ the growing demand for food.", ["meet", "reach", "get", "answer"], 0, "meet the demand: đáp ứng nhu cầu."],
  ["W", "Parents ___ a crucial role in shaping children's habits.", ["play", "make", "do", "take"], 0, "play a role: đóng vai trò."],
  ["W", "It is difficult to ___ a conclusion from such limited data.", ["draw", "pull", "make up", "take out"], 0, "draw a conclusion: rút ra kết luận."],
  ["W", "The two countries failed to ___ an agreement on trade.", ["reach", "arrive", "get to do", "achieve to"], 0, "reach an agreement: đạt được thỏa thuận."],
  ["W", "Governments should ___ the issue of youth unemployment urgently.", ["address", "solve out", "speak", "talk"], 0, "address an issue: giải quyết vấn đề."],
  ["W", "People who never exercise ___ the risk of heart disease.", ["run", "take on", "make", "do"], 0, "run the risk of: có nguy cơ."],
  ["W", "Teachers should ___ a good example for their students.", ["set", "make", "do", "put"], 0, "set an example: làm gương."],
  ["W", "Rising rents have had a huge impact ___ young families.", ["on", "to", "for", "with"], 0, "have an impact on."],
  ["W", "There has been a sharp increase ___ the number of electric cars.", ["in", "of", "on", "at"], 0, "an increase in + thứ tăng; increase of + lượng tăng."],
  ["W", "Sales rose ___ 20% to 35% between 2010 and 2020.", ["from", "by", "at", "with"], 0, "rise from X to Y; rise by = tăng thêm."],
  ["W", "The figure for Japan was similar ___ that for Korea.", ["to", "with", "as", "than"], 0, "similar to."],
  /* Word form */
  ["W", "The ___ of public transport has reduced traffic jams.", ["expansion", "expand", "expansive", "expanded"], 0, "Sau The cần danh từ: expansion."],
  ["W", "Children who read widely tend to be more ___.", ["imaginative", "imagination", "imagine", "imaginatively"], 0, "Sau be more cần tính từ."],
  ["W", "The number of tourists increased ___ after 2015.", ["dramatically", "dramatic", "drama", "dramatize"], 0, "Bổ nghĩa cho động từ increased: trạng từ."],
  ["W", "There was a ___ decline in coal use.", ["significant", "significance", "significantly", "signify"], 0, "Trước danh từ decline: tính từ."],
  ["W", "Many people feel ___ about the future of their jobs.", ["anxious", "anxiety", "anxiously", "anxiousness"], 0, "feel + tính từ."],
  ["W", "Exercise has many ___ for mental health.", ["benefits", "beneficial", "beneficially", "benefited"], 0, "many + danh từ số nhiều."],
  ["W", "The new policy was ___ by most residents.", ["welcomed", "welcome", "welcoming", "welcomes"], 0, "Bị động: was + V3."],
  ["W", "Air pollution is ___ to the elderly.", ["harmful", "harm", "harmfully", "harmless"], 0, "harmful to: có hại cho."],
  ["W", "A large ___ of students prefer online lessons.", ["proportion", "proportional", "proportionally", "propose"], 0, "a large proportion of."],
  ["W", "The government is ___ for providing clean water.", ["responsible", "responsibility", "responsibly", "respond"], 0, "be responsible for."],
  /* Câu sai ngữ pháp */
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["The number of students has risen.", "The number of students have risen.", "A number of students has risen.", "The numbers of student has risen."], 0, "The number of … + động từ số ít."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["Although it was expensive, many people bought it.", "Although it was expensive, but many people bought it.", "Despite it was expensive, many people bought it.", "Although of the price, many people bought it."], 0, "Although không đi với but; despite + danh từ."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["People who live in cities often feel stressed.", "People which live in cities often feel stressed.", "People live in cities often feels stressed.", "People who lives in cities often feel stressed."], 0, "who cho người; people số nhiều."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["In 2010, sales were higher than in 2000.", "In 2010, sales was higher than 2000.", "In 2010, sales were more higher than in 2000.", "In 2010, sales were higher as in 2000."], 0, "sales số nhiều; không dùng more higher."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["The bottles are washed and then crushed.", "The bottles washed and then crushed.", "The bottles are wash and then crush.", "The bottles is washed and then crushed."], 0, "Quy trình dùng bị động: are + V3."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["By 2030, the figure will have doubled.", "By 2030, the figure will double already.", "By 2030, the figure has doubled.", "By 2030, the figure will have double."], 0, "By + mốc tương lai: tương lai hoàn thành."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["Not only does tourism create jobs, but it also brings income.", "Not only tourism creates jobs, but it also brings income.", "Not only does tourism creates jobs, but also brings income.", "Not only tourism does create jobs, it also brings income."], 0, "Not only đứng đầu câu thì đảo trợ động từ."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["Fewer people smoke than in the past.", "Less people smoke than in the past.", "Fewer people smokes than in the past.", "Lesser people smoke than in the past."], 0, "people đếm được: fewer."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["It is essential that every child have access to education.", "It is essential that every child has access to education is.", "It is essential every child to have access education.", "It is essential that every children have access to education."], 0, "Thể giả định: that + S + V nguyên mẫu."],
  ["W", "Câu nào ĐÚNG ngữ pháp?", ["Having finished the report, she sent it to her manager.", "Having finished the report, it was sent to her manager.", "Finished the report, she sent it to her manager.", "Having finish the report, she sent it to her manager."], 0, "Chủ ngữ của mệnh đề chính phải là người làm việc ở cụm Having V3."],
  /* Đọc hiểu nhanh: True / False / Not Given */
  ["R", "“The museum, which opened in 1998, attracts about two million visitors a year, most of them from abroad.” Nhận định: Most visitors to the museum are foreigners.", ["True", "False", "Not Given"], 0, "most of them from abroad = phần lớn là người nước ngoài."],
  ["R", "“The bridge was completed in 2005, two years later than planned.” Nhận định: The bridge was finished on schedule.", ["True", "False", "Not Given"], 1, "Trễ hai năm, nên không đúng kế hoạch."],
  ["R", "“Researchers tested the drug on 200 adults over six months.” Nhận định: The drug was also tested on children.", ["True", "False", "Not Given"], 2, "Bài chỉ nói người lớn, không nói có hay không thử trên trẻ em."],
  ["R", "“Although bicycles are cheap, few residents use them because of the city's steep hills.” Nhận định: The city's geography discourages cycling.", ["True", "False", "Not Given"], 0, "steep hills là lý do ít người đạp xe."],
  ["R", "“The company employs 3,000 people, a third of whom work from home.” Nhận định: Over half of the staff work remotely.", ["True", "False", "Not Given"], 1, "Một phần ba, không phải hơn một nửa."],
  ["R", "“Coffee was first grown in Ethiopia before spreading to Yemen.” Nhận định: Yemen is now the largest coffee producer.", ["True", "False", "Not Given"], 2, "Bài không nói gì về hiện nay."],
  ["R", "“Unlike most birds, the kiwi cannot fly.” Nhận định: Most birds are able to fly.", ["True", "False", "Not Given"], 0, "Unlike most birds ngầm nói phần lớn chim bay được."],
  ["R", "“The festival is held every two years, usually in early spring.” Nhận định: The festival takes place annually.", ["True", "False", "Not Given"], 1, "every two years: hai năm một lần."],
  ["R", "“Some experts claim that the policy reduced crime, but others disagree.” Nhận định: All experts agree the policy reduced crime.", ["True", "False", "Not Given"], 1, "others disagree, nên không phải tất cả."],
  ["R", "“The library's new wing, funded by a local businessman, houses rare maps.” Nhận định: The businessman collected the rare maps himself.", ["True", "False", "Not Given"], 2, "Chỉ nói ông tài trợ, không nói ai sưu tầm bản đồ."],
  ["R", "“Since the tax was introduced, sugary drink sales have fallen by 15%.” Nhận định: Sales of sugary drinks have declined.", ["True", "False", "Not Given"], 0, "fallen by 15% = giảm."],
  ["R", "“The village has no hospital; the nearest one is 40 km away.” Nhận định: Villagers must travel to receive hospital care.", ["True", "False", "Not Given"], 0, "Không có bệnh viện trong làng nên phải đi xa."]
];
const TW_SK = { L: "listening", S: "speaking", R: "reading", W: "writing", V: "vocab" };
const twS = () => P.tw ||= { f: 1, best: 0, wk: {}, tries: 0 };
const twPick = a => a[Math.floor(Math.random() * a.length)];
const twShuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const twNum = f => f % 10 === 0 ? 5 : Math.min(4, 1 + Math.floor(f / 12));
const twTime = f => f <= 10 ? 0 : Math.max(8, 30 - Math.floor(f / 4));
let TW_GR = null;
function twGram() { return TW_GR ||= [...LESSONS, ...G_A, ...G_V, ...G_M, ...G_X, ...G_T].flatMap(l => (l.ex || []).filter(e => (e.t === "choice" || e.t === "fill") && !e.ds)); }
async function twMake(f) {
  const kinds = ["vt", "pr"]; if (f >= 4) kinds.push("gr"); if (f >= 8) kinds.push("nd"); if (f >= 15) kinds.push("bk", "bk"); if (f >= 25) kinds.push("vc", "vc");
  const out = [], used = new Set();
  for (let k = 0, guard = 0; out.length < twNum(f) && guard < 40; guard++) {
    const kind = twPick(kinds); let q = null;
    try {
      if (kind === "vt" || kind === "vc") {
        const ix = await vrIndex(), parts = kind === "vt" ? ix.topic : ix.cefr, part = kind === "vt" ? twPick(parts) : parts[Math.min(parts.length - 1, 1 + Math.floor((f - 25) / 15))] || twPick(parts) /* tầng 25: A2, 40: B1, 55: B2, 70: C1, 85 trở lên: C2 */;
        const data = await vrPart(part.id), it = twPick(data); if (!it || used.has("v" + it.w)) continue; used.add("v" + it.w);
        const v = vrQ(it, data); q = { sk: "V", tag: "Từ vựng", ask: v.ask, opts: v.opts, play: v.auto ? () => vrSay(it.w) : null, auto: !!v.auto, why: `${it.w} = ${it.vi}` };
      } else if (kind === "pr") {
        const L = twPick(PR_LESSONS.filter(l => l.pairs.length)), pair = twPick(L.pairs), w = pair[Math.random() < 0.5 ? 0 : 1]; if (used.has("p" + w)) continue; used.add("p" + w);
        q = { sk: "S", tag: "Phát âm", ask: h("p", { class: "prompt", style: "margin:0" }, "Nghe và chọn từ bạn nghe được"), opts: twShuf(pair).map(x => ({ t: x, ok: x === w })), play: () => spSay(w), auto: true, why: `Từ vừa đọc là “${w}”.` };
      } else if (kind === "gr") {
        const e = twPick(twGram()); if (used.has("g" + e.q)) continue; used.add("g" + e.q);
        q = e.t === "choice" ? { sk: "W", tag: "Ngữ pháp", ask: h("p", { class: "prompt", style: "margin:0" }, e.q), opts: twShuf(e.opts.map((o, j) => ({ t: o, ok: j === e.a }))), why: e.why || "" }
          : { sk: "W", tag: "Ngữ pháp", ask: h("p", { class: "prompt", style: "margin:0" }, e.q), check: v => exRight(e, v), ans: e.a[0], why: e.why || "" };
      } else if (kind === "nd") {
        const D = await ndIndex(), it = twPick(D.items.filter(x => x.c !== "addr")); if (used.has("n" + it.id)) continue; used.add("n" + it.id);
        q = { sk: "L", tag: "Nghe số và đánh vần", ask: h("p", { class: "prompt", style: "margin:0" }, (ND_CAT[it.c]?.[0] || "Nghe và ghi") + ": gõ điều bạn nghe được"), check: v => ndCheck(it, v), ans: it.a, play: () => ndPlay(it), auto: true, once: f >= 30, why: `Câu nghe: “${it.say}”` };
      } else if (kind === "bk") {
        const b = twPick(TW_BANK); if (used.has("b" + b[1])) continue; used.add("b" + b[1]);
        q = { sk: b[0], tag: b[0] === "R" ? "Đọc: True / False / Not Given" : "Bẫy IELTS", ask: h("p", { class: "prompt", style: "margin:0" }, b[1]), opts: (b[0] === "R" ? b[2] : twShuf(b[2])).map(o => ({ t: o, ok: o === b[2][b[3]] })), why: b[4] };
      }
    } catch (e) { console.warn("tower", e); continue; }
    if (q) out.push(q);
  }
  return out;
}
function twTick() { const T = UI.tw; clearInterval(T?.tick); if (!T || !T.lim || T.res) return; T.tick = setInterval(() => { if (UI.tw !== T || T.res || location.hash !== "#games") { clearInterval(T.tick); return; } const left = Math.ceil((T.dl - Date.now()) / 1000); const el = document.querySelector(".tw-clock"); if (el) el.textContent = Math.max(0, left) + " giây"; if (left <= 0) { clearInterval(T.tick); twAnswer(false, "Hết giờ."); } }, 250); }
function twStart() {
  const s = twS(), f = s.f, T = UI.tw = { f, qs: null, i: 0, res: null, lim: twTime(f), picked: null, note: "" };
  twMake(f).then(qs => { if (UI.tw !== T) return; T.qs = qs; T.dl = Date.now() + T.lim * 1000; render(); twTick(); });
  render();
}
function twAnswer(ok, note) {
  const T = UI.tw; if (!T || T.res || T.picked) return; clearInterval(T.tick);
  const q = T.qs[T.i]; T.picked = { ok, note: note || "" };
  if (!ok) { T.res = "fail"; const s = twS(); s.tries = (s.tries || 0) + 1; saveProfile(); render(); return; }
  render();
  setTimeout(() => {
    if (UI.tw !== T) return; T.i++; T.picked = null;
    if (T.i >= T.qs.length) {
      T.res = "pass"; const s = twS(), wid = weekOf(today());
      s.best = Math.max(s.best || 0, T.f); s.f = T.f + 1; s.wk[wid] = (s.wk[wid] || 0) + 1; for (const k of Object.keys(s.wk)) if (k < addDays(wid, -28)) delete s.wk[k];
      const per = {}; for (const x of T.qs) per[x.sk] = (per[x.sk] || 0) + 1; for (const [k, n] of Object.entries(per)) addAct(TW_SK[k], n);
      award("tower", 4 + Math.floor(T.f / 5) + (T.f % 10 === 0 ? 20 : 0)); saveProfile(); try { dqPublish(true); } catch {}
    } else { T.dl = Date.now() + T.lim * 1000; twTick(); }
    render();
  }, 650);
}
function twPage() {
  const s = twS(), T = UI.tw && UI.tw.f === s.f || UI.tw?.res === "pass" ? UI.tw : null;
  const back = h("button", { class: "btn btn-quiet", type: "button", style: "align-self:flex-start", onclick: () => { clearInterval(UI.tw?.tick); UI.tw = null; UI.gmPick = null; render(); } }, "‹ Các game");
  const head = h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Game · cả nhóm"), h("h1", null, "Tháp vô tận"),
    h("p", { class: "muted", style: "margin:0;max-width:68ch" }, "Mỗi tầng là vài câu trộn đủ kỹ năng: từ vựng, phát âm, ngữ pháp, nghe số và đánh vần, đọc True/False/Not Given. Đúng hết thì lên tầng, sai thì làm lại tầng đó với câu mới, không bị rơi. Càng cao càng nhiều câu, có đồng hồ và câu khó hơn. Mỗi 10 tầng là tầng Boss 5 câu."));
  const stat = h("div", { class: "row tw-stat", style: "gap:10px;flex-wrap:wrap" }, h("span", { class: "chip" }, `Đang ở tầng ${s.f}`), h("span", { class: "chip" }, `Cao nhất: ${s.best || 0}`), h("span", { class: "chip" }, `Tuần này: +${s.wk[weekOf(today())] || 0} tầng`));
  if (!T) return h("div", { class: "stack", style: "gap:14px" }, back, head, stat,
    h("section", { class: "card stack", style: "gap:10px;align-items:flex-start" }, h("b", null, `Tầng ${s.f}${s.f % 10 === 0 ? " · Tầng Boss" : ""}`),
      h("span", { class: "small muted" }, `${twNum(s.f)} câu, ${twTime(s.f) ? twTime(s.f) + " giây mỗi câu" : "không giới hạn giờ"}${s.f >= 30 ? ", câu nghe chỉ phát 1 lần" : ""}.`),
      h("button", { class: "btn btn-primary", type: "button", onclick: twStart }, "Leo tầng " + s.f + " →")));
  if (!T.qs) return h("div", { class: "stack", style: "gap:14px" }, back, head, h("p", { class: "note" }, "Đang dựng tầng…"));
  if (T.res === "pass") return h("div", { class: "stack", style: "gap:14px" }, back, head, stat,
    h("section", { class: "card stack", style: "gap:10px;align-items:flex-start" }, h("b", null, `Qua tầng ${T.f}!`), h("span", { class: "small muted" }, `Lên tầng ${s.f}. ${twNum(s.f)} câu${twTime(s.f) ? ", " + twTime(s.f) + " giây mỗi câu" : ""}.`),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: twStart }, "Leo tiếp tầng " + s.f + " →"))));
  const q = T.qs[T.i];
  if (T.res === "fail") return h("div", { class: "stack", style: "gap:14px" }, back, head, stat,
    h("section", { class: "card stack", style: "gap:10px;align-items:flex-start" }, h("b", null, `Chưa qua tầng ${T.f}`), h("p", { style: "margin:0" }, T.picked?.note || ""),
      q.why ? h("p", { class: "small", style: "margin:0" }, q.ans ? `Đáp án: ${q.ans}. ` : "", q.why) : null,
      h("span", { class: "small muted" }, "Không bị rơi tầng. Làm lại tầng này với bộ câu mới."),
      h("button", { class: "btn btn-primary", type: "button", onclick: twStart }, "Thử lại tầng " + T.f)));
  if (q.auto && !q.played) { q.played = true; setTimeout(() => q.play?.(), 150); }
  const inp = q.check ? h("input", { type: "text", class: "tw-in", placeholder: "Gõ đáp án rồi Enter", autocomplete: "off", onkeydown: e => { if (e.key === "Enter" && e.target.value.trim()) twAnswer(q.check(e.target.value), "Chưa đúng.") } }) : null;
  if (inp) setTimeout(() => inp.focus(), 50);
  return h("div", { class: "stack", style: "gap:14px" }, back, head, stat,
    h("div", { class: "row", style: "gap:10px;align-items:center" }, h("div", { class: "meter", style: "flex:1" }, h("i", { style: `width:${T.i / T.qs.length * 100}%` })), h("span", { class: "small muted" }, `Tầng ${T.f} · câu ${T.i + 1}/${T.qs.length}`), T.lim ? h("b", { class: "tw-clock small" }, Math.max(0, Math.ceil((T.dl - Date.now()) / 1000)) + " giây") : null),
    h("section", { class: "card stack", style: "gap:10px" }, h("span", { class: "eyebrow" }, q.tag), q.ask,
      q.play ? h("div", { class: "row" }, h("button", { class: "btn", type: "button", disabled: q.once && q.played ? true : null, onclick: () => q.play() }, q.once ? (q.played ? "Đã phát (như thi: 1 lần)" : "🔊 Nghe") : "🔊 Nghe lại")) : null,
      q.opts ? h("div", { class: "opts" }, q.opts.map(o => h("button", { type: "button", class: "opt" + (T.picked ? (o.ok ? " right" : "") : ""), disabled: T.picked ? true : null, onclick: () => twAnswer(o.ok, "Chưa đúng.") }, o.t))) : null,
      inp ? h("div", { class: "row", style: "gap:8px" }, inp, h("button", { class: "btn btn-primary", type: "button", onclick: () => { if (inp.value.trim()) twAnswer(q.check(inp.value), "Chưa đúng."); } }, "Trả lời")) : null));
}
/* Bảng tháp của nhóm trên trang Nhóm */
function twCard(list) {
  const wid = weekOf(today()), rows = list.map(m => ({ m, b: m.tw?.b || 0, w: m.tw?.wk === wid ? m.tw.w || 0 : 0 })).sort((a, b) => b.b - a.b), top = Math.max(10, ...rows.map(r => r.b));
  const cols = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f08c00"];
  return h("section", { class: "card stack tw-card", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Tháp vô tận"), h("button", { class: "btn btn-quiet small", type: "button", onclick: () => { UI.gmPick = "tower"; location.hash = "#games"; } }, "Leo tháp ›")),
    h("div", { class: "tw-bars" }, rows.map((r, i) => h("div", { class: "tw-col" }, h("span", { class: "small" }, `Tầng ${r.b}`), h("div", { class: "tw-shaft" }, h("i", { style: `height:${Math.max(3, r.b / top * 100)}%;background:${cols[i % cols.length]}` })), h("b", { class: "small tw-name" }, r.m.name || "Bạn học"), h("span", { class: "small muted" }, r.w ? `tuần này +${r.w}` : "tuần này chưa leo")))),
    h("p", { class: "small muted", style: "margin:0" }, "Tầng cao nhất từng leo được. Mỗi người một tháp, không ai bị rơi."));
}
(function () {
  const _pgm = pageGames;
  pageGames = function () {
    if (UI.gmPick === "tower") return twPage();
    const n = _pgm(); if (UI.gmPick) return n; const s = twS();
    const card = h("button", { type: "button", class: "card gm-card tw-banner", onclick: () => { UI.gmPick = "tower"; render(); window.scrollTo(0, 0); } }, h("span", { class: "gm-ic" }, "🗼"), h("b", null, "Tháp vô tận"), h("span", { class: "small muted" }, `Trộn mọi kỹ năng, so tầng với nhóm. Bạn đang ở tầng ${s.f}.`));
    const row = n.querySelector(".gm-skrow"); row ? row.before(card) : n.prepend(card); return n;
  };
  const _pgr = pageGroup;
  pageGroup = function () { const n = _pgr(); try { const b = n.querySelector(".boss-card"); const c = twCard(grpMine()); b ? b.after(c) : n.append(c); } catch (e) { console.warn(e); } return n; };
  const _pub = dqPublic;
  dqPublic = function () { const d = _pub(), s = twS(), wid = weekOf(today()); d.tw = { b: s.best || 0, w: s.wk[wid] || 0, wk: wid }; return d; };
  document.head.append(h("style", null, `.tw-banner{width:100%;border-color:#e8590c}.tw-in{flex:1;min-width:0;font:inherit;font-size:16px;padding:10px 12px;border:2px solid var(--ink,#111)}
.tw-bars{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap}.tw-col{display:grid;justify-items:center;gap:6px;min-width:80px}.tw-shaft{width:46px;height:160px;border:2px solid var(--ink,#111);display:flex;align-items:flex-end;background:repeating-linear-gradient(0deg,transparent 0 15px,rgba(0,0,0,.06) 15px 16px)}.tw-shaft i{display:block;width:100%}.tw-name{max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`));
})();
