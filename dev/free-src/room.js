/* ===== Phòng thi Speaking giống thật: giám khảo đọc câu hỏi (giọng Gemini thu sẵn mỗi đêm, chưa có thì giọng máy),
   không hiện chữ câu hỏi, tự ghi âm khi tới lượt, Part 2 có 1 phút chuẩn bị và tự dừng ở 2 phút. Chấm: 1 lượt AI ở cuối. ===== */
const SPQ_INTRO2 = "Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic.";
/* Nhóm câu cho máy chủ thu giọng Gemini (mỗi nhóm một lần đọc, các câu cách nhau bằng khoảng lặng) */
function spqGroups() {
  return [...SP_BANK.p1.map((t, i) => ({ id: "p1-" + i, lines: t.qs.map(q => q[0]) })), ...SP_BANK.p2.map((c, i) => ({ id: "p2-" + i, lines: [SPQ_INTRO2 + " " + c.card, ...c.p3.map(q => q[0])] }))];
}
const SPQ = {};
/* Lấy âm thanh giám khảo của một nhóm: {url, segs} hoặc null (chưa thu) */
function spqLoad(g) {
  return SPQ[g.id] ||= (async () => {
    if (!window.__tts) return null;
    const b = await window.__tts({ key: "spq-" + g.id + "-v1", cacheOnly: true }).catch(() => null); if (!b) return null;
    const url = URL.createObjectURL(b), d = await alDecode(url), segs = alSilence(d.a16, g.lines.map(x => ({ x })));
    return segs ? { url, segs, buf: d.buf } : null;
  })().catch(() => null);
}
/* Đọc câu hỏi và chờ đọc xong */
async function spqSay(gid, k, text) {
  const g = spqGroups().find(x => x.id === gid), a = g && await spqLoad(g);
  if (a?.segs?.[k]) { const el = await alPlay(a.buf, a.segs[k][0], a.segs[k][1]); await new Promise(r => { if (el.ended) return r(); el.addEventListener("ended", r, { once: true }); el.addEventListener("pause", r, { once: true }); }); return "gem"; }
  await spSayWait(text); return "k";
}
async function spSayWait(text) {
  try { const e = (await spvIndex())[spvKey(text)]; if (e) { const ab = await spvShard(e[0]); alStop(); const url = URL.createObjectURL(new Blob([new Uint8Array(ab, e[1], e[2])], { type: "audio/mpeg" })), a = new Audio(url); AL_PLAY.a = a; AL_PLAY.url = url; await a.play(); await new Promise(r => { a.onended = r; a.onpause = r; }); return; } } catch {}
  await new Promise(r => { try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; u.rate = 0.95; u.onend = r; u.onerror = r; speechSynthesis.speak(u); setTimeout(r, 2500 + text.length * 75); } catch { r(); } });
}
function beep(f = 880, ms = 160) { try { const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = 0.08; o.connect(g); g.connect(ac.destination); o.start(); setTimeout(() => { o.stop(); ac.close(); }, ms); } catch {} }

