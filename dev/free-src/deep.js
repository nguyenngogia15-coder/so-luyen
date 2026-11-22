/* ===== Luyện sâu 5 bước cho một Section: đoán trước, nghe 1 lần như thi, chấm và chẩn đoán lỗi, sửa đúng chỗ, nghe lần cuối.
   Ghi lại bản đồ lỗi qua nhiều bài để biết mình hỏng ở khâu nào. ===== */
const DP_ERR = [
  ["sound", "👂", "Không nghe ra âm", "Biết từ đó nhưng lúc nghe không nhận ra", "Chép chính tả câu đó rồi nhại theo 3–5 lần"],
  ["word", "📕", "Không biết từ", "Từ mới, chưa gặp bao giờ", "Ghi cả câu chứa từ vào sổ và nghe lại cách nó được nói"],
  ["trap", "🪤", "Bị đánh lừa", "Người nói đổi ý, hoặc dùng từ đồng nghĩa", "Gạch ra đúng cụm từ đã lừa mình"],
  ["focus", "🌀", "Mất tập trung, lạc nhịp", "Đang nghe thì lạc, mất luôn mấy câu sau", "Nghe lại từ vài câu trước để tập bắt lại nhịp; với bài giảng thì để ý cụm chuyển ý (moving on, finally…) để nhảy về đúng chỗ"],
  ["spell", "✏️", "Nghe đúng nhưng viết sai", "Sai chính tả, quên -s số nhiều, sai số", "Gõ lại đáp án đúng 3 lần, để ý đuôi -s và chính tả"]];
