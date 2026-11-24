/* ===== Luyện nghe số, ngày, giờ, đánh vần (dạng hay gặp ở IELTS Listening Section 1), chấm trên máy ===== */
const ND_CAT = {
  phone: ["Số điện thoại", "“oh” = 0; “double four” = 44; “triple seven” = 777. Người Anh đọc số điện thoại theo nhóm 3–5 số, ngừng ngắn giữa các nhóm."],
  teen: ["13 hay 30?", "13–19 nhấn vào âm cuối và kéo dài “teen” /ˈtiːn/ (thir-TEEN). 30–90 nhấn âm đầu, đuôi “ty” ngắn và nhẹ (THIR-ty, giọng Mỹ nghe như “thơ-đi”)."],
  price: ["Giá tiền", "“twelve fifty” = £12.50; “forty-five pounds” = £45. Số sau “pounds” là pence (phần lẻ)."],
  date: ["Ngày tháng", "“the twenty-first of March” và “March the twenty-first” đều là 21 March. Bài thi chấp nhận nhiều cách viết, nhưng đúng ngày và tháng."],
  time: ["Giờ", "“quarter past seven” = 7:15; “half past” = :30; “quarter to nine” = 8:45 (kém 15 phút là 9 giờ); “ten to” = kém 10; “oh five” = :05."],
  spell: ["Đánh vần tên", "Chữ dễ nhầm: A /eɪ/, E /iː/, I /aɪ/; G /dʒiː/ và J /dʒeɪ/; Y /waɪ/; W “double-you”; Z: Anh “zed”, Mỹ “zee”; “double L” = LL."],
  post: ["Mã bưu chính", "Mã của Anh có hai nhóm, ví dụ CB2 1TN. Chú ý cặp dễ nhầm B/P/D/T/V và M/N."],
  ref: ["Mã đặt chỗ", "Chữ và số đọc rời từng ký tự; số 0 đọc là “zero”."],
  addr: ["Địa chỉ", "Số nhà đọc trước, rồi tên đường; tên đường lạ thường được đánh vần ngay sau. Road, Street, Avenue, Lane viết đủ."],
  num: ["Năm, số lớn, phần trăm", "“nineteen eighty-seven” = 1987; “one hundred and fifty” = 150; “two thousand five hundred” = 2500; “per cent” = %."]
};
const ND = { idx: null, shards: {} };
function ndIndex() { return ND.idx ||= fetch("voice/nd/index.json").then(r => { if (!r.ok) throw new Error("nd " + r.status); return r.json(); }).catch(e => { ND.idx = null; throw e; }); }
async function ndPlay(it, rate = 1) {
  const s = it.s; const ab = await (ND.shards[s[0]] ||= fetch("voice/nd/" + String(s[0]).padStart(2, "0") + ".mp3").then(r => r.arrayBuffer()).catch(e => { delete ND.shards[s[0]]; throw e; }));
  alStop(); try { SPV.audio?.pause(); } catch {}
  const url = URL.createObjectURL(new Blob([new Uint8Array(ab, s[1], s[2])], { type: "audio/mpeg" })), a = new Audio(url); a.playbackRate = rate; try { a.preservesPitch = true; } catch {}
  AL_PLAY.a = a; AL_PLAY.url = url; await a.play(); return a;
}
/* ----- Chấm: chuẩn hóa theo từng loại, chỉ một đáp án đúng ----- */
const MON = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ndNum = s => { const t = String(s).toLowerCase().replace(/[,£$%]|pounds?|per ?cent|percent/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim(); if (/^\d+(\.\d+)?$/.test(t)) return +t; for (let n = 0; n <= 100000; n += n < 1000 ? 1 : n < 10000 ? 10 : 100) if (numWords(n).replace(/-/g, " ") === t || numWords(n).replace(/ and /g, " ") === t) return n; return null; };
/* Ngày viết bằng chữ: "eighteenth", "twenty first", "the third of" */
const ND_ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
function ndOrd(t) { const m = t.match(/\b(twenty|thirty)?\s*(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\b/); if (!m) return null; if (m[2] === "thirtieth") return 30; const b = ND_ORD.indexOf(m[2]); return (m[1] === "twenty" ? 20 : m[1] === "thirty" ? 30 : 0) + b; }
function ndCheck(it, v) {
  const x = String(v || "").trim(); if (!x) return false; const a = it.a;
  switch (it.c) {
    case "phone": case "ref": case "post": return x.toUpperCase().replace(/[^A-Z0-9]/g, "") === a.toUpperCase().replace(/[^A-Z0-9]/g, "");
    case "spell": return x.toLowerCase().replace(/[^a-z]/g, "") === a.toLowerCase();
    case "teen": case "num": { if (a.endsWith("%") && /[a-z]/i.test(x) && !/per ?cent/i.test(x)) return false; const n = ndNum(x); return n != null && n === parseFloat(a); }
    case "price": { const m = x.toLowerCase().replace(/[£$,]|pounds?/g, " ").trim().match(/^(\d+)(?:[.\s](\d{1,2}))?\s*p?$/); if (!m) return false; return Math.abs(+m[1] + (m[2] ? +m[2].padEnd(2, "0") / 100 : 0) - parseFloat(a.slice(1))) < 0.001; }
    case "date": { const t = x.toLowerCase().replace(/-/g, " "), d = t.match(/\b(\d{1,2})(st|nd|rd|th)?\b/), day = d ? +d[1] : ndOrd(t), mi = MON.findIndex(m => new RegExp("\\b" + m.slice(0, 3) + "(" + m.slice(3) + ")?\\b").test(t)); const [ad, am] = a.split(" "); return day != null && day === +ad && mi === MON.indexOf(am.toLowerCase()); }
    case "time": { const m = x.toLowerCase().replace(/\s*(am|pm|a\.m\.|p\.m\.)$/, "").match(/^(\d{1,2})(?:[:.h\s](\d{2}))?$/); if (!m) return false; const [ah, am] = a.split(":").map(Number); return (+m[1] % 12 || 12) === (ah % 12 || 12) && +(m[2] || 0) === am; }
    case "addr": { const n = t => t.toLowerCase().replace(/[.,]/g, " ").replace(/\brd\b/g, "road").replace(/\bst\b/g, "street").replace(/\bave?\b/g, "avenue").replace(/\bln\b/g, "lane").replace(/\s+/g, " ").trim(); return n(x) === n(a); }
  }
  return x.toLowerCase() === a.toLowerCase();
}
/* ----- Giao diện ----- */
function lsNdTab() {
  const N = UI.nd ||= { cat: "mix", exam: false, round: null, ans: {}, done: false, plays: {} };
  const stat = P.ndStat || {};
  const catBtns = h("div", { class: "row", style: "gap:6px" }, [["mix", "Trộn tất cả"], ...Object.entries(ND_CAT).map(([k, v]) => [k, v[0]])].map(([k, t]) => { const s = stat[k], pct = s && s[0] ? Math.round(s[1] / s[0] * 100) : null; return h("button", { type: "button", class: "opt", "aria-pressed": String(N.cat === k), onclick: () => { N.cat = k; N.round = null; N.ans = {}; N.done = false; N.plays = {}; render(); } }, t, pct != null ? h("small", { class: "muted" }, ` ${pct}%`) : null); }));
  const body = h("div", { class: "nd-wrap stack", style: "gap:10px" }, h("p", { class: "small muted" }, "Đang tải kho câu…"));
  ndIndex().then(D => {
    const pool = D.items.filter(x => N.cat === "mix" || x.c === N.cat);
    if (!N.round) { const seen = P.ndSeen || {}; N.round = pool.slice().sort((a, b) => ((seen[a.id] || 0) - (seen[b.id] || 0)) || Math.random() - 0.5).slice(0, 10).map(x => x.id); }
    const items = N.round.map(id => D.items.find(x => x.id === id)).filter(Boolean);
    const score = N.done ? items.filter(it => ndCheck(it, N.ans[it.id])).length : null;
    const submit = () => {
      N.done = true; P.ndStat ||= {}; P.ndSeen ||= {}; P.ndDay = today();
      for (const it of items) { const s = P.ndStat[it.c] ||= [0, 0]; s[0]++; if (ndCheck(it, N.ans[it.id])) s[1]++; else if (typeof e4Nd === "function") e4Nd(it, N.ans[it.id]); P.ndSeen[it.id] = (P.ndSeen[it.id] || 0) + 1; }
      award("listening", 10); addAct("listening", 4); saveProfile(); render();
    };
    const tip = N.cat !== "mix" ? h("p", { class: "gnote", style: "margin:0" }, h("b", null, "Mẹo: "), ND_CAT[N.cat][1]) : null;
    body.replaceChildren(tip || "",
      h("div", { class: "row", style: "gap:6px" }, h("button", { type: "button", class: "opt", "aria-pressed": String(!N.exam), disabled: N.done || null, onclick: () => { N.exam = false; render(); } }, "Luyện (nghe nhiều lần)"), h("button", { type: "button", class: "opt", "aria-pressed": String(N.exam), disabled: N.done || null, onclick: () => { N.exam = true; render(); } }, "Như thi (nghe 1 lần)")),
      h("ol", { class: "nd-list" }, items.map(it => { const ok = N.done ? ndCheck(it, N.ans[it.id]) : null, np = N.plays[it.id] || 0;
        const play = h("button", { class: "btn" + (np ? "" : " btn-primary"), type: "button", disabled: (N.exam && np >= 1 && !N.done) || null, onclick: async () => { N.plays[it.id] = np + 1; try { await ndPlay(it); } catch (e) { toast("Chưa phát được âm thanh."); } if (N.exam && !N.done) render(); } }, np ? "↺ Nghe lại" : "▶ Nghe");
        return h("li", { class: "nd-row" + (ok === true ? " ok" : ok === false ? " no" : "") },
          h("div", { class: "row", style: "gap:8px;align-items:center" }, play, h("span", { class: "small", style: "min-width:110px" }, it.q + ":"),
            h("input", { type: "text", class: "ls-in", autocomplete: "off", spellcheck: "false", placeholder: it.hint, value: N.ans[it.id] || "", disabled: N.done || null, oninput: e => { N.ans[it.id] = e.target.value; }, onkeydown: e => { if (e.key === "Enter") { const nx = e.target.closest("li")?.nextElementSibling?.querySelector("input"); nx ? nx.focus() : null; } } }),
            N.done ? h("span", { class: "ls-mark " + (ok ? "ok" : "no") }, ok ? "✓" : "✗ " + it.a) : null),
          N.done ? h("span", { class: "small muted" }, "Câu nghe: “" + it.say + "”" + (N.plays[it.id] > 1 ? ` · bạn nghe ${N.plays[it.id]} lần` : "")) : null); })),
      N.done ? h("div", { class: "row", style: "gap:12px;align-items:center" }, h("span", { class: "band-big" }, `${score}/${items.length}`), h("button", { class: "btn btn-primary", type: "button", onclick: () => { N.round = null; N.ans = {}; N.done = false; N.plays = {}; render(); } }, "Lượt mới"))
        : h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: submit }, "Chấm")));
  }, () => body.replaceChildren(h("p", { class: "note bad" }, "Chưa tải được kho câu. Kiểm tra mạng rồi thử lại.")));
  const weak = Object.entries(stat).filter(([, s]) => s[0] >= 5).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0]).slice(0, 3);
  return h("div", { class: "stack", style: "gap:12px" },
    h("p", { class: "small muted", style: "margin:0;max-width:70ch" }, "Section 1 hay mất điểm ở số điện thoại, giá tiền, ngày giờ và tên được đánh vần. Mỗi lượt 10 câu nghe ngắn bằng giọng Anh và Mỹ, máy chấm ngay (chấp nhận các cách viết mà bài thi chấp nhận)."),
    weak.length ? h("p", { class: "small", style: "margin:0" }, h("b", null, "Bạn hay sai: "), weak.map(([k, s]) => `${ND_CAT[k][0]} (đúng ${Math.round(s[1] / s[0] * 100)}%)`).join(" · ")) : null,
    catBtns, body);
}