/* ----- Phiên thi ----- */
function roomNew() {
  const n1 = SP_BANK.p1.length, a = Math.floor(Math.random() * n1); let b = Math.floor(Math.random() * (n1 - 1)); if (b >= a) b++;
  const ci = Math.floor(Math.random() * SP_BANK.p2.length), c = SP_BANK.p2[ci], items = [];
  for (const ti of [a, b]) SP_BANK.p1[ti].qs.forEach(([q], k) => items.push({ part: 1, q, topic: SP_BANK.p1[ti].topic, max: 45, g: "p1-" + ti, k }));
  items.push({ part: 2, q: c.card, points: c.pts, max: 120, prep: 60, g: "p2-" + ci, k: 0 });
  c.p3.forEach(([q], k) => items.push({ part: 3, q, max: 90, g: "p2-" + ci, k: k + 1 }));
  for (const g of spqGroups().filter(x => items.some(it => it.g === x.id))) spqLoad(g);
  UI.room = { kind: "room", items, i: -1, ans: {}, phase: "intro", show: false, notes: "", queue: Promise.resolve(), pending: 0, voice: null };
}
function roomStop() { const R = UI.room; if (!R) return; R.stopped = true; try { SHW.rec?.stop(); } catch {} alStop(); try { speechSynthesis.cancel(); } catch {} clearInterval(R.tick); }
async function roomRun() {
  const R = UI.room; R.phase = "run"; R.stopped = false; R.i = 0; R.step = "ask"; render();
  for (let i = 0; i < R.items.length && !R.stopped; i++) {
    const it = R.items[i]; R.i = i; R.show = false;
    if (it.part === 2) {
      R.step = "ask"; render(); R.voice = await spqSay(it.g, 0, SPQ_INTRO2 + " " + it.q); if (R.stopped) return;
      R.step = "prep"; R.left = it.prep; render();
      await new Promise(res => { R.tick = setInterval(() => { R.left--; const el = document.getElementById("room-clock"); if (el) el.textContent = mmss(Math.max(0, R.left)); if (R.left <= 0 || R.stopped || R.skipPrep) { clearInterval(R.tick); R.skipPrep = false; res(); } }, 1000); });
      if (R.stopped) return; await spSayWait("All right? Remember you have one to two minutes for this. Please start speaking now.");
    } else { R.step = "ask"; render(); R.voice = await spqSay(it.g, it.k, it.q); }
    if (R.stopped) return;
    beep(); R.step = "rec"; R.t0 = Date.now(); render();
    clearInterval(R.tick); R.tick = setInterval(() => { const el = document.getElementById("room-clock"); if (el) el.textContent = it.part === 2 ? mmss(Math.max(0, it.max - Math.floor((Date.now() - R.t0) / 1000))) : mmss(Math.floor((Date.now() - R.t0) / 1000)); }, 500);
    let blob = null;
    try { blob = await autoRec({ maxSec: it.max, quietSec: it.part === 2 ? 6 : 2.5, idleSec: it.part === 2 ? 15 : 8 }); } catch (e) { R.err = e?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng micro." : "Không ghi âm được: " + (e?.message || e); roomStop(); render(); return; }
    clearInterval(R.tick); if (R.stopped) return;
    if (it.part === 2) await spSayWait("Thank you.");
    R.pending++; const idx = i;
    R.queue = R.queue.then(async () => { try { R.ans[idx] = await spAnalyze(blob); } catch (e) { R.ans[idx] = null; R.fail = (R.fail || 0) + 1; } R.pending--; if (R.phase === "done") render(); });
  }
  if (R.stopped) return;
  R.step = null; await spSayWait("Thank you. That is the end of the speaking test."); R.phase = "done"; render();
}
function roomView() {
  const R = UI.room, it = R.items[R.i];
  if (R.phase === "intro") return h("section", { class: "card stack", style: "gap:10px" }, h("h2", null, "Phòng thi giống thật"),
    h("ul", { class: "gex" }, h("li", null, "Giám khảo đọc câu hỏi, chữ câu hỏi được ẩn như thi thật (bấm hiện được nếu nghe không ra)."), h("li", null, "Sau tiếng bíp là tới lượt bạn: máy tự ghi âm và tự dừng khi bạn ngừng nói khoảng 2,5 giây (Part 1, 3)."), h("li", null, "Part 2: đọc thẻ đề, 1 phút chuẩn bị (ghi chú được), rồi nói; tới 2 phút giám khảo tự dừng bạn."), h("li", null, `Gồm ${R.items.filter(x => x.part === 1).length} câu Part 1, 1 thẻ Part 2, ${R.items.filter(x => x.part === 3).length} câu Part 3, khoảng 12–14 phút. Xong mới chấm 1 lượt AI.`), h("li", null, "Nên đeo tai nghe có micro và ngồi chỗ yên tĩnh.")),
    spModelCard(["asr", "phx"]),
    h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", disabled: !spReady(["asr", "phx"]) || null, onclick: () => roomRun() }, "Bắt đầu thi"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => { UI.room = null; render(); } }, "Thoát")));
  if (R.phase === "done") {
    const S = { kind: "room", items: R.items, ans: Object.fromEntries(Object.entries(R.ans).filter(([, v]) => v)) };
    return h("div", { class: "stack", style: "gap:14px" }, h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Hết giờ thi"),
      R.pending ? h("p", { class: "muted" }, `Máy đang chép lời và đo các câu cuối (còn ${R.pending})…`) : h("p", { class: "small muted", style: "margin:0" }, `Đã ghi ${Object.keys(S.ans).length}/${R.items.length} câu trả lời.` + (R.fail ? ` ${R.fail} câu không nghe rõ nên bỏ qua.` : "")),
      h("div", { class: "row" }, h("button", { class: "btn btn-quiet", type: "button", onclick: () => { UI.room = null; render(); } }, "Thoát (không chấm)"))),
      !R.pending && Object.keys(S.ans).length ? spGradeCard(S, Object.keys(S.ans).length === R.items.length) : null,
      !R.pending ? h("details", null, h("summary", null, "Xem lại lời bạn đã nói"), h("div", { class: "stack", style: "gap:8px;margin-top:8px" }, R.items.map((x, k) => h("div", { class: "stack", style: "gap:2px" }, h("b", { class: "small" }, `Part ${x.part}: ${x.q}`), h("span", { class: "small" }, R.ans[k]?.text || "(không có)"))))) : null);
  }
  const partN = it.part, stepTxt = R.step === "ask" ? "Giám khảo đang hỏi…" : R.step === "prep" ? "Thời gian chuẩn bị" : R.step === "rec" ? (partN === 2 ? "Bạn đang nói, còn" : "Đến lượt bạn, đang ghi") : "";
  return h("div", { class: "stack", style: "gap:14px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("button", { class: "btn btn-quiet", type: "button", onclick: () => { if (!confirm("Dừng bài thi? Các câu đã trả lời vẫn chấm được.")) return; roomStop(); R.phase = "done"; render(); } }, "■ Dừng thi"), h("span", { class: "small muted" }, `Câu ${R.i + 1}/${R.items.length} · Part ${partN}`)),
    h("div", { class: "meter" }, h("i", { style: `width:${R.i / R.items.length * 100}%` })),
    R.err ? h("p", { class: "note bad" }, R.err) : null,
    h("section", { class: "card stack room-card", style: "gap:12px;align-items:center;text-align:center" },
      h("span", { class: "eyebrow" }, `Part ${partN}` + (it.topic ? " · " + it.topic : "")),
      h("div", { class: "room-orb " + (R.step || "") }, R.step === "ask" ? "🗣️" : R.step === "rec" ? "🎙️" : "📝"),
      h("b", { class: "room-step" }, stepTxt), R.step === "prep" || R.step === "rec" ? h("span", { id: "room-clock", class: "timer" }, partN === 2 && R.step === "rec" ? mmss(it.max) : R.step === "prep" ? mmss(R.left) : "0:00") : null,
      partN === 2 ? h("div", { class: "room-cue stack", style: "gap:6px;text-align:left" }, h("b", null, it.q), h("span", { class: "small muted" }, "You should say:"), h("ul", { class: "gex" }, it.points.map(p => h("li", null, p))), h("span", { class: "small muted" }, "and explain why.")) :
        R.show ? h("p", { class: "prompt", style: "margin:0" }, it.q) : h("button", { class: "btn btn-quiet small", type: "button", onclick: () => { R.show = true; render(); } }, "Hiện câu hỏi (nếu nghe không ra)"),
      R.step === "prep" ? h("textarea", { rows: "4", placeholder: "Ghi chú nhanh 4–6 từ khóa…", style: "max-width:520px;width:100%", oninput: e => { R.notes = e.target.value; } }, R.notes) : null,
      R.step === "prep" ? h("button", { class: "btn", type: "button", onclick: () => { R.skipPrep = true; } }, "Tôi chuẩn bị xong, nói luôn") : null,
      R.step === "rec" ? h("button", { class: "btn btn-primary", type: "button", onclick: () => SHW.rec?.stop() }, partN === 2 ? "Tôi nói xong" : "Xong câu này") : null,
      R.voice === "k" ? h("span", { class: "small muted" }, "Câu này đang dùng giọng máy; giọng giám khảo Gemini được máy chủ thu dần mỗi đêm.") : null));
}