const DP_PRED = [["num", "Số, ngày, giờ, giá"], ["name", "Tên riêng (đánh vần)"], ["sg", "Danh từ số ít"], ["pl", "Danh từ số nhiều"], ["oth", "Loại khác"]];
const DP_SIGN = /\b(moving on|move on|now let'?s|let'?s (?:now )?(?:turn|look|move)|turning (?:now )?to|first(?:ly)?|second(?:ly)?|next|another|finally|in conclusion|to sum up|so,? to summari[sz]e|however|on the other hand|the (?:main|key|first|second|final) (?:point|thing|reason)|what i want to (?:stress|emphasi[sz]e)|i'?d like to)\b/gi;
const dpLog = () => (P.lsDeep ||= []);
function dpMap() { const m = Object.fromEntries(DP_ERR.map(e => [e[0], 0])); for (const r of dpLog()) for (const [k, v] of Object.entries(r.e || {})) m[k] = (m[k] || 0) + v; return m; }
/* Câu trong lời thoại chứa đáp án (với câu điền từ); câu hỏi chọn đáp án thì không dò được */
const DP_STOP = new Set("the a an of to in on at for and or but is are was were be been it its that this these those as by with from will would can could not no so if than then there they he she we you i do does did have has had more most very about which what why how who their them his her our your".split(" "));
const dpWords = t => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(w => w.length > 2 && !DP_STOP.has(w)).map(w => w.slice(0, 5));
/* Đáp án hiển thị: câu điền từ là chữ cần điền; câu chọn là chữ cái kèm nội dung lựa chọn */
function dpAns(g, it) {
  if (g.type === "gap") return it.a[0];
  const k = String(it.a).charCodeAt(0) - 65, t = g.type === "mcq" ? it.opts?.[k] : g.opts?.[k];
  return t && t !== it.a ? `${it.a} (${t})` : String(it.a);
}
/* Câu trong lời thoại chứa đáp án. Câu điền từ: dò đúng chữ. Câu chọn: dò theo từ khóa của lựa chọn đúng (ước lượng). */
function dpSentOf(s, it, g) {
  const S = alSents(s), cp = t => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (g.type === "gap") {
    for (const a of it.a) { const k = lsNorm(a); if (!k) continue;
      let i = k.length < 2 ? (() => { const pw = String(it.pre || "").trim().split(/\s+/).pop() || ""; const re = new RegExp("\\b" + pw.replace(/[^a-z0-9]/gi, "") + "\\s+" + k + "\\b", "i"); return pw ? S.findIndex(x => re.test(x.x)) : -1; })()
        : S.findIndex(x => lsNorm(x.x).includes(k) || lsNorm(spSpellKeep(x.x)).includes(lsNorm(spSpellKeep(a))));
      if (i < 0 && cp(a).length >= 3) i = S.findIndex(x => cp(x.x).includes(cp(a)) || cp(spSpellKeep(x.x)).includes(cp(spSpellKeep(a))));
      if (i >= 0) return i; }
    return -1;
  }
  const k = String(it.a).charCodeAt(0) - 65, opt = g.type === "mcq" ? it.opts?.[k] : g.opts?.[k], ow = new Set(dpWords(opt || "")), qw = new Set(dpWords(it.q || ""));
  let best = -1, bs = 0;
  S.forEach((x, i) => { const w = new Set(dpWords(x.x)); let sc = 0; for (const z of ow) if (w.has(z)) sc += 2; for (const z of qw) if (w.has(z)) sc += 1; if (sc > bs) { bs = sc; best = i; } });
  return bs >= 2 ? best : -1;
}
function dpPlayer(s, i, label) {
  const src = lsSrcInfo(s), st = src ? lsSegs(s, src) : { state: "loading" }, seg = i >= 0 ? lsSegAt(s, src, st, i) : null;
  const go = r => seg && lsPlaySent(src, seg, r).catch(() => {});
  return h("div", { class: "row", style: "gap:6px", "data-lsseg": "1" }, h("button", { class: "btn btn-primary", type: "button", disabled: !seg || null, onclick: () => go(1) }, label || "▶ Nghe câu này"), h("button", { class: "btn btn-quiet", type: "button", disabled: !seg || null, onclick: () => go(0.75) }, "🐢 0.75×"), !seg ? h("span", { class: "small muted" }, st.state === "loading" ? "Đang dò mốc câu…" : "") : null);
}
function dpStepBar(step) {
  return h("ol", { class: "dp-steps" }, ["Đoán trước", "Nghe 1 lần", "Chấm, chẩn đoán", "Sửa đúng chỗ", "Nghe lần cuối"].map((t, i) => h("li", { class: i + 1 < step ? "done" : i + 1 === step ? "on" : "" }, h("b", null, i + 1), h("span", null, t))));
}
function lsDeepTab() {
  const D = UI.lsDp;
  if (D?.id && lsById(D.id)) return dpRun(lsById(D.id), D);
  const map = dpMap(), tot = Object.values(map).reduce((a, b) => a + b, 0), top = DP_ERR.slice().sort((a, b) => map[b[0]] - map[a[0]])[0], max = Math.max(1, ...Object.values(map));
  const doneIds = new Set(dpLog().map(r => r.id)), next = LS_BANK.find(s => !doneIds.has(s.id)) || LS_BANK[0];
  const start = s => { alStop(); UI.lsDp = { id: s.id, step: 1, pred: {}, W: { id: s.id, exam: true, done: false, ans: {} }, err: {}, t0: Date.now() }; if (UI.lsA) UI.lsA.played = false; render(); window.scrollTo(0, 0); };
  return h("div", { class: "stack", style: "gap:16px" },
    h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Luyện để sửa, không chỉ luyện để đo"),
      h("p", { style: "margin:0" }, "Làm nhiều đề chỉ đo được trình độ. Một Section làm kỹ theo 5 bước dạy bạn nhiều hơn 5 đề làm vội rồi dò đáp án, vì bạn biết chính xác mình trượt câu nào và vì sao."),
      dpStepBar(0),
      h("ul", { class: "small", style: "margin:0;padding-left:18px" },
        h("li", null, h("b", null, "Biết bằng mắt khác biết bằng tai. "), "Nhiều bạn có 6.000 từ trên flashcard nhưng chỉ 2.000 từ trong đôi tai. Học từ mới thì học cả cách nó được nói trong câu. Vốn từ giải thích khoảng một nửa chênh lệch điểm nghe; để hiểu 95% hội thoại thường cần khoảng 2.000–3.000 họ từ (use, used, useful là một họ), nhận ra được bằng tai."),
        h("li", null, h("b", null, "Người nghe giỏi có bảng điều khiển trong đầu: "), "đoán trước, tự kiểm tra lúc nghe, lạc thì bỏ qua bắt lại nhịp, rút kinh nghiệm sau mỗi bài. Kỹ năng này dạy được, và người đang nghe yếu tiến bộ nhanh nhất."),
        h("li", null, h("b", null, "Nghe thêm ngoài giờ: "), "chọn thứ bạn hiểu khoảng 95% số từ, bật phụ đề tiếng Anh nếu cần, thấy ít nhìn phụ đề thì tắt đi, dễ rồi thì đổi sang thứ nhanh hơn."),
        h("li", null, h("b", null, "Mỗi tuần: "), "làm 1 đề đủ 4 phần liền 30 phút (mục Đề đầy đủ) để quen giữ tập trung suốt bài thi."))),
    h("section", { class: "card stack", style: "gap:10px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Bản đồ lỗi của bạn"), h("span", { class: "small muted" }, `${dpLog().length} bài · ${tot} câu sai đã chẩn đoán`)),
      tot ? h("div", { class: "stack", style: "gap:6px" }, DP_ERR.map(e => h("div", { class: "dp-bar" }, h("span", null, e[1] + " " + e[2]), h("i", null, h("i", { style: `width:${map[e[0]] / max * 100}%` })), h("b", null, String(map[e[0]]))))) : h("p", { class: "small muted", style: "margin:0" }, "Làm xong bài đầu tiên là bản đồ bắt đầu hiện. Sau khoảng 10 bài bạn sẽ thấy rõ mình hay hỏng ở khâu nào."),
      tot ? h("p", { class: "note small", style: "margin:0" }, h("b", null, `Bạn hay trượt nhất vì: ${top[2]}. `), "Cách sửa: " + top[4] + ".") : null),
    h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Chọn một Section"), h("span", { class: "small muted" }, "Mỗi bài khoảng 25 phút. Gợi ý: " + `Đề ${next.test} · Section ${next.sec}`),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => start(next) }, `Bắt đầu: ${next.title} ›`)),
      h("div", { class: "dp-list" }, LS_BANK.map(s => { const r = dpLog().filter(x => x.id === s.id).slice(-1)[0];
        return h("button", { class: "dp-it", type: "button", onclick: () => start(s) }, h("b", null, `Đề ${s.test} · S${s.sec}`), h("span", { class: "small" }, s.title), h("span", { class: "small muted" }, r ? `Đã luyện sâu · lần 1 được ${r.score}/10` : "Chưa luyện sâu")); }))));
}
function dpRun(s, D) {
  lsPrepare(s);
  const qs = lsQs(s), W = D.W, quit = () => { alStop(); try { LSA.el?.pause(); } catch {} UI.lsDp = null; render(); };
  const head = h("div", { class: "row", style: "justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px" }, h("button", { class: "btn btn-quiet", type: "button", onclick: quit }, "‹ Chọn bài khác"), h("span", { class: "small muted" }, `Đề ${s.test} · Section ${s.sec} · ${s.title}`));
  const go = n => { alStop(); try { LSA.el?.pause(); } catch {} D.step = n; render(); window.scrollTo(0, 0); };
  let body;
  if (D.step === 1) {
    const left = Math.max(0, 60 - Math.floor((Date.now() - (D.t1 ||= Date.now())) / 1000));
    if (left > 0) setTimeout(() => { if (UI.lsDp === D && D.step === 1 && document.querySelector(".dp-timer")) document.querySelector(".dp-timer").textContent = mmss(Math.max(0, 60 - Math.floor((Date.now() - D.t1) / 1000))); }, 1000);
    if (left > 0) setTimeout(() => { if (UI.lsDp === D && D.step === 1) render(); }, 1050);
    const gaps = qs.filter(x => x.g.type === "gap");
    body = h("section", { class: "card stack", style: "gap:12px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:center" }, h("h2", { style: "margin:0" }, "Bước 1 · Đoán trước"), h("b", { class: "dp-timer" }, mmss(left))),
      h("p", { class: "small muted", style: "margin:0" }, "Như khoảng lặng trước mỗi part lúc thi: đọc câu hỏi, gạch từ khóa trong đầu, và với mỗi chỗ trống đoán xem cần điền loại gì. Người nghe giỏi luôn biết trước mình đang chờ nghe cái gì."),
      gaps.length ? h("div", { class: "stack", style: "gap:8px" }, gaps.map(({ it }) => h("div", { class: "dp-pred" }, h("span", null, h("b", null, it.n + ". "), it.pre + " ____ " + (it.post || "")),
        h("div", { class: "row", style: "gap:4px;flex-wrap:wrap" }, DP_PRED.map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(D.pred[it.n] === k), onclick: () => { D.pred[it.n] = k; render(); } }, t)))))) : null,
      qs.some(x => x.g.type !== "gap") ? h("div", { class: "stack", style: "gap:6px" }, h("b", { class: "small" }, gaps.length ? "Các câu chọn đáp án: đọc trước, đoán ý sẽ được nhắc tới" : "Đọc trước các câu hỏi, đoán ý sẽ được nhắc tới"), lsQuestions(s, { ans: {} }, false)) : null,
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => { if (UI.lsA) UI.lsA.played = false; go(2); } }, "Sẵn sàng, nghe thôi ›")));
  } else if (D.step === 2) {
    const submit = () => { W.done = true; D.score = qs.filter(({ g, it }) => lsCheck(g, it, W.ans[it.n])).length; lsQtStat(qs, W.ans); const st = lsSt(s.id); st.score = Math.max(st.score ?? 0, D.score); st.last = D.score; st.n = (st.n || 0) + 1; st.date = today(); award("listening", 15); addAct("listening", 8); saveProfile(); go(3); };
    body = h("section", { class: "card stack", style: "gap:12px" }, h("h2", { style: "margin:0" }, "Bước 2 · Nghe 1 lần như thi thật"),
      h("p", { class: "small muted", style: "margin:0" }, "Không dừng, không tua. Đây là lúc đo trình độ thật. Lạc thì bỏ qua, bắt lại ở câu sau, đừng đứng hình ở một câu."),
      lsPlayer(s, true), lsQuestions(s, W, false), h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: submit }, "Nộp bài và chấm ›")));
  } else if (D.step === 3) {
    const wrong = qs.filter(({ g, it }) => !lsCheck(g, it, W.ans[it.n]));
    const allTagged = wrong.every(({ it }) => D.err[it.n]);
    body = h("section", { class: "card stack", style: "gap:12px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:center" }, h("h2", { style: "margin:0" }, "Bước 3 · Chấm và chẩn đoán"), h("span", { class: "band-big" }, `${D.score}/10`)),
      wrong.length ? h("p", { class: "small muted", style: "margin:0" }, "Với mỗi câu sai, nghe lại đúng câu chứa đáp án rồi tự nhận xem mình trượt vì đâu. Chọn thật lòng, đây là thứ quyết định bước sau bạn luyện gì.") : h("p", { class: "note good", style: "margin:0" }, "Đúng hết! Vẫn nên làm bước 5 để nghe lại trọn bài một lần nữa."),
      ...wrong.map(({ g, it }) => { const i = dpSentOf(s, it, g), sent = i >= 0 ? alSents(s)[i].x : null, ans = dpAns(g, it);
        return h("div", { class: "dp-q stack", style: "gap:8px" },
          h("div", { class: "row", style: "gap:10px;flex-wrap:wrap;align-items:baseline" }, h("b", null, "Câu " + it.n), h("span", { class: "small" }, "Bạn ghi: ", h("s", null, W.ans[it.n] || "(bỏ trống)")), h("span", { class: "small" }, "Đáp án: ", h("b", null, ans)),
            D.pred[it.n] ? h("span", { class: "small muted" }, "Bạn đoán: " + DP_PRED.find(p => p[0] === D.pred[it.n])[1]) : null),
          sent ? h("p", { class: "dp-sent", style: "margin:0" }, g.type !== "gap" ? h("span", { class: "small muted", style: "font-style:normal;display:block" }, "Đoạn có thể chứa ý đáp án (máy dò theo từ khóa):") : null, "“" + sent + "”") : h("span", { class: "small muted" }, "Chưa dò được câu chứa ý này: mở lời thoại ở bước 5 để tìm."),
          sent ? dpPlayer(s, i) : null,
          h("div", { class: "row", style: "gap:4px;flex-wrap:wrap" }, DP_ERR.filter(e => g.type === "gap" || e[0] !== "spell").map(e => h("button", { type: "button", class: "opt", "aria-pressed": String(D.err[it.n] === e[0]), title: e[3], onclick: () => { D.err[it.n] = e[0]; render(); } }, e[1] + " " + e[2])))); }),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", disabled: !allTagged || null, onclick: () => go(wrong.length ? 4 : 5) }, wrong.length ? "Sang bước sửa ›" : "Sang bước 5 ›"), !allTagged ? h("span", { class: "small muted" }, "Chọn loại lỗi cho mọi câu sai trước đã") : null));
  } else if (D.step === 4) {
    const wrong = qs.filter(({ it }) => D.err[it.n]);
    const fix = D.fix ||= {};
    body = h("section", { class: "card stack", style: "gap:12px" }, h("h2", { style: "margin:0" }, "Bước 4 · Sửa đúng chỗ hỏng"),
      h("p", { class: "small muted", style: "margin:0" }, "Mỗi loại lỗi một cách sửa. Khoảng 15 phút."),
      h("ul", { class: "small dp-how" }, DP_ERR.filter(e => wrong.some(({ it }) => D.err[it.n] === e[0])).map(e => h("li", null, h("b", null, e[1] + " " + e[2] + ": "), e[4] + "."))),
      ...wrong.map(({ g, it }) => { const k = D.err[it.n], e = DP_ERR.find(x => x[0] === k), i = dpSentOf(s, it, g), sent = i >= 0 ? alSents(s)[i].x : "", ans = dpAns(g, it), F = fix[it.n] ||= {};
        let task;
        if (k === "sound") {
          const cmp = () => { const w = t => spSpellKeep(t).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean), want = w(sent), got = new Set(w(F.typed || "")); F.res = want.map(x => got.has(x)); F.pct = Math.round(F.res.filter(Boolean).length / Math.max(1, want.length) * 100); if (typeof e4Listen === "function") e4Listen(sent, sent.split(/\s+/).filter((x, q) => !F.res[q]), s.id + ":" + i, F.pct); render(); };
          const ta = h("textarea", { rows: "2", placeholder: "Nghe câu rồi gõ lại chính xác từng từ…", oninput: ev => { F.typed = ev.target.value; } }); ta.value = F.typed || "";
          task = sent ? h("div", { class: "stack", style: "gap:8px" }, h("b", { class: "small" }, "1. Chép chính tả câu chứa đáp án"), dpPlayer(s, i), ta, h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: cmp }, "So với lời thoại")),
            F.res ? h("p", { class: "ls-dict-res", style: "margin:0" }, sent.split(/\s+/).map((x, q) => [h("span", { class: F.res[q] ? "ok" : "no" }, x), " "])) : null,
            h("b", { class: "small" }, "2. Nhại theo (shadowing) 3–5 lần"), h("span", { class: "small muted" }, "Mục tiêu là bắt được âm, chỗ nối, chỗ nuốt âm, chưa cần nói hay. Bấm nghe rồi nói đuổi theo gần như cùng lúc."),
            h("div", { class: "row" }, dpPlayer(s, i, "▶ Nghe và nói theo"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => { F.sh = (F.sh || 0) + 1; render(); } }, `✓ Đã nhại ${F.sh || 0} lần`))) : h("span", { class: "small muted" }, "Mở lời thoại ở bước 5, tìm câu chứa đáp án và nghe lại vài lần.");
        } else if (k === "word") {
          if (F.w == null) F.w = g.type === "gap" ? String(ans) : "";
          const add = async () => { const w = String(F.w || "").trim(); if (!w) { toast("Gõ từ bạn chưa biết trước đã"); return; } F.busy = true; render(); try { if (!VOCAB.some(v => v.word.toLowerCase() === w.toLowerCase())) { const d = await dictLook(w).catch(() => null); await addVocab({ word: w, meaning: d?.[2] || "", pos: d?.[0] || "", ipa: d?.[1] || "", example: sent || d?.[3] || "", topic: "" }); } F.added = w; toast("Đã thêm “" + w + "” vào sổ từ, kèm cả câu nghe được"); } catch (er) { toast("Chưa thêm được: " + (er?.message || "lỗi")); } F.busy = false; render(); };
          task = h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small" }, "Ghi cả câu chứa từ, không chỉ mặt chữ, rồi nghe lại cách nó được nói trong câu."), sent ? h("p", { class: "dp-sent", style: "margin:0" }, "“" + sent + "”") : null, sent ? dpPlayer(s, i) : null,
            h("div", { class: "row", style: "gap:6px;align-items:center" }, h("span", { class: "small" }, "Từ mới:"), h("input", { type: "text", class: "dp-in", value: F.w, placeholder: "gõ từ chưa biết", oninput: ev => { F.w = ev.target.value; } }),
              h("button", { class: "btn", type: "button", disabled: F.busy || null, onclick: add }, F.added ? `✓ Đã thêm “${F.added}”` : "+ Thêm vào sổ từ kèm câu")));
        } else if (k === "trap") {
          const toks = (sent || "").split(/\s+/);
          task = sent ? h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small" }, "Bấm vào những từ đã lừa bạn (chỗ đổi ý như actually, no wait, sorry; hoặc từ đồng nghĩa với từ trong câu hỏi)."), dpPlayer(s, i),
            h("p", { class: "dp-toks", style: "margin:0" }, toks.map((t, q) => h("button", { type: "button", class: "dp-tok" + ((F.mark || []).includes(q) ? " on" : ""), onclick: () => { F.mark ||= []; F.mark = F.mark.includes(q) ? F.mark.filter(z => z !== q) : [...F.mark, q]; render(); } }, t)))) : h("span", { class: "small muted" }, "Mở lời thoại ở bước 5, tìm chỗ người nói đổi ý hoặc nói vòng.");
        } else if (k === "focus") {
          const S = alSents(s), from = Math.max(0, i - 2), around = i >= 0 ? S.slice(from, i + 1) : [];
          const src = lsSrcInfo(s), st = src ? lsSegs(s, src) : {}, a0 = i >= 0 ? lsSegAt(s, src, st, from) : null, a1 = i >= 0 ? lsSegAt(s, src, st, i) : null;
          const pat = g.type !== "gap" ? "(?!x)x" : /^[a-z0-9]+$/i.test(String(ans).replace(/\s/g, "")) && String(ans).length > 3 ? String(ans).replace(/\s/g, "").split("").join("[^a-z0-9]{0,3}") : String(ans).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), mark = t => esc(t).replace(new RegExp("(" + pat + ")", "i"), "<mark>$1</mark>");
          task = i < 0 ? h("span", { class: "small muted" }, "Mở lời thoại ở bước 5, tìm đoạn chứa đáp án và nghe lại từ vài câu trước đó.") : h("div", { class: "stack", style: "gap:8px" },
            h("span", { class: "small" }, "Nghe lại từ 2 câu trước, giữ tập trung tới câu in đậm."),
            h("div", { class: "dp-ctx" }, around.map((x, q) => h("p", { class: q === around.length - 1 ? "on" : "", html: q === around.length - 1 ? mark(x.x) : esc(x.x) }))),
            h("div", { class: "row", style: "gap:6px", "data-lsseg": "1" }, h("button", { class: "btn btn-primary", type: "button", disabled: !(a0 && a1) || null, onclick: () => lsPlaySent(src, [a0[0], a1[1]], 1).catch(() => {}) }, "▶ Nghe lại đoạn này"), h("button", { class: "btn btn-quiet", type: "button", disabled: !(a0 && a1) || null, onclick: () => lsPlaySent(src, [a0[0], a1[1]], 0.75).catch(() => {}) }, "🐢 0.75×"),
              h("span", { class: "small muted" }, "Lần này nghe ra chưa?"), ["Ra rồi", "Chưa"].map((t, q) => h("button", { type: "button", class: "opt", "aria-pressed": String(F.ok === q), onclick: () => { F.ok = q; render(); } }, t))),
            F.ok === 1 ? h("p", { class: "small muted", style: "margin:0" }, "Vẫn chưa thì đây có thể là lỗi không nghe ra âm: chép chính tả câu in đậm ở mục Nghe chép.") : null);
        } else {
          const ok = (F.t || []).filter(x => (g.type === "gap" ? it.a : [ans]).some(z => lsNorm(z) === lsNorm(x))).length;
          task = h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small" }, `Gõ lại đúng “${ans}” 3 lần. Để ý đuôi -s, chữ hoa, số.`),
            h("div", { class: "row", style: "gap:6px" }, [0, 1, 2].map(q => h("input", { type: "text", class: "dp-in", value: (F.t || [])[q] || "", autocomplete: "off", spellcheck: "false", onchange: ev => { F.t ||= []; F.t[q] = ev.target.value; render(); } })), h("span", { class: "chip " + (ok >= 3 ? "good" : "") }, `${ok}/3`)));
        }
        return h("div", { class: "dp-q stack", style: "gap:8px" }, h("div", { class: "row", style: "gap:8px;align-items:baseline;flex-wrap:wrap" }, h("b", null, "Câu " + it.n), h("span", { class: "chip" }, e[1] + " " + e[2]), h("span", { class: "small muted" }, "Đáp án: " + ans)), task); }),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => go(5) }, "Sang bước cuối ›")));
  } else {
    const finish = () => {
      const e = {}; for (const k of Object.values(D.err)) e[k] = (e[k] || 0) + 1;
      dpLog().push({ id: s.id, date: today(), score: D.score, e, note: (D.note || "").slice(0, 300), min: Math.round((Date.now() - D.t0) / 60000) });
      if (dpLog().length > 200) dpLog().splice(0, dpLog().length - 200);
      award("listening", 20); addAct("listening", 7); saveProfile(); toast("Xong 5 bước! +20 XP"); D.step = 6; render(); window.scrollTo(0, 0);
    };
    if (D.step === 6) { const e = DP_ERR.filter(x => Object.values(D.err).includes(x[0]));
      body = h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Xong bài này 🎧"), h("p", { style: "margin:0" }, `Lần nghe đầu được ${D.score}/10. ${e.length ? "Lỗi lần này: " + e.map(x => x[2].toLowerCase()).join(", ") + "." : ""}`),
        D.note ? h("p", { class: "note small", style: "margin:0" }, "Lần sau mình sẽ: " + D.note) : null, h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: quit }, "Xem bản đồ lỗi")));
    } else body = h("section", { class: "card stack", style: "gap:12px" }, h("h2", { style: "margin:0" }, "Bước 5 · Nghe lần cuối"),
      h("p", { class: "small muted", style: "margin:0" }, "Nghe lại trọn bài, không nhìn lời thoại. Bạn sẽ ngạc nhiên vì giờ mọi thứ rõ ràng thế nào. Đó không phải ảo giác, là đôi tai vừa học được điều mới."),
      lsPlayer(s, false),
      h("details", null, h("summary", { class: "small" }, "Nghe xong rồi mới mở lời thoại"), lsTranscript(s)),
      h("label", { class: "stack", style: "gap:4px" }, h("b", { class: "small" }, "Rút kinh nghiệm: lần sau mình sẽ làm gì khác?"), (() => { const t = h("textarea", { rows: "2", placeholder: "Ví dụ: đọc kỹ câu hỏi chọn đáp án hơn, để ý chữ actually…", oninput: ev => { D.note = ev.target.value; } }); t.value = D.note || ""; return t; })()),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: finish }, "Hoàn thành ✓")));
  }
  return h("div", { class: "stack", style: "gap:14px" }, head, dpStepBar(Math.min(D.step, 6)), body);
}
(function () {
  ACH.push(["dp1", "🔬", "Bác sĩ đôi tai", "Hoàn thành 1 bài Luyện sâu 5 bước", () => dpLog().length >= 1], ["dp10", "🗺️", "Có bản đồ lỗi", "Hoàn thành 10 bài Luyện sâu 5 bước", () => dpLog().length >= 10]);
  const G = ACH_GROUPS[2], f = G[3]; G[3] = id => f(id) || /^dp\d/.test(id);
  document.head.append(h("style", null, `.dp-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.dp-steps li{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font-size:.78rem;color:var(--muted);min-width:0}
.dp-steps b{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:2px solid var(--line);background:var(--surface)}.dp-steps li.on{color:var(--ink,#111);font-weight:700}.dp-steps li.on b{border-color:#1c7ed6;background:#1c7ed6;color:#fff}.dp-steps li.done b{border-color:#0e8a6a;background:#0e8a6a;color:#fff}
.dp-pred{display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--line)}.dp-q{padding:12px;border:2px solid var(--line)}.dp-sent{font-style:italic;background:color-mix(in srgb,#1c7ed6 7%,transparent);padding:8px 10px}
.dp-timer{font-family:var(--font-mono);font-size:1.4rem}.dp-bar{display:grid;grid-template-columns:minmax(0,15em) 1fr 2.5em;gap:10px;align-items:center;font-size:.9rem}.dp-bar>i{height:12px;background:var(--line);display:block}.dp-bar>i>i{display:block;height:100%;background:#e8590c}.dp-bar b{text-align:right}
@media (max-width:600px){.dp-bar{grid-template-columns:1fr 2.5em}.dp-bar>i{grid-column:1/-1;grid-row:2}}
.dp-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}.dp-it{display:flex;flex-direction:column;gap:2px;text-align:left;padding:10px;border:2px solid var(--line);background:var(--surface);cursor:pointer;font:inherit;color:inherit}.dp-it:hover{border-color:var(--edge,#111)}
.dp-toks{line-height:2.2}.dp-tok{font:inherit;border:1px dashed var(--line);background:none;padding:1px 4px;margin:0 2px;cursor:pointer;color:inherit}.dp-tok.on{background:#ffe066;border-color:#e8590c;text-decoration:underline}.dp-in{width:9em}.dp-ctx{border-left:3px solid var(--line);padding-left:10px}.dp-ctx p{margin:2px 0;color:var(--muted)}.dp-ctx p.on{color:inherit;font-weight:600}.dp-how{margin:0;padding-left:18px}`));
})();
SUB_DESC["lsTab:deep"] = "Đoán trước, nghe 1 lần, chẩn đoán lỗi, sửa đúng chỗ, nghe lại";
/* ===== Phần còn lại của video: phân loại lỗi tai khi nghe chép, săn cụm chuyển ý Part 4, nghe ngoài giờ theo nấc, đề đủ mỗi tuần, 3 điều ngày thi, so với bạn cùng nhóm ===== */
const DP_FN = new Set("a an the of to in on at for and or but is are was were be been it its that this these those as by with from i you he she we they my your his her our their me him us them do does did have has had will would can could not no so if than then there".split(" "));
/* Nghe chép: tách lỗi theo kiểu John Field (mất từ nhỏ, không tách được 2 từ dính nhau, nhầm số ít/số nhiều) */
function dpDictKinds(want, typed) {
  const W = t => spSpellKeep(t).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
  const w = W(want.join(" ")), got = W(typed), have = new Set(got), miss = w.map(x => !have.has(x));
  const k = { small: 0, link: 0, plural: 0, other: 0 };
  miss.forEach((m, i) => { if (!m) return; const x = w[i];
    if (got.some(g => g + "s" === x || g === x + "s" || g + "es" === x || g === x + "es")) k.plural++;
    else if (DP_FN.has(x)) k.small++;
    else if (miss[i - 1] || miss[i + 1]) k.link++;
    else k.other++; });
  return k;
}
(function () {
  const _d = lsDictTab;
  lsDictTab = function () {
    const n = _d(), D = UI.lsD; if (!D?.res) return n;
    if (!D.res.kinds) { D.res.kinds = dpDictKinds(D.res.want, D.typed || ""); const T = (P.ls ||= {}).dictK ||= { small: 0, link: 0, plural: 0, other: 0 }; for (const [a, v] of Object.entries(D.res.kinds)) T[a] = (T[a] || 0) + v; saveProfile(); }
    const k = D.res.kinds, T = P.ls?.dictK || {}, L = { small: "Mất từ nhỏ (a, the, of…)", link: "Không tách được từ dính nhau", plural: "Nhầm số ít / số nhiều", other: "Từ nội dung bị sót" };
    const box = h("div", { class: "note small stack", style: "gap:4px" }, h("b", null, "Lỗi tai trong câu này"),
      Object.values(k).some(Boolean) ? h("span", null, Object.entries(k).filter(([, v]) => v).map(([a, v]) => `${L[a]}: ${v}`).join(" · ")) : h("span", null, "Không sót từ nào 🎯"),
      h("span", { class: "muted" }, "Cộng dồn: " + Object.entries(L).map(([a, t]) => `${t.split(" (")[0]} ${T[a] || 0}`).join(" · ") + ". Mỗi loại một cách sửa: từ nhỏ thì nhại theo để quen âm yếu, từ dính nhau thì nghe chậm 0.75× rồi nhại, số nhiều thì để ý đuôi -s trước khi gõ."));
    (n.querySelector(".ls-dict-res")?.parentElement || n).append(box); return n;
  };
})();
/* Săn cụm chuyển ý trong bài giảng Part 4 */
function dpSignHunt() {
  const H = UI.dpHunt ||= { id: LS_BANK.find(s => s.sec === 4)?.id, typed: "", res: null }, s = lsById(H.id); if (!s) return null;
  lsPrepare(s);
  const all0 = [...new Set(alSents(s).flatMap(x => (x.x.match(/[^,.;:!?]+/g) || []).flatMap(c => { const m = c.match(DP_SIGN); return m ? [c.trim().toLowerCase().split(/\s+/).slice(0, 4).join(" ").replace(/^(and|so|but|ok|okay|right|well) /, "")] : []; })))], all = all0.filter(x => !all0.some(y => y !== x && y.includes(x)));
  const check = () => { const got = H.typed.toLowerCase().split(/\n|,|;/).map(x => x.trim()).filter(Boolean); H.res = all.map(x => [x, got.some(g => x.includes(g) || g.includes(x))]); const st = (P.ls ||= {}).hunt ||= {}; st[s.id] = Math.max(st[s.id] || 0, H.res.filter(r => r[1]).length); award("listening", 5); addAct("listening", 4); saveProfile(); render(); };
  const ta = h("textarea", { rows: "3", placeholder: "Mỗi dòng một cụm, ví dụ: moving on to\nfinally", oninput: e => { H.typed = e.target.value; } }); ta.value = H.typed;
  return h("section", { class: "card stack", style: "gap:10px" }, h("h2", { style: "margin:0" }, "Săn biển báo Part 4"),
    h("p", { class: "small muted", style: "margin:0" }, "Bài giảng Part 4 có những cụm báo hiệu chuyển ý như biển báo trên cao tốc: “moving on to”, “another reason”, “finally”. Câu hỏi đi theo thứ tự bài nói, mỗi lần chuyển ý thường là sang nhóm câu mới. Nghe bài giảng và ghi ra mọi cụm chuyển ý bạn nghe được; vài tuần là tai tự bắt được chúng, lạc ở câu 34 vẫn nhảy về kịp câu 35."),
    h("div", { class: "row", style: "gap:8px;align-items:center" }, h("span", { class: "small muted" }, "Bài giảng:"), h("select", { onchange: e => { alStop(); try { LSA.el?.pause(); } catch {} UI.dpHunt = { id: e.target.value, typed: "", res: null }; render(); } }, LS_BANK.filter(x => x.sec === 4).map(x => h("option", { value: x.id, selected: x.id === s.id || null }, `Đề ${x.test} · ${x.title}`)))),
    lsPlayer(s, false), ta, h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: check }, "So với lời thoại")),
    H.res ? h("div", { class: "stack", style: "gap:4px" }, h("span", { class: "chip " + (H.res.every(r => r[1]) ? "good" : "warn") }, `Bắt được ${H.res.filter(r => r[1]).length}/${H.res.length} cụm`), h("p", { class: "small", style: "margin:0" }, H.res.map(([x, ok]) => h("mark", { style: `margin-right:6px;${ok ? "" : "background:#ffc9c9"}` }, (ok ? "✓ " : "✗ ") + x)))) : null);
}
/* Nghe ngoài giờ theo nấc: có phụ đề tiếng Anh → không phụ đề → nhanh hơn */
const DP_LAD = [["en", "Có phụ đề tiếng Anh"], ["none", "Không phụ đề"], ["fast", "Không phụ đề, nói nhanh hơn"]];
function dpExtra() {
  const X = (P.lsX ||= []), wk = weekOf(today()), mine = X.filter(x => weekOf(x.d) === wk), mins = mine.reduce((a, x) => a + x.m, 0);
  const F = UI.dpX ||= { m: 20, lv: X.slice(-1)[0]?.lv || "en", pct: 95 };
  const last5 = X.slice(-5), hint = last5.length >= 5 && last5.every(x => x.lv === F.lv && x.pct >= 95) ? (F.lv === "en" ? "5 lần gần nhất bạn hiểu ≥95% khi có phụ đề: thử tắt phụ đề đi." : F.lv === "none" ? "5 lần gần nhất hiểu ≥95% không cần phụ đề: thử chuyển sang thứ nói nhanh hơn." : "Bạn đang ở nấc cao nhất, giữ đều nhé.") : null;
  const add = () => { X.push({ d: today(), m: Math.max(1, Math.min(240, +F.m || 0)), lv: F.lv, pct: +F.pct }); if (X.length > 300) X.splice(0, X.length - 300); saveProfile(); toast("Đã ghi " + F.m + " phút nghe ngoài giờ"); render(); };
  return h("section", { class: "card stack", style: "gap:10px" }, h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "Nghe ngoài giờ"), h("span", { class: "small muted" }, `Tuần này: ${mins} phút`)),
    h("p", { class: "small muted", style: "margin:0" }, "Mỗi ngày nghe thêm thứ bạn thích (podcast, YouTube, phim) ở mức hiểu khoảng 95% số từ. Dưới mức đó là nghe tiếng ồn, không học được gì. Phim tốc độ bản xứ không phụ đề khi mới 5.5 chỉ bắt được khoảng 60% từ. Leo từng nấc: phụ đề tiếng Anh (nối chữ “want to” mắt thấy với “wanna” tai nghe) → ít nhìn phụ đề thì tắt → dễ rồi thì đổi thứ nhanh hơn."),
    h("div", { class: "row", style: "gap:6px;flex-wrap:wrap;align-items:center" }, h("input", { type: "number", min: "1", max: "240", value: String(F.m), style: "width:5em", oninput: e => { F.m = e.target.value; } }), h("span", { class: "small" }, "phút ·"),
      DP_LAD.map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(F.lv === k), onclick: () => { F.lv = k; render(); } }, t))),
    h("div", { class: "row", style: "gap:6px;flex-wrap:wrap;align-items:center" }, h("span", { class: "small" }, "Hiểu khoảng:"), [60, 80, 90, 95, 100].map(p => h("button", { type: "button", class: "opt", "aria-pressed": String(+F.pct === p), onclick: () => { F.pct = p; render(); } }, p + "%")), h("button", { class: "btn", type: "button", onclick: add }, "Ghi lại")),
    +F.pct < 90 ? h("p", { class: "note warn small", style: "margin:0" }, "Dưới 90% là hơi khó: bật phụ đề tiếng Anh hoặc chọn thứ dễ hơn sẽ học được nhiều hơn.") : null,
    hint ? h("p", { class: "note small", style: "margin:0" }, "⬆ " + hint) : null);
}
function dpWeekTest() {
  const wk = weekOf(today()), done = Object.entries(P.lsTests || {}).filter(([, v]) => v?.date && weekOf(v.date) === wk);
  return h("div", { class: "row note small", style: "justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px" },
    h("span", null, done.length ? `✓ Tuần này đã làm đề đầy đủ (band ${done.slice(-1)[0][1].band}). Giữ sức tập trung suốt 30 phút là kỹ năng riêng.` : "Tuần này chưa làm đề đủ 4 part liền 30 phút. Mỗi tuần một đề để quen giữ tập trung suốt bài thi."),
    done.length ? null : h("button", { class: "btn btn-quiet", type: "button", onclick: () => { UI.lsTab = "test"; render(); } }, "Làm đề đầy đủ ›"));
}
function dpExamTips() {
  return h("details", { class: "card" }, h("summary", null, h("b", null, "3 điều nhớ trong ngày thi")),
    h("ol", { class: "small", style: "margin:8px 0 0;padding-left:20px" },
      h("li", null, h("b", null, "Dùng hết thời gian đọc câu hỏi trước mỗi part. "), "Khoảng lặng đó chính là bước 1: gạch từ khóa, đoán loại thông tin cần điền."),
      h("li", null, h("b", null, "Thi trên máy: gõ đúng chính tả ngay khi nghe. "), "Có tai nghe riêng là lợi thế, nhưng cuối bài chỉ có 2 phút xem lại, không có 10 phút chép đáp án như thi giấy."),
      h("li", null, h("b", null, "Âm thanh có vấn đề thì giơ tay báo giám thị ngay "), "và nộp khiếu nại trước khi rời trung tâm thi. Sau ngày thi, khiếu nại về cách tổ chức gần như không còn được xử lý.")));
}
/* So với bạn cùng nhóm: ai đã luyện sâu cùng bài, được mấy điểm, hay lỗi gì */
(function () {
  const _pub = dqPublic; dqPublic = function () { const d = _pub(); d.dp = dpLog().slice(-8).map(r => ({ id: r.id, s: r.score, e: Object.entries(r.e || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "" })); return d; };
  const _tab = lsDeepTab;
  lsDeepTab = function () {
    const n = _tab(); if (UI.lsDp?.id) {
      const D = UI.lsDp; if (D.step === 3) { const me = window.__grp?.uid, fr = (typeof G !== "undefined" ? G.list : []).filter(m => m.id !== me).map(m => [m, (m.dp || []).filter(x => x.id === D.id).slice(-1)[0]]).filter(x => x[1]);
        if (fr.length) n.querySelector(".dp-q, .note")?.before(h("p", { class: "note small", style: "margin:0" }, "Bạn cùng nhóm đã làm bài này: " + fr.map(([m, r]) => `${m.name} ${r.s}/10${r.e ? " (hay " + DP_ERR.find(e => e[0] === r.e)?.[2].toLowerCase() + ")" : ""}`).join(", ") + ". Hỏi nhau xem ai hiểu khác ai và vì sao, đó là một phần của cách học này.")); }
      return n; }
    n.append(dpWeekTest(), dpSignHunt(), dpExtra(), dpExamTips()); return n;
  };
})();

/* ===== Bài nào đã có giọng Gemini: hỏi Worker một lần, hiện nhãn ở danh sách bài; chọn giọng ngay trong Luyện sâu và Săn biển báo ===== */
const GEMHAS = { set: null, p: null };
function gemHasLoad() { return GEMHAS.p ||= (window.__gemHas ? window.__gemHas("t").then(j => { GEMHAS.set = new Set((j.keys || []).filter(k => /-g2$/.test(k)).map(k => k.slice(0, -3))); render(); }).catch(() => { GEMHAS.set = null; }) : Promise.resolve()); }
function gemTag(id) { gemHasLoad(); if (!GEMHAS.set) return null; return GEMHAS.set.has(id) ? h("span", { class: "chip good", style: "font-size:.7rem" }, "🎙 Gemini") : h("span", { class: "chip", style: "font-size:.7rem" }, "máy đọc"); }
(function () {
  const _lc = lsCard; lsCard = function (s, href) { const n = _lc(s, href), t = gemTag(s.id); if (t) n.querySelector(".row")?.append(t); return n; };
  const _sh = dpSignHunt; dpSignHunt = function () { const n = _sh(); const s = lsById(UI.dpHunt?.id); if (n && s) { if (!n.querySelector(".ls-voice")) n.querySelector(".ls-player")?.before(lsVoicePick(s)); n.querySelectorAll("select option").forEach(o => { if (GEMHAS.set?.has(o.value)) o.textContent += " · 🎙 Gemini"; }); } return n; };
  const _run = dpRun; dpRun = function (s, D) { const n = _run(s, D); if ((D.step === 2 || D.step === 5) && !n.querySelector(".ls-voice")) n.querySelector(".ls-player")?.before(lsVoicePick(s)); return n; };
  const _tab = lsDeepTab; lsDeepTab = function () { const n = _tab(); if (!UI.lsDp?.id) n.querySelectorAll(".dp-it").forEach((b, i) => { const s = LS_BANK[i], t = s && gemTag(s.id); if (t) b.append(t); }); return n; };
  /* Mở một video YouTube để nghe ngay tại chỗ, không lưu link */
  const _ex = dpExtra; dpExtra = function () {
    const n = _ex(), Y = UI.dpYt ||= { url: "", id: "" };
    const idOf = u => (String(u).match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(String(u).trim()) ? String(u).trim() : "");
    const inp = h("input", { type: "url", placeholder: "Dán link YouTube để xem ngay tại đây", value: Y.url, style: "flex:1;min-width:0", oninput: e => { Y.url = e.target.value; }, onkeydown: e => { if (e.key === "Enter") open(); } });
    const open = () => { const id = idOf(Y.url); if (!id) { toast("Link YouTube chưa đúng"); return; } Y.id = id; Y.t0 = Date.now(); render(); };
    const box = h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "row", style: "gap:6px;flex-wrap:nowrap" }, inp, h("button", { class: "btn", type: "button", onclick: open }, "Mở video")),
      Y.id ? h("div", { class: "dp-yt" }, h("iframe", { src: `https://www.youtube-nocookie.com/embed/${Y.id}?cc_load_policy=${UI.dpX?.lv === "en" ? 1 : 0}&cc_lang_pref=en&hl=en&rel=0&modestbranding=1`, title: "Video YouTube", allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: "", referrerpolicy: "strict-origin-when-cross-origin" })) : null,
      Y.id ? h("div", { class: "row small", style: "gap:8px;align-items:center;flex-wrap:wrap" }, h("span", { class: "muted" }, "Link chỉ để xem tại chỗ, không lưu lại. Phụ đề và tốc độ chỉnh ở nút ⚙ trong video."),
        h("button", { class: "btn btn-quiet", type: "button", onclick: () => { const m = Math.max(1, Math.round((Date.now() - Y.t0) / 60000)); UI.dpX.m = m; Y.id = ""; Y.url = ""; render(); toast(`Đã điền ${m} phút, chọn mức hiểu rồi bấm Ghi lại`); } }, "Xem xong, điền số phút"),
        h("button", { class: "btn btn-quiet", type: "button", onclick: () => { Y.id = ""; Y.url = ""; render(); } }, "Đóng video")) : null);
    n.querySelector("h2")?.closest(".row")?.after(box); return n;
  };
  document.head.append(h("style", null, ".dp-yt{position:relative;width:100%;aspect-ratio:16/9;max-width:100%;background:#000}.dp-yt iframe{position:absolute;inset:0;width:100%;height:100%;border:0}"));
})();
/* ===== Nghe chép từ video YouTube: tách câu theo phụ đề có sẵn của video (căn mốc từng từ), phát đúng một câu rồi tự dừng, chép lại và so ===== */
function dpDictYt() {
  const Y = UI.dyt ||= { url: "", id: "", sents: null, how: "", err: "", busy: "", i: 0, typed: "", res: null, adj: {}, need: false };
  const save = () => { try { localStorage.setItem("yt2:" + Y.id, JSON.stringify({ sents: Y.sents, how: Y.how, adj: Y.adj })); } catch {} };
  const setS = (sents, how) => { if (!sents.length) { Y.err = "Không tách được câu nào."; Y.busy = ""; render(); return; } Object.assign(Y, { sents, how, busy: "", need: false, err: "", i: 0, typed: "", res: null }); save(); render(); };
  const load = async () => {
    const id = ytId(Y.url); if (!id) { Y.err = "Link YouTube chưa đúng."; render(); return; }
    Object.assign(Y, { id, sents: null, err: "", busy: "Đang mở video…", how: "", adj: {}, need: false }); render();
    try { await ytOpen(id); } catch (e) { Y.err = e.message; Y.busy = ""; render(); return; }
    const c = (() => { try { return JSON.parse(localStorage.getItem("yt2:" + id) || "null"); } catch { return null; } })();
    if (c?.sents?.length) { Object.assign(Y, { sents: c.sents, how: c.how, adj: c.adj || {}, busy: "", i: 0 }); render(); return; }
    Y.busy = "Đang lấy phụ đề của video…"; render();
    try { const r = await window.__yt?.(id); if (r?.cues?.length) { setS(ytSentencesBest(r), ytHow(r)); return; } } catch (e) { console.warn(e); }
    Y.busy = ""; Y.need = true; render();
  };
  const urlIn = h("input", { type: "url", placeholder: "Dán link YouTube có phụ đề tiếng Anh…", value: Y.url, style: "flex:1;min-width:0", oninput: e => { Y.url = e.target.value; }, onkeydown: e => { if (e.key === "Enter") load(); } });
  const paste = h("textarea", { rows: "5", placeholder: "Dán bản chép lời có mốc thời gian (tệp .vtt/.srt, hoặc chép từ “Hiện bản chép lời” của YouTube)…" });
  const head = h("section", { class: "card stack", style: "gap:8px" }, h("div", { class: "row", style: "gap:6px;flex-wrap:nowrap" }, urlIn, h("button", { class: "btn btn-primary", type: "button", onclick: load }, "Mở video")),
    h("span", { class: "small muted" }, "Web dùng phụ đề có sẵn của video để tách từng câu. Video có cả phụ đề người gõ lẫn phụ đề tự động thì lấy chữ của bản người gõ và mốc từng từ của bản tự động, nên câu cắt khớp tiếng. Link không được lưu, chỉ nhớ cách tách câu trên máy này."),
    Y.err ? h("p", { class: "note bad small", style: "margin:0" }, Y.err) : null, Y.busy ? h("p", { class: "small muted", style: "margin:0" }, Y.busy) : null,
    Y.id ? h("div", { class: "shw-yt-ph" }) : null,
    Y.need ? h("div", { class: "stack", style: "gap:6px" }, h("p", { class: "note warn small", style: "margin:0" }, "Chưa lấy được phụ đề tự động của video này. Trên máy tính: mở video trên YouTube → “…Thêm” → “Hiện bản chép lời” → chép toàn bộ rồi dán vào đây."), paste,
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { const c = ytParsePaste(paste.value); if (!c.length) { Y.err = "Không đọc được mốc thời gian trong đoạn đã dán."; render(); return; } setS(ytSentences(c), "Bản chép lời bạn dán"); } }, "Dùng bản này"))) : null);
  if (!Y.sents) return head;
  const n = Y.sents.length, i = Math.min(Y.i, n - 1), sn = Y.sents[i], ad = Y.adj[i] || [0, 0], s0 = sn.s + ad[0], e0 = sn.e + ad[1];
  /* Tắt phụ đề hiện trên video để không lộ đáp án khi chép */
  const noCaps = () => { for (const t of [0, 300, 1000]) setTimeout(() => { try { SHW.player?.unloadModule("captions"); SHW.player?.unloadModule("cc"); } catch {} }, t); };
  const play = (r, from) => { const x = ytPlaySeg(from ?? s0, e0, r); noCaps(); return x; };
  const nudge = (k, d) => { const a = Y.adj[i] ||= [0, 0]; a[k] = +(a[k] + d).toFixed(2); save(); render(); ytPlaySeg(sn.s + a[0], sn.e + a[1]); };
  const go = d => { Y.i = Math.max(0, Math.min(n - 1, i + d)); Y.typed = ""; Y.res = null; try { SHW.player?.pauseVideo(); } catch {} render(); setTimeout(() => { const z = Y.sents[Y.i], a = Y.adj[Y.i] || [0, 0]; ytPlaySeg(z.s + a[0], z.e + a[1]); noCaps(); }, 60); };
  const W = t => spSpellKeep(t).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
  const check = () => { const disp = sn.x.split(/\s+/), want = W(sn.x), got = W(Y.typed); if (!got.length) return;
    const N = want.length, m = got.length, dp = Array.from({ length: N + 1 }, () => new Array(m + 1).fill(0));
    for (let a = N - 1; a >= 0; a--) for (let b = m - 1; b >= 0; b--) dp[a][b] = want[a] === got[b] ? dp[a + 1][b + 1] + 1 : Math.max(dp[a + 1][b], dp[a][b + 1]);
    const hit = new Set(); let a = 0, b = 0; while (a < N && b < m) { if (want[a] === got[b]) { hit.add(a); a++; b++; } else if (dp[a + 1][b] >= dp[a][b + 1]) a++; else b++; }
    const map = []; let k = 0; for (const w of disp) { const c = W(w).length; map.push([k, k + c]); k += c; }
    Y.res = { want: disp, ok: map.map(([x, y]) => y > x && [...Array(y - x).keys()].every(q => hit.has(x + q))), pct: Math.round(hit.size / Math.max(1, N, m) * 100), kinds: dpDictKinds(disp, Y.typed) };
    const T = (P.ls ||= {}).dictK ||= { small: 0, link: 0, plural: 0, other: 0 }; for (const [z, v] of Object.entries(Y.res.kinds)) T[z] = (T[z] || 0) + v;
    const sd = lsSt("dict"); sd.n = (sd.n || 0) + 1; award("listening", 2); addAct("listening", 1); saveProfile(); render(); };
  const ta = h("textarea", { rows: "2", placeholder: "Gõ lại đúng câu bạn nghe… (Enter để chấm)", oninput: e => { Y.typed = e.target.value; }, onkeydown: e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(); } } }); ta.value = Y.typed;
  const L = { small: "Mất từ nhỏ", link: "Không tách được từ dính nhau", plural: "Nhầm số ít/số nhiều", other: "Từ nội dung bị sót" };
  return h("div", { class: "stack", style: "gap:12px" }, head,
    h("section", { class: "card stack", style: "gap:10px" }, h("div", { class: "row", style: "justify-content:space-between;flex-wrap:wrap" }, h("b", null, `Câu ${i + 1}/${n}`), h("span", { class: "small muted" }, Y.how)),
      h("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => play(1) }, "▶ Nghe câu"), h("button", { class: "btn", type: "button", onclick: () => play(0.75) }, "🐢 0.75×"),
        i ? h("button", { class: "btn btn-quiet", type: "button", onclick: () => { const p0 = Y.sents[i - 1], a0 = Y.adj[i - 1] || [0, 0]; play(1, p0.s + a0[0]); } }, "↺ Nghe từ câu trước") : null),
      h("div", { class: "row small", style: "gap:4px;flex-wrap:wrap" }, h("span", { class: "muted" }, "Câu cắt lệch? Chỉnh mốc:"), [["⇤ bắt đầu sớm", 0, -0.2], ["bắt đầu muộn ⇥", 0, 0.2], ["cắt sớm", 1, -0.2], ["cắt muộn", 1, 0.2]].map(([t, k, d]) => h("button", { class: "btn btn-quiet small", type: "button", onclick: () => nudge(k, d) }, t))),
      ta, h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: check }, "Chấm"), h("button", { class: "btn btn-quiet", type: "button", disabled: !i || null, onclick: () => go(-1) }, "‹ Câu trước"), h("button", { class: "btn btn-quiet", type: "button", disabled: i >= n - 1 || null, onclick: () => go(1) }, "Câu tiếp ›")),
      Y.res ? h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "chip " + (Y.res.pct >= 90 ? "good" : Y.res.pct >= 60 ? "warn" : "bad") }, `Đúng ${Y.res.pct}% số từ`),
        h("p", { class: "ls-dict-res", style: "margin:0" }, Y.res.want.map((w, k) => [h("span", { class: Y.res.ok[k] || !/[a-z0-9]/i.test(w) ? "ok" : "no" }, w), " "])),
        Object.values(Y.res.kinds).some(Boolean) ? h("span", { class: "small" }, "Lỗi tai: " + Object.entries(Y.res.kinds).filter(([, v]) => v).map(([z, v]) => `${L[z]} ${v}`).join(" · ")) : h("span", { class: "small" }, "Không sót từ nào 🎯")) : null));
}
(function () {
  const _d = lsDictTab;
  lsDictTab = function () {
    const src = UI.dSrc || "bank", tog = h("div", { class: "row", style: "gap:6px;align-items:center" }, h("span", { class: "small muted" }, "Nguồn:"), [["bank", "Bài nghe có sẵn"], ["yt", "Video YouTube"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(src === k), onclick: () => { UI.dSrc = k; try { alStop(); SHW.player?.pauseVideo(); } catch {} render(); } }, t)));
    return h("div", { class: "stack", style: "gap:12px" }, tog, src === "yt" ? dpDictYt() : _d());
  };
})();
