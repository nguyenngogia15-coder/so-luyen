/* ===== Luyện sâu 5 bước cho một Section: đoán trước, nghe 1 lần như thi, chấm và chẩn đoán lỗi, sửa đúng chỗ, nghe lần cuối.
   Ghi lại bản đồ lỗi qua nhiều bài để biết mình hỏng ở khâu nào. ===== */
const DP_ERR = [
  ["sound", "👂", "Không nghe ra âm", "Biết từ đó nhưng lúc nghe không nhận ra", "Chép chính tả câu đó rồi nhại theo 3–5 lần"],
  ["word", "📕", "Không biết từ", "Từ mới, chưa gặp bao giờ", "Ghi cả câu chứa từ vào sổ và nghe lại cách nó được nói"],
  ["trap", "🪤", "Bị đánh lừa", "Người nói đổi ý, hoặc dùng từ đồng nghĩa", "Gạch ra đúng cụm từ đã lừa mình"],
  ["focus", "🌀", "Mất tập trung, lạc nhịp", "Đang nghe thì lạc, mất luôn mấy câu sau", "Tập bắt cụm chuyển ý (moving on, now, finally…) để nhảy về đúng chỗ"],
  ["spell", "✏️", "Nghe đúng nhưng viết sai", "Sai chính tả, quên -s số nhiều, sai số", "Gõ lại đáp án đúng 3 lần, để ý đuôi -s và chính tả"]];
const DP_PRED = [["num", "Số, ngày, giờ, giá"], ["name", "Tên riêng (đánh vần)"], ["sg", "Danh từ số ít"], ["pl", "Danh từ số nhiều"], ["oth", "Loại khác"]];
const DP_SIGN = /\b(moving on|move on|now let'?s|let'?s (?:now )?(?:turn|look|move)|turning (?:now )?to|first(?:ly)?|second(?:ly)?|next|another|finally|in conclusion|to sum up|so,? to summari[sz]e|however|on the other hand|the (?:main|key|first|second|final) (?:point|thing|reason)|what i want to (?:stress|emphasi[sz]e)|i'?d like to)\b/gi;
const dpLog = () => (P.lsDeep ||= []);
function dpMap() { const m = Object.fromEntries(DP_ERR.map(e => [e[0], 0])); for (const r of dpLog()) for (const [k, v] of Object.entries(r.e || {})) m[k] = (m[k] || 0) + v; return m; }
/* Câu trong lời thoại chứa đáp án (với câu điền từ); câu hỏi chọn đáp án thì không dò được */
function dpSentOf(s, it, g) {
  const S = alSents(s); if (g.type !== "gap") return -1;
  for (const a of it.a) { const k = lsNorm(a); if (k.length < 2) continue; const i = S.findIndex(x => lsNorm(x.x).includes(k) || lsNorm(spSpellKeep(x.x)).includes(lsNorm(spSpellKeep(a)))); if (i >= 0) return i; }
  return -1;
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
        h("li", null, h("b", null, "Biết bằng mắt khác biết bằng tai. "), "Nhiều bạn có 6.000 từ trên flashcard nhưng chỉ 2.000 từ trong đôi tai. Học từ mới thì học cả cách nó được nói trong câu."),
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
      ...wrong.map(({ g, it }) => { const i = dpSentOf(s, it, g), sent = i >= 0 ? alSents(s)[i].x : null, ans = g.type === "gap" ? it.a[0] : it.a;
        return h("div", { class: "dp-q stack", style: "gap:8px" },
          h("div", { class: "row", style: "gap:10px;flex-wrap:wrap;align-items:baseline" }, h("b", null, "Câu " + it.n), h("span", { class: "small" }, "Bạn ghi: ", h("s", null, W.ans[it.n] || "(bỏ trống)")), h("span", { class: "small" }, "Đáp án: ", h("b", null, ans)),
            D.pred[it.n] ? h("span", { class: "small muted" }, "Bạn đoán: " + DP_PRED.find(p => p[0] === D.pred[it.n])[1]) : null),
          sent ? h("p", { class: "dp-sent", style: "margin:0" }, "“" + sent + "”") : h("span", { class: "small muted" }, "Câu chọn đáp án: mở lời thoại ở bước 5 để tìm đoạn chứa ý này."),
          sent ? dpPlayer(s, i) : null,
          h("div", { class: "row", style: "gap:4px;flex-wrap:wrap" }, DP_ERR.map(e => h("button", { type: "button", class: "opt", "aria-pressed": String(D.err[it.n] === e[0]), title: e[3], onclick: () => { D.err[it.n] = e[0]; render(); } }, e[1] + " " + e[2])))); }),
      h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", disabled: !allTagged || null, onclick: () => go(wrong.length ? 4 : 5) }, wrong.length ? "Sang bước sửa ›" : "Sang bước 5 ›"), !allTagged ? h("span", { class: "small muted" }, "Chọn loại lỗi cho mọi câu sai trước đã") : null));
  } else if (D.step === 4) {
    const wrong = qs.filter(({ it }) => D.err[it.n]);
    const fix = D.fix ||= {};
    body = h("section", { class: "card stack", style: "gap:12px" }, h("h2", { style: "margin:0" }, "Bước 4 · Sửa đúng chỗ hỏng"),
      h("p", { class: "small muted", style: "margin:0" }, "Mỗi loại lỗi một cách sửa. Khoảng 15 phút."),
      ...wrong.map(({ g, it }) => { const k = D.err[it.n], e = DP_ERR.find(x => x[0] === k), i = dpSentOf(s, it, g), sent = i >= 0 ? alSents(s)[i].x : "", ans = g.type === "gap" ? it.a[0] : it.a, F = fix[it.n] ||= {};
        let task;
        if (k === "sound") {
          const cmp = () => { const w = t => spSpellKeep(t).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean), want = w(sent), got = new Set(w(F.typed || "")); F.res = want.map(x => got.has(x)); F.pct = Math.round(F.res.filter(Boolean).length / Math.max(1, want.length) * 100); if (typeof e4Listen === "function") e4Listen(sent, sent.split(/\s+/).filter((x, q) => !F.res[q]), s.id + ":" + i, F.pct); render(); };
          const ta = h("textarea", { rows: "2", placeholder: "Nghe câu rồi gõ lại chính xác từng từ…", oninput: ev => { F.typed = ev.target.value; } }); ta.value = F.typed || "";
          task = sent ? h("div", { class: "stack", style: "gap:8px" }, h("b", { class: "small" }, "1. Chép chính tả câu chứa đáp án"), dpPlayer(s, i), ta, h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: cmp }, "So với lời thoại")),
            F.res ? h("p", { class: "ls-dict-res", style: "margin:0" }, sent.split(/\s+/).map((x, q) => [h("span", { class: F.res[q] ? "ok" : "no" }, x), " "])) : null,
            h("b", { class: "small" }, "2. Nhại theo (shadowing) 3–5 lần"), h("span", { class: "small muted" }, "Mục tiêu là bắt được âm, chỗ nối, chỗ nuốt âm, chưa cần nói hay. Bấm nghe rồi nói đuổi theo gần như cùng lúc."),
            h("div", { class: "row" }, dpPlayer(s, i, "▶ Nghe và nói theo"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => { F.sh = (F.sh || 0) + 1; render(); } }, `✓ Đã nhại ${F.sh || 0} lần`))) : h("span", { class: "small muted" }, "Mở lời thoại ở bước 5, tìm câu chứa đáp án và nghe lại vài lần.");
        } else if (k === "word") {
          const add = async () => { F.busy = true; render(); try { if (!VOCAB.some(v => v.word.toLowerCase() === String(ans).toLowerCase())) { const d = await dictLook(String(ans)).catch(() => null); await addVocab({ word: String(ans), meaning: d?.[2] || "", pos: d?.[0] || "", ipa: d?.[1] || "", example: sent || d?.[3] || "", topic: "" }); } F.added = true; toast("Đã thêm vào sổ từ, kèm cả câu nghe được"); } catch (er) { toast("Chưa thêm được: " + (er?.message || "lỗi")); } F.busy = false; render(); };
          task = h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small" }, "Ghi cả câu chứa từ, không chỉ mặt chữ, rồi nghe lại cách nó được nói trong câu."), sent ? dpPlayer(s, i) : null,
            h("div", { class: "row" }, h("button", { class: "btn", type: "button", disabled: F.added || F.busy || null, onclick: add }, F.added ? "✓ Đã thêm vào sổ từ" : `+ Thêm “${ans}” vào sổ từ kèm câu`)));
        } else if (k === "trap") {
          const toks = (sent || "").split(/\s+/);
          task = sent ? h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small" }, "Bấm vào những từ đã lừa bạn (chỗ đổi ý như actually, no wait, sorry; hoặc từ đồng nghĩa với từ trong câu hỏi)."), dpPlayer(s, i),
            h("p", { class: "dp-toks", style: "margin:0" }, toks.map((t, q) => h("button", { type: "button", class: "dp-tok" + ((F.mark || []).includes(q) ? " on" : ""), onclick: () => { F.mark ||= []; F.mark = F.mark.includes(q) ? F.mark.filter(z => z !== q) : [...F.mark, q]; render(); } }, t)))) : h("span", { class: "small muted" }, "Mở lời thoại ở bước 5, tìm chỗ người nói đổi ý hoặc nói vòng.");
        } else if (k === "focus") {
          const S = alSents(s), around = i >= 0 ? S.slice(Math.max(0, i - 3), i + 1) : [], signs = S.map(x => x.x).join(" ").match(DP_SIGN) || [];
          task = h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small" }, "Khi lạc, đừng đứng hình. Nghe cụm chuyển ý là cách nhanh nhất nhảy về đúng chỗ, vì mỗi lần người nói chuyển ý thường là sang nhóm câu hỏi mới."),
            signs.length ? h("p", { class: "small", style: "margin:0" }, "Cụm chuyển ý trong bài này: ", [...new Set(signs.map(x => x.toLowerCase()))].map(x => h("mark", { style: "margin-right:6px" }, x))) : null,
            around.length ? h("div", { class: "stack", style: "gap:4px" }, h("span", { class: "small muted" }, "Đoạn dẫn tới câu bạn lạc:"), around.map(x => h("p", { class: "small", style: "margin:0", html: esc(x.x).replace(DP_SIGN, "<mark>$&</mark>") })), dpPlayer(s, i)) : null);
        } else {
          const ok = (F.t || []).filter(x => lsNorm(x) === lsNorm(ans)).length;
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
.dp-toks{line-height:2.2}.dp-tok{font:inherit;border:1px dashed var(--line);background:none;padding:1px 4px;margin:0 2px;cursor:pointer;color:inherit}.dp-tok.on{background:#ffe066;border-color:#e8590c;text-decoration:underline}.dp-in{width:9em}`));
})();
SUB_DESC["lsTab:deep"] = "Đoán trước, nghe 1 lần, chẩn đoán lỗi, sửa đúng chỗ, nghe lại";
