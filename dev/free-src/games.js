/* ===== Game cho Nghe và Nói =====
   Nghe: Nhà báo điền tin (bản tin ngắn, 5 chỗ trống, sai là mất mạng), Đuổi giọng (số, giá, tên đọc ngày càng nhanh).
   Nói: Đọc thần chú (câu luyện âm khó, phá 8 phong ấn), Nói 1 phút không ngừng, Phản xạ nhanh (Part 1), Nhại ngữ điệu (so cao độ giọng). */
const GM = { idx: null, buf: null };
const gmSt = k => ((P.gm ||= {})[k] ||= {});
function gmIndex() { return GM.idx ||= fetch("voice/gm/index.json").then(r => { if (!r.ok) throw new Error("gm " + r.status); return r.json(); }).catch(e => { GM.idx = null; throw e; }); }
async function gmAudio(key, rate = 1) {
  const ix = (await gmIndex()).ix[key]; if (!ix) throw new Error("thiếu âm thanh");
  const ab = await (GM.buf ||= fetch("voice/gm/00.mp3").then(r => r.arrayBuffer()).catch(e => { GM.buf = null; throw e; }));
  alStop(); try { SPV.audio?.pause(); } catch {}
  const url = URL.createObjectURL(new Blob([new Uint8Array(ab, ix[1], ix[2])], { type: "audio/mpeg" })), a = new Audio(url); a.playbackRate = rate; try { a.preservesPitch = true; } catch {}
  AL_PLAY.a = a; AL_PLAY.url = url; await a.play(); return new Promise(res => { a.onended = () => res(); });
}
const gmXp = (n, skill, min, key) => { XP_CAP.game ??= 80; if (key) { const t = gmSt(key); t.n = (t.n || 0) + 1; } award("game", n); addAct(skill, min); try { achCheck(); } catch {} saveProfile(); };
const gmHead = (title, sub, best) => h("div", { class: "row gm-head", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px" }, h("div", { class: "stack", style: "gap:2px" }, h("h2", { style: "margin:0" }, title), h("span", { class: "small muted" }, sub)), best != null ? h("span", { class: "chip acc" }, "Kỷ lục: " + best) : null);
const gmHearts = n => h("span", { class: "gm-hearts", "aria-label": n + " mạng" }, "❤️".repeat(Math.max(0, n)) + "🖤".repeat(Math.max(0, 3 - n)));

/* ----- Nhà báo điền tin ----- */
const GM_NUMW = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
function gmNorm(s) {
  let x = String(s || "").toLowerCase().trim(); if (GM_NUMW[x] != null) x = String(GM_NUMW[x]);
  x = x.replace(/[£$,]/g, "").replace(/\s*(a\.?m\.?|p\.?m\.?|o'?clock)$/g, "").replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/(\d):(\d)/g, "$1.$2");
  if (/^[\d\s.-]+$/.test(x) && x.replace(/\D/g, "").length >= 7) return x.replace(/\D/g, "");
  return x.replace(/\s+/g, "");
}
function gmNews() {
  const G = UI.gn ||= { lv: 1, lives: 3, score: 0, perfect: 0, item: null, ans: {}, plays: 0, res: null, over: false, seen: [] }, st = gmSt("news");
  const box = h("div", { class: "stack", style: "gap:12px" }, h("p", { class: "muted" }, "Đang tải bản tin…"));
  gmIndex().then(D => {
    if (!G.item) { const pool = D.news.filter(n => n.lv === G.lv && !G.seen.includes(n.id)); const p = pool.length ? pool : D.news.filter(n => n.lv === G.lv); G.item = p[Math.floor(Math.random() * p.length)]; G.seen.push(G.item.id); G.ans = {}; G.plays = 0; G.res = null; }
    const it = G.item, maxPlay = G.lv === 1 ? 2 : 1;
    const restart = () => { UI.gn = null; render(); };
    if (G.over) { box.replaceChildren(gmHead("Nhà báo điền tin", "Hết mạng rồi!", st.best), h("section", { class: "card stack gm-over", style: "gap:10px;align-items:center;text-align:center" }, h("span", { class: "gm-big" }, G.score), h("span", { class: "eyebrow" }, "điểm"), h("p", { style: "margin:0" }, G.score >= (st.best || 0) ? "Kỷ lục mới!" : `Kỷ lục của bạn: ${st.best}`), h("button", { class: "btn btn-primary", type: "button", onclick: restart }, "Chơi lại"))); return; }
    const inputs = it.a.map((_, i) => h("input", { type: "text", class: "gm-in" + (G.res ? (G.res[i] ? " ok" : " bad") : ""), autocomplete: "off", spellcheck: "false", value: G.ans[i] || "", disabled: !!G.res || null, oninput: e => { G.ans[i] = e.target.value; }, onkeydown: e => { if (e.key === "Enter") submit(); }, "aria-label": "Chỗ trống " + (i + 1) }));
    const submit = () => {
      if (G.res) return; G.res = it.a.map((a, i) => gmNorm(G.ans[i]) === gmNorm(a)); const n = G.res.filter(Boolean).length;
      G.score += n * 10 * G.lv; if (n === 5) { G.perfect++; G.score += 20 * G.lv; } else { G.perfect = 0; G.lives--; }
      if (n === 5) st.perf = (st.perf || 0) + 1; gmXp(n * 2, "listening", 2, "news");
      if (G.lives <= 0) { G.over = true; if (G.score > (st.best || 0)) st.best = G.score; saveProfile(); }
      render();
    };
    const next = () => { if (G.perfect >= 2 && G.lv < 3) { G.lv++; G.perfect = 0; toast("Lên cấp " + G.lv + ": đọc nhanh hơn, chỉ nghe 1 lần"); if (G.lv > (st.lv || 1)) st.lv = G.lv; } G.item = null; render(); };
    const lbl = () => G.plays ? (G.plays >= maxPlay ? "Hết lượt nghe" : "▶ Nghe lại") : "▶ Nghe bản tin";
    const left = h("span", { class: "small muted" }, `Còn ${Math.max(0, maxPlay - G.plays)} lượt nghe`);
    const done = () => { playBtn.classList.remove("gm-playing"); playBtn.disabled = G.plays >= maxPlay; playBtn.replaceChildren(lbl()); stopBtn.disabled = true; };
    const playBtn = h("button", { class: "btn btn-primary gm-play", type: "button", disabled: G.plays >= maxPlay || null, onclick: async () => {
      if (playBtn.classList.contains("gm-playing")) return; G.plays++; left.textContent = `Còn ${Math.max(0, maxPlay - G.plays)} lượt nghe`;
      playBtn.classList.add("gm-playing"); playBtn.replaceChildren(h("span", { class: "gm-wave" }, h("i"), h("i"), h("i"), h("i")), "Đang phát"); stopBtn.disabled = false;
      try { await gmAudio(it.id); } catch (er) { toast("Chưa phát được: " + er.message); } done(); } }, lbl());
    const stopBtn = h("button", { class: "btn gm-stop", type: "button", disabled: true, onclick: () => { gmStopAll(); done(); } }, "■ Dừng");
    const playRow = h("div", { class: "row", style: "gap:10px;align-items:center;flex-wrap:wrap" }, playBtn, stopBtn, left);
    const wide = a => /^[\d£$.,:\s%-]+$/.test(a) ? " gm-s" : String(a).length > 9 ? " gm-l" : "";
    inputs.forEach((el, i) => { el.className += wide(it.a[i]); });
    const again = h("button", { class: "btn btn-quiet gm-again", type: "button", onclick: () => {
      if (!again.dataset.ok && (G.score || G.plays)) { again.dataset.ok = 1; again.textContent = "Bấm lần nữa để chơi lại từ đầu"; setTimeout(() => { if (again.isConnected) { delete again.dataset.ok; again.textContent = "↺ Chơi lại"; } }, 3000); return; }
      gmStopAll(); if (G.score > (st.best || 0)) { st.best = G.score; saveProfile(); } restart(); } }, "↺ Chơi lại");
    let k = 0; const text = h("p", { class: "gm-news" }, it.d.map(p => typeof p === "string" ? p : inputs[p.b]));
    box.replaceChildren(
      gmHead("Nhà báo điền tin", "Nghe bản tin, điền 5 chỗ trống (số, tên, ngày giờ). Sai một chỗ là mất 1 mạng. Đúng hết 2 bản liền thì lên cấp.", st.best),
      h("div", { class: "row", style: "gap:12px;flex-wrap:wrap;align-items:center" }, gmHearts(G.lives), h("b", null, `Điểm ${G.score}`), h("span", { class: "chip" }, ["", "Cấp 1 · chậm, nghe 2 lần", "Cấp 2 · bình thường, nghe 1 lần", "Cấp 3 · nhanh, nghe 1 lần"][G.lv]), again),
      h("section", { class: "card stack", style: "gap:12px" }, h("span", { class: "eyebrow" }, "Bản tin: " + it.t),
        playRow,
        text, h("p", { class: "small muted", style: "margin:0" }, "Gõ số bằng chữ số (45, 8:30, £12). Tên riêng gõ đúng chính tả như được đánh vần."),
        G.res ? h("div", { class: "stack", style: "gap:6px" }, h("p", { class: "note " + (G.res.every(Boolean) ? "good" : "bad"), style: "margin:0" }, G.res.every(Boolean) ? "Chuẩn như nhà báo! +" + (70 * G.lv) + " điểm" : `Đúng ${G.res.filter(Boolean).length}/5, mất 1 mạng. Đáp án: ` + it.a.map((a, i) => G.res[i] ? null : `(${i + 1}) ${a}`).filter(Boolean).join(", ")),
          h("button", { class: "btn btn-primary", type: "button", style: "align-self:flex-start", onclick: next }, "Bản tin tiếp →")) : h("button", { class: "btn btn-primary", type: "button", style: "align-self:flex-start", onclick: submit }, "Nộp bài")));
  }, e => box.replaceChildren(h("p", { class: "note bad" }, "Chưa tải được bản tin: " + e.message)));
  return box;
}

/* ----- Đuổi giọng ----- */
function gmChase() {
  const C = UI.gc ||= { on: false, over: false, lives: 3, n: 0, rate: 1, lim: 15, it: null, val: "", t0: 0, res: null }, st = gmSt("chase");
  const box = h("div", { class: "stack", style: "gap:12px" });
  const start = () => { Object.assign(C, { on: true, over: false, lives: 3, n: 0, rate: 1, lim: 15, it: null, res: null }); round(); };
  const round = () => ndIndex().then(D => { const pool = D.items.filter(x => x.c !== "addr"); C.it = pool[Math.floor(Math.random() * pool.length)]; C.val = ""; C.res = null; C.t0 = Date.now() + 99e9; render(); ndPlay(C.it, C.rate).then(a => { a.onended = () => { C.t0 = Date.now(); }; }).catch(() => { C.t0 = Date.now(); }); });
  const judge = timeout => { if (C.res) return; const ok = !timeout && ndCheck(C.it, C.val); C.res = ok ? "ok" : timeout ? "time" : "bad";
    if (ok) { C.n++; C.rate = Math.min(1.8, +(C.rate + 0.07).toFixed(2)); C.lim = Math.max(7, C.lim - 0.5); } else C.lives--;
    if (C.lives <= 0) { C.over = true; C.on = false; if (C.n > (st.best || 0)) st.best = C.n; gmXp(Math.min(40, C.n * 3), "listening", Math.max(0.5, C.n * 0.5), "chase"); }
    render(); if (!C.over) setTimeout(() => { if (UI.gc === C && C.res) round(); }, ok ? 700 : 2200); };
  if (C.on && C.it && !C.res) { clearInterval(GM.tk); GM.tk = setInterval(() => { if (UI.gc !== C || C.res || !document.querySelector(".gm-chase")) return clearInterval(GM.tk); const left = C.lim - (Date.now() - C.t0) / 1000, bar = document.querySelector(".gm-time i"); if (bar) bar.style.width = Math.max(0, Math.min(100, left / C.lim * 100)) + "%"; if (left <= 0) { clearInterval(GM.tk); judge(true); } }, 100); }
  const inp = h("input", { type: "text", class: "fc-input", autocomplete: "off", spellcheck: "false", placeholder: "Gõ điều bạn nghe…", value: C.val, disabled: !!C.res || null, oninput: e => { C.val = e.target.value; }, onkeydown: e => { if (e.key === "Enter") judge(false); } });
  if (C.on && !C.res) setTimeout(() => inp.focus(), 0);
  box.append(gmHead("Đuổi giọng", "Nghe số điện thoại, giá tiền, ngày giờ, tên đánh vần. Mỗi câu đúng giọng đọc nhanh hơn và thời gian ngắn lại. Sai hoặc hết giờ mất 1 mạng.", st.best),
    !C.on ? h("section", { class: "card stack gm-over", style: "gap:10px;align-items:center;text-align:center" }, C.over ? [h("span", { class: "gm-big" }, C.n), h("span", { class: "eyebrow" }, "câu đúng"), h("p", { style: "margin:0" }, C.n >= (st.best || 0) ? "Kỷ lục mới!" : "Kỷ lục: " + st.best)] : h("p", { style: "margin:0" }, "Bắt đầu ở tốc độ bình thường, cao nhất gấp 1,8 lần."), h("button", { class: "btn btn-primary", type: "button", onclick: start }, C.over ? "Chơi lại" : "Bắt đầu"))
      : h("section", { class: "card stack gm-chase", style: "gap:12px" },
        h("div", { class: "row", style: "gap:12px;flex-wrap:wrap;align-items:center" }, gmHearts(C.lives), h("b", null, `Đúng ${C.n}`), h("span", { class: "chip" }, `Tốc độ ×${C.rate.toFixed(2)}`), h("span", { class: "chip" }, ND_CAT[C.it?.c]?.[0] || "")),
        h("div", { class: "gm-time" }, h("i", { style: "width:100%" })),
        h("div", { class: "fc-ask" }, inp, h("button", { class: "btn btn-primary", type: "button", disabled: !!C.res || null, onclick: () => judge(false) }, "Chốt")),
        C.res ? h("p", { class: "note " + (C.res === "ok" ? "good" : "bad"), style: "margin:0" }, C.res === "ok" ? "✓ Đúng!" : (C.res === "time" ? "Hết giờ! " : "Sai! ") + "Đáp án: " + C.it.a) : h("span", { class: "small muted" }, "Đồng hồ chạy khi giọng đọc xong. Enter để chốt.")));
  return box;
}

/* ----- Đọc thần chú ----- */
function gmSpell() {
  const S = UI.gs ||= { seal: null, i: 0, sc: {}, res: null }, st = gmSt("spell"); st.won ||= {};
  const box = h("div", { class: "stack", style: "gap:12px" });
  gmIndex().then(D => {
    const seals = D.spells; st.all = seals.length;
    if (S.seal == null) {
      box.replaceChildren(gmHead("Đọc thần chú", "Mỗi phong ấn là 3 câu luyện một âm khó với người Việt. Đọc to, máy chấm từng âm; trung bình từ 75 điểm là phá được phong ấn và mở phong ấn tiếp theo.", Object.keys(st.won).length + "/" + seals.length + " phong ấn"),
        h("div", { class: "gm-seals" }, seals.map((s, i) => { const open = i === 0 || st.won[seals[i - 1].id] != null, w = st.won[s.id]; return h("button", { type: "button", class: "gm-seal" + (w != null ? " won" : "") + (open ? "" : " lock"), disabled: !open || null, onclick: () => { Object.assign(S, { seal: i, i: 0, sc: {}, res: null }); render(); } }, h("span", { class: "gm-rune" }, w != null ? "✦" : open ? "◈" : "🔒"), h("b", null, s.t), h("span", { class: "small muted" }, w != null ? `Đã phá · ${w} điểm` : open ? "Sẵn sàng" : "Phá phong ấn trước để mở")); })));
      return;
    }
    const seal = seals[S.seal], txt = seal.s[S.i], back = () => { S.seal = null; render(); };
    if (txt == null) {
      const vals = Object.values(S.sc), avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, win = avg >= 75;
      if (win && (st.won[seal.id] ?? -1) < avg) { st.won[seal.id] = avg; saveProfile(); }
      if (!S.paid) { S.paid = 1; gmXp(win ? 20 : 6, "speaking", 3, "spell"); }
      box.replaceChildren(gmHead("Đọc thần chú · " + seal.t, "", null), h("section", { class: "card stack gm-over" + (win ? " gm-win" : ""), style: "gap:10px;align-items:center;text-align:center" }, h("span", { class: "gm-big" }, win ? "✦" : avg), h("p", { style: "margin:0" }, win ? `Phong ấn đã vỡ! Trung bình ${avg} điểm.` : `Trung bình ${avg} điểm, cần 75. Thử lại nhé!`),
        h("div", { class: "row", style: "justify-content:center" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => { Object.assign(S, { i: 0, sc: {}, res: null, paid: 0 }); render(); } }, "Đọc lại"), h("button", { class: "btn", type: "button", onclick: back }, "Về bản đồ phong ấn"))));
      return;
    }
    const judge = async (blob, say) => { await spLoad("phx"); const r = await spCheckText(blob, txt, say, "phx"); S.sc[S.i] = Math.max(S.sc[S.i] ?? 0, r.score ?? 0); S.res = r; render(); };
    box.replaceChildren(gmHead("Đọc thần chú · " + seal.t, `Câu ${S.i + 1}/3`, null),
      h("section", { class: "card stack gm-spell", style: "gap:12px;align-items:center;text-align:center" }, h("span", { class: "gm-rune big" }, "◈"), h("p", { class: "gm-incant" }, txt),
        h("button", { class: "btn", type: "button", onclick: () => gmAudio(seal.id + "-" + S.i).catch(() => spSay(txt)) }, "🔊 Nghe thần chú mẫu"),
        spModelCard(["phx"]), spReady(["phx"]) ? recBox(judge, { max: 10, hint: "Đọc to cả câu rồi bấm Dừng." }) : null,
        S.res ? resultView(S.res, { label: "Sức mạnh" }) : null,
        h("div", { class: "row", style: "justify-content:center" }, h("button", { class: "btn" + (S.sc[S.i] != null ? " btn-primary" : ""), type: "button", onclick: () => { S.i++; S.res = null; render(); } }, S.sc[S.i] != null ? "Câu tiếp →" : "Bỏ qua →"), h("button", { class: "btn btn-quiet", type: "button", onclick: back }, "Thoát"))));
  }, e => box.replaceChildren(h("p", { class: "note bad" }, "Chưa tải được: " + e.message)));
  return box;
}

/* ----- Nói 1 phút không ngừng ----- */
function gmTalk() {
  const T = UI.gt ||= { card: null, phase: "pick", el: 0, res: null }, st = gmSt("talk");
  const cards = SP_BANK.p2 || [];
  if (!T.card) T.card = cards[Math.floor(Math.random() * cards.length)];
  const go = async () => {
    T.phase = "rec"; T.el = 0; render();
    try {
      const blob = await autoRec({ maxSec: 60, quietSec: 3, idleSec: 6, onState: (s, x) => { if (x) { T.el = x.el; const el = document.querySelector(".gm-talk-t"); if (el) el.textContent = Math.floor(x.el) + " giây"; const bar = document.querySelector(".gm-time i"); if (bar) bar.style.width = Math.min(100, x.el / 60 * 100) + "%"; } } });
      const a = await spDecode(blob), z = spPauses(a), secs = Math.min(60, Math.round(a.length / 16000));
      T.res = { secs, win: secs >= 59, speech: z.speech, blob, words: null }; T.phase = "done";
      if (secs > (st.best || 0)) st.best = secs; if (T.res.win) st.w = (st.w || 0) + 1; gmXp(T.res.win ? 25 : 5, "speaking", 1, "talk"); render();
    } catch (e) { T.phase = "pick"; toast(e?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng micro." : "Chưa ghi âm được."); render(); }
  };
  const count = async () => { T.res.words = "…"; render(); try { const tr = await spTranscribe(await spDecode(T.res.blob)); const n = tr.text.split(/\s+/).filter(Boolean).length; T.res.words = n; T.res.wpm = Math.round(n / Math.max(1, T.res.secs) * 60); T.res.text = tr.text; } catch (e) { T.res.words = null; toast("Chưa đếm được từ"); } render(); };
  return h("div", { class: "stack", style: "gap:12px" },
    gmHead("Nói 1 phút không ngừng", "Bốc một chủ đề Part 2, nói liền 60 giây. Im lặng quá 3 giây là thua.", st.best != null ? st.best + " giây" : null),
    h("section", { class: "card stack", style: "gap:10px" }, h("span", { class: "eyebrow" }, "Chủ đề"), h("h3", { style: "margin:0" }, T.card.card), h("span", { class: "small" }, "You should say:"), h("ul", { class: "small", style: "margin:0;padding-left:18px" }, (T.card.pts || []).map(p => h("li", null, p))),
      T.phase === "pick" ? h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, h("button", { class: "btn btn-primary", type: "button", onclick: go }, "● Bắt đầu nói"), h("button", { class: "btn", type: "button", onclick: () => { T.card = null; render(); } }, "🎲 Bốc chủ đề khác")) : null,
      T.phase === "rec" ? h("div", { class: "stack", style: "gap:6px" }, h("b", { class: "gm-talk-t gm-big", style: "font-size:2rem" }, "0 giây"), h("div", { class: "gm-time" }, h("i", { style: "width:0%" })), h("span", { class: "small muted" }, "Cứ nói tiếp! Ngừng quá 3 giây là máy dừng."), h("button", { class: "btn", type: "button", onclick: () => SHW.rec?.stop() }, "■ Dừng")) : null,
      T.phase === "done" ? h("div", { class: "stack gm-over" + (T.res.win ? " gm-win" : ""), style: "gap:8px" }, h("b", { style: "font-size:1.4rem" }, T.res.win ? "🏆 Bạn nói đủ 1 phút!" : `Dừng ở giây thứ ${T.res.secs}`), h("span", { class: "small muted" }, `Thời gian có tiếng nói: ${Math.round(T.res.speech)} giây.`),
        T.res.words == null ? h("button", { class: "btn", type: "button", style: "align-self:flex-start", onclick: count }, "Đếm số từ và tốc độ nói") : T.res.words === "…" ? h("span", { class: "small" }, "Đang chép lời…") : h("span", null, `${T.res.words} từ · ${T.res.wpm} từ/phút ` + (T.res.wpm >= 120 ? "(trôi chảy)" : T.res.wpm >= 90 ? "(khá)" : "(còn chậm, mục tiêu 110–150)")),
        T.res.text ? h("p", { class: "small muted", style: "margin:0" }, T.res.text) : null,
        h("div", { class: "row", style: "gap:8px" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => { T.phase = "pick"; T.res = null; render(); } }, "Thử lại chủ đề này"), h("button", { class: "btn", type: "button", onclick: () => { UI.gt = null; render(); } }, "Chủ đề mới"))) : null));
}

/* ----- Phản xạ nhanh ----- */
function gmQuick() {
  const Q = UI.gq ||= { phase: "start", streak: 0, q: null, cd: 0, msg: "" }, st = gmSt("quick");
  const all = (SP_BANK.p1 || []).flatMap(t => t.qs.map(x => x[0]));
  const ask = async () => {
    Q.q = all[Math.floor(Math.random() * all.length)]; Q.phase = "think"; Q.cd = 5; render(); spSay(Q.q);
    for (let s = 5; s > 0; s--) { Q.cd = s; const el = document.querySelector(".gm-cd"); if (el) el.textContent = s; await new Promise(r => setTimeout(r, 1000)); if (UI.gq !== Q) return; }
    Q.phase = "rec"; render();
    try {
      const blob = await autoRec({ maxSec: 25, quietSec: 2, idleSec: 3 }), a = await spDecode(blob), z = spPauses(a);
      if (z.speech >= 4) { Q.streak++; Q.msg = `Tốt! Nói ${Math.round(z.speech)} giây.`; addAct("speaking", 1); ask(); }
      else { Q.phase = "over"; Q.msg = z.speech < 0.5 ? "Bạn chưa kịp nói trong 3 giây." : `Trả lời quá ngắn (${z.speech.toFixed(1)} giây). Cần ít nhất 2 câu, khoảng 4 giây.`; if (Q.streak > (st.best || 0)) st.best = Q.streak; gmXp(Math.min(40, Q.streak * 4), "speaking", Math.max(0.5, (Q.n || Q.streak + 1) * 0.5), "quick"); render(); }
    } catch (e) { Q.phase = "start"; toast("Chưa ghi âm được."); render(); }
  };
  return h("div", { class: "stack", style: "gap:12px" },
    gmHead("Phản xạ nhanh", "Câu hỏi Part 1 hiện ra, có 5 giây suy nghĩ rồi phải trả lời ít nhất 2 câu. Trả lời được thì câu tiếp đến ngay; chuỗi càng dài càng nhiều điểm.", st.best),
    h("section", { class: "card stack", style: "gap:12px;align-items:center;text-align:center" },
      Q.phase === "start" || Q.phase === "over" ? [Q.phase === "over" ? [h("span", { class: "gm-big" }, Q.streak), h("span", { class: "eyebrow" }, "câu liên tiếp"), h("p", { style: "margin:0" }, Q.msg)] : h("p", { style: "margin:0" }, "Chuẩn bị micro. Máy tự ghi âm khi hết 5 giây."),
        h("button", { class: "btn btn-primary", type: "button", onclick: () => { Q.streak = 0; Q.msg = ""; ask(); } }, Q.phase === "over" ? "Chơi lại" : "Bắt đầu")] : null,
      Q.phase === "think" ? [h("span", { class: "chip" }, `Chuỗi ${Q.streak}`), h("p", { class: "gm-incant" }, Q.q), h("span", { class: "small muted" }, "Suy nghĩ…"), h("b", { class: "gm-cd gm-big" }, Q.cd)] : null,
      Q.phase === "rec" ? [h("span", { class: "chip" }, `Chuỗi ${Q.streak}`), h("p", { class: "gm-incant" }, Q.q), h("b", { class: "gm-live" }, "● Đang nghe bạn nói"), h("span", { class: "small muted" }, Q.msg || "Ngừng 2 giây là máy chấm."), h("button", { class: "btn", type: "button", onclick: () => SHW.rec?.stop() }, "Xong")] : null));
}

/* ----- Nhại ngữ điệu: so đường cao độ (lên xuống giọng) và độ nhấn giữa bạn với giọng mẫu ----- */
function gmPitch(a) {
  const W = 640, H = 160, out = [];
  for (let i = 0; i + W + 230 < a.length; i += H) {
    let e = 0; for (let j = 0; j < W; j++) e += a[i + j] * a[i + j]; e = Math.sqrt(e / W);
    const d = new Float32Array(231); let run = 0, f0 = 0;
    for (let tau = 1; tau <= 230; tau++) { let s = 0; for (let j = 0; j < W; j++) { const x = a[i + j] - a[i + j + tau]; s += x * x; } run += s; d[tau] = run ? s * tau / run : 1; }
    for (let tau = 40; tau < 230; tau++) if (d[tau] < 0.15 && d[tau] <= d[tau + 1]) { f0 = 16000 / tau; break; }
    out.push({ e, f0 });
  }
  const em = Math.max(...out.map(x => x.e), 1e-6); for (const x of out) { x.e /= em; if (x.e < 0.08) x.f0 = 0; }
  const v = out.filter(x => x.f0).map(x => x.f0).sort((p, q) => p - q), med = v[Math.floor(v.length / 2)] || 150;
  for (const x of out) x.st = x.f0 ? 12 * Math.log2(x.f0 / med) : null;
  return out;
}
function gmCompare(m0, u0) {
  /* Đưa hai câu về cùng 100 điểm thời gian, rồi chỉ cho phép lệch nhịp ít (±8 điểm) để câu khác nhau không bị ép cho giống */
  const rs = (a, n = 100) => Array.from({ length: n }, (_, i) => a[Math.min(a.length - 1, Math.round(i * (a.length - 1) / (n - 1)))]);
  const m = rs(m0), u = rs(u0), n = 100, B = 8, INF = 1e9;
  const cost = (x, y) => Math.abs(x.e - y.e) * 2 + (x.st != null && y.st != null ? Math.min(6, Math.abs(x.st - y.st)) / 3 : (x.st == null) !== (y.st == null) ? 0.8 : 0);
  const D = Array.from({ length: n + 1 }, () => new Float64Array(n + 1).fill(INF)); D[0][0] = 0;
  for (let i = 1; i <= n; i++) for (let j = Math.max(1, i - B); j <= Math.min(n, i + B); j++) D[i][j] = cost(m[i - 1], u[j - 1]) + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
  const map = new Array(n).fill(0); let i = n, j = n; while (i > 0 && j > 0) { map[i - 1] = j - 1; const a = D[i - 1][j - 1], b = D[i - 1][j], c = D[i][j - 1]; if (a <= b && a <= c) { i--; j--; } else if (b <= c) i--; else j--; }
  let pe = 0, pn = 0, vm = 0; const em = [], eu = [];
  for (let q = 0; q < n; q++) { const x = m[q], y = u[map[q]]; em.push(x.e); eu.push(y.e); if (x.st != null && y.st != null) { pe += Math.abs(x.st - y.st); pn++; } if ((x.st == null) !== (y.st == null)) vm++; }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, ma = mean(em), mb = mean(eu); let c = 0, va = 0, vb = 0; for (let q = 0; q < n; q++) { c += (em[q] - ma) * (eu[q] - mb); va += (em[q] - ma) ** 2; vb += (eu[q] - mb) ** 2; }
  const corr = c / Math.sqrt(va * vb || 1), mae = pn ? pe / pn : 6;
  const sP = Math.round(Math.max(0, Math.min(100, 100 - (mae - 0.8) * 25 - vm * 0.6))), sE = Math.round(Math.max(0, Math.min(1, (corr - 0.2) / 0.7)) * 100);
  const raw = sP * 0.6 + sE * 0.4; return { score: Math.round(Math.max(0, Math.min(100, (raw - 50) / 40 * 100))), sP, sE, map: Array.from({ length: m0.length }, (_, k) => Math.min(u0.length - 1, Math.round(map[Math.min(n - 1, Math.round(k * (n - 1) / Math.max(1, m0.length - 1)))] * (u0.length - 1) / (n - 1)))) };
}
function gmToneSvg(m, u, map) {
  const Wd = 600, Hd = 150, n = m.length, X = i => 10 + (Wd - 20) * i / Math.max(1, n - 1), Y = s => Hd / 2 - Math.max(-8, Math.min(8, s)) * (Hd / 18);
  const line = (pts, col, w) => { let d = "", on = false; pts.forEach((s, i) => { if (s == null) { on = false; return; } d += (on ? "L" : "M") + X(i).toFixed(1) + " " + Y(s).toFixed(1); on = true; }); return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const bars = m.map((x, i) => `<rect x="${X(i) - 2}" y="${Hd - 4 - x.e * 26}" width="4" height="${x.e * 26}" fill="currentColor" opacity=".15"/>`).join("");
  return `<svg viewBox="0 0 ${Wd} ${Hd}" class="gm-tone-svg" role="img" aria-label="Đường lên xuống giọng">${bars}${line(m.map(x => x.st), "#1c7ed6", 4)}${line(map.map(j => u[j]?.st ?? null), "#e8590c", 3)}</svg>`;
}
function gmTone() {
  const N = UI.gto ||= { key: null, res: null }, st = gmSt("tone");
  const box = h("div", { class: "stack", style: "gap:12px" });
  spvIndex().then(async ix => {
    const keys = Object.keys(ix).filter(k => { const n = k.split(" ").length; return n >= 5 && n <= 13; });
    if (!N.key) N.key = keys[Math.floor(Math.random() * keys.length)];
    const text = N.key.charAt(0).toUpperCase() + N.key.slice(1);
    const model = async () => { const gc = typeof gemClip === "function" ? await gemClip("sp", N.key).catch(() => null) : null; if (gc) return spTrim(await spDecode(gc)); const e = ix[N.key], ab = await spvShard(e[0]); return spTrim(await spDecode(new Blob([new Uint8Array(ab, e[1], e[2])], { type: "audio/mpeg" }))); };
    const judge = async (blob, say) => { say?.("Đang so giọng…"); const m = gmPitch(await model()), u = gmPitch(spTrim(await spDecode(blob))); if (u.filter(x => x.st != null).length < 5) throw { vn: "Chưa nghe rõ giọng bạn. Nói to và gần micro hơn." }; const r = gmCompare(m, u); N.res = { ...r, m, u }; if (r.score > (st.best || 0)) st.best = r.score; gmXp(Math.round(r.score / 10), "speaking", 1, "tone"); render(); };
    box.replaceChildren(gmHead("Nhại ngữ điệu", "Nghe câu mẫu rồi nói lại y hệt cách lên xuống giọng và chỗ nhấn. Máy vẽ đường giọng của bạn (cam) lên giọng mẫu (xanh) và chấm như karaoke.", st.best),
      h("section", { class: "card stack", style: "gap:12px;align-items:center;text-align:center" }, h("p", { class: "gm-incant" }, text),
        h("div", { class: "row", style: "gap:8px;justify-content:center" }, h("button", { class: "btn", type: "button", onclick: () => spSay(N.key) }, "🔊 Nghe mẫu"), h("button", { class: "btn", type: "button", onclick: () => spSay(N.key, 0.8) }, "🐢 Nghe chậm")),
        recBox(judge, { max: 10, hint: "Nói lại câu rồi bấm Dừng." }),
        N.res ? h("div", { class: "stack", style: "gap:8px;width:100%" }, h("div", { class: "row", style: "gap:14px;justify-content:center;align-items:baseline;flex-wrap:wrap" }, h("span", { class: "gm-big" }, N.res.score), h("span", null, `Lên xuống giọng ${N.res.sP} · Độ nhấn ${N.res.sE}`)),
          h("div", { class: "gm-tone", html: gmToneSvg(N.res.m, N.res.u, N.res.map) }), h("div", { class: "row small", style: "gap:14px;justify-content:center" }, h("span", null, h("i", { class: "boss-dot", style: "background:#1c7ed6" }), "Giọng mẫu"), h("span", null, h("i", { class: "boss-dot", style: "background:#e8590c" }), "Giọng bạn"), h("span", { class: "muted" }, "Cột mờ: chỗ nói to (nhấn)")),
          h("p", { class: "small muted", style: "margin:0" }, N.res.score >= 80 ? "Rất giống giọng mẫu!" : N.res.sP < N.res.sE ? "Giọng bạn còn đều đều. Nghe lại xem chỗ nào lên cao, chỗ nào xuống ở cuối câu." : "Chỗ nhấn chưa khớp. Nhấn mạnh hơn vào từ quan trọng, đọc lướt các từ nhỏ.")) : null,
        h("button", { class: "btn btn-quiet", type: "button", onclick: () => { N.key = null; N.res = null; render(); } }, "Câu khác →")));
  });
  return box;
}

/* Dừng mọi âm thanh đang phát (khi bấm Dừng, đổi mục hoặc chuyển trang) */
function gmStopAll() { try { alStop(); } catch {} try { SPV.audio?.pause(); } catch {} try { speechSynthesis.cancel(); } catch {} try { stopTTS(); } catch {} }
window.addEventListener("hashchange", gmStopAll);
document.addEventListener("visibilitychange", () => { if (document.hidden) gmStopAll(); });
const LS_GAMES = [["g-news", "🎮 Nhà báo điền tin", null, () => [gmNews()]], ["g-chase", "🎮 Đuổi giọng", null, () => [gmChase()]]];
const SP_GAMES = [["g-spell", "🎮 Đọc thần chú", null, () => [gmSpell()]], ["g-talk", "🎮 Nói 1 phút không ngừng", null, () => [gmTalk()]], ["g-quick", "🎮 Phản xạ nhanh", null, () => [gmQuick()]], ["g-tone", "🎮 Nhại ngữ điệu", null, () => [gmTone()]]];
Object.assign(SUB_DESC, { "lsTab:g-news": "Nghe bản tin, điền 5 chỗ trống, sai mất mạng", "lsTab:g-chase": "Số và tên đọc ngày càng nhanh, gõ kịp thì sống", "spTab:g-spell": "Đọc câu luyện âm khó để phá phong ấn", "spTab:g-talk": "Nói liền 60 giây, ngừng 3 giây là thua", "spTab:g-quick": "5 giây suy nghĩ rồi trả lời ngay", "spTab:g-tone": "Nói lại theo giọng mẫu, chấm như karaoke" });
document.head.append(h("style", null, `.gm-hearts{font-size:1.1rem;letter-spacing:2px}.gm-big{font-size:2.6rem;font-weight:800;line-height:1}
.gm-news{font-size:1.1rem;line-height:2.1;margin:0}
.gm-news input.gm-in{width:7em!important;min-width:0!important;height:auto!important;min-height:0!important;display:inline-block;vertical-align:baseline;margin:0 3px;padding:0 4px 1px!important;border:0!important;border-bottom:2px solid var(--edge,#111)!important;border-radius:0!important;box-shadow:none!important;font:inherit;font-weight:700;text-align:center;background:color-mix(in srgb,var(--ink,#111) 5%,transparent)!important;line-height:1.3}
.gm-news input.gm-in.gm-s{width:4.5em!important}.gm-news input.gm-in.gm-l{width:10em!important}
.gm-news input.gm-in:focus{outline:none;border-bottom-color:#1c7ed6!important;background:color-mix(in srgb,#1c7ed6 10%,transparent)!important}
.gm-news input.gm-in.ok{border-bottom-color:var(--good,#0e8a6a)!important;color:var(--good,#0e8a6a);background:color-mix(in srgb,var(--good,#0e8a6a) 12%,transparent)!important}
.gm-news input.gm-in.bad{border-bottom-color:#e03131!important;color:#e03131;text-decoration:line-through;background:color-mix(in srgb,#e03131 10%,transparent)!important}
.gm-play,.gm-stop{min-width:9.5em;justify-content:center}@media (max-width:480px){.gm-play,.gm-stop{min-width:0}}.gm-stop{background:var(--surface);color:var(--ink,#111)}.gm-stop:disabled{opacity:.4}
.gm-play.gm-playing{opacity:.85;cursor:default}.gm-wave{display:inline-flex;gap:2px;align-items:flex-end;height:14px;margin-right:8px;vertical-align:-1px}
.gm-wave i{width:3px;height:100%;background:currentColor;animation:gmWave .9s ease-in-out infinite}.gm-wave i:nth-child(2){animation-delay:.15s}.gm-wave i:nth-child(3){animation-delay:.3s}.gm-wave i:nth-child(4){animation-delay:.45s}
@keyframes gmWave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}.gm-again{margin-left:auto}
.gm-time{height:10px;border:2px solid var(--edge,#111);border-radius:6px;overflow:hidden}.gm-time i{display:block;height:100%;background:#f08c00;transition:width .1s linear}
.gm-seals{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.gm-seal{border:2px solid var(--edge,#111);border-radius:14px;padding:14px;background:var(--surface);display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;cursor:pointer;font:inherit;color:inherit}
.gm-seal.lock{opacity:.45;cursor:not-allowed}.gm-seal.won{background:color-mix(in srgb,#ffd43b 25%,var(--surface))}.gm-rune{font-size:2rem;color:#7048e8}.gm-rune.big{font-size:3rem;animation:gmGlow 2s ease-in-out infinite}
.gm-incant{font-size:1.35rem;font-weight:700;margin:0;max-width:30ch}.gm-win{background:color-mix(in srgb,#ffd43b 22%,var(--surface))}.gm-live{color:#e03131;animation:gmGlow 1s infinite}
.gm-tone{width:100%;color:var(--ink)}.gm-tone-svg{width:100%;height:auto;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
@keyframes gmGlow{50%{opacity:.45}}`));

/* ===== Thành tựu cho các game Nghe/Nói, và đặt lại tên mọi thành tựu cho vui ===== */
(function () {
  const g = k => P.gm?.[k] || {}, won = () => Object.keys(g("spell").won || {}).length;
  ACH.push(
    ["gn10", "📰", "Phóng viên tập sự", "Chơi 10 bản tin Nhà báo điền tin", () => (g("news").n || 0) >= 10],
    ["gn3", "🗞️", "Trùm hóng biến", "Lên cấp 3 trong Nhà báo điền tin", () => (g("news").lv || 1) >= 3],
    ["gn500", "📢", "Tổng biên tập", "Đạt 500 điểm một ván Nhà báo điền tin", () => (g("news").best || 0) >= 500],
    ["gc15", "🐇", "Tai thỏ", "Đuổi kịp 15 câu một ván Đuổi giọng", () => (g("chase").best || 0) >= 15],
    ["gc30", "🏎️", "Tốc độ bàn thờ", "Đuổi kịp 30 câu một ván Đuổi giọng", () => (g("chase").best || 0) >= 30],
    ["gs1", "🧙", "Thầy pháp tập sự", "Phá phong ấn đầu tiên trong Đọc thần chú", () => won() >= 1],
    ["gs30", "📿", "Chú Đại Bi", "Đọc thần chú 30 lần", () => (g("spell").n || 0) >= 30],
    ["gsall", "🔮", "Phá đảo phong ấn", "Phá hết mọi phong ấn trong Đọc thần chú", () => g("spell").all > 0 && won() >= g("spell").all],
    ["gt1", "🗣️", "Bà tám", "Nói đủ 60 giây không ngừng lần đầu", () => (g("talk").w || 0) >= 1],
    ["gt10", "📣", "Loa phường", "Nói đủ 60 giây 10 lần", () => (g("talk").w || 0) >= 10],
    ["gq5", "⚡", "Mồm nhanh hơn não", "Chuỗi 5 câu Phản xạ nhanh", () => (g("quick").best || 0) >= 5],
    ["gq10", "🌪️", "Phản xạ thần sầu", "Chuỗi 10 câu Phản xạ nhanh", () => (g("quick").best || 0) >= 10],
    ["gto10", "🚿", "Ca sĩ phòng tắm", "Chơi Nhại ngữ điệu 10 lần", () => (g("tone").n || 0) >= 10],
    ["gto85", "🎤", "Idol karaoke", "Đạt 85 điểm Nhại ngữ điệu", () => (g("tone").best || 0) >= 85],
    ["gall", "🕹️", "Nghiện game có học", "Chơi đủ cả 6 game Nghe và Nói", () => ["news", "chase", "spell", "talk", "quick", "tone"].every(k => (g(k).n || 0) > 0)]);
  const NEW = { d1: ["Ngày đầu đi học", "Lần đầu làm đủ nhiệm vụ trong ngày"], s7: ["Lửa chưa tắt", "Chuỗi 7 ngày"], s30: ["Trâu cày 30 ngày", "Chuỗi 30 ngày"], s100: ["Không phải người", "Chuỗi 100 ngày"],
    early: ["Gà chưa gáy đã học", "Xong nhiệm vụ trước 7 giờ sáng"], owl: ["Cú đêm chạy deadline", "Xong nhiệm vụ sau 23 giờ"], week: ["Full tuần không trốn", "Làm đủ cả 7 ngày từ thứ Hai đến Chủ nhật"],
    vr10: ["Mọt từ mới nở", "Qua 10 bài Lộ trình từ vựng"], vr50: ["Từ điển biết đi", "Qua 50 bài Lộ trình từ vựng"], spk: ["Mồm không nghỉ", "14 ngày liền làm đủ phần Nói"], lst: ["Thính như dơi", "7 ngày liền làm đủ phần Nghe"],
    boss: ["Hội đồng đánh boss", "Cùng nhóm hạ một boss tuần"], pet1: ["Bỉm sữa thần thú", "Nuôi một thần thú đến lúc thuần hóa"], pet4: ["Sở thú di động", "Thuần hóa đủ 4 thần thú"],
    chest: ["Nghiện mở hộp", "Mở 10 rương"], legend: ["Nhân phẩm vô cực", "Mở trúng đồ Huyền thoại"], poke: ["Thánh chọc", "Chọc bạn 10 lần"], lv5: ["Hết gà", "Đạt Level 5"], lv10: ["Cao thủ ẩn danh", "Đạt Level 10"],
    top: ["Trùm tuần", "Đứng đầu xếp hạng một tuần đã kết thúc"], mock4: ["Thi thử không run", "Thi thử đủ Listening, Reading, Writing, Speaking trong một tháng"],
    "rg-eagle": ["Mắt cú vọ", "Scan đúng dưới 5 giây"], "rg-judge": ["Bao Công đọc hiểu", "5 phán quyết đúng cả bằng chứng liên tiếp"], "rg-detective": ["Thám tử lừa đâu được", "Qua một màn Kẻ giả danh không mất tim"],
    "rg-locksmith": ["Trộm chuyên nghiệp", "Qua một màn Mở khóa không mất tim"], "rg-conductor": ["Lái tàu không trật ray", "Qua một màn Nối ray không mất tim"], "rg-combo": ["Combo không phanh", "Đúng 5 câu liên tiếp"], "rg-boss": ["Đấm trùm", "Thắng một màn trùm"] };
  for (const a of ACH) if (NEW[a[0]]) { a[2] = NEW[a[0]][0]; a[3] = NEW[a[0]][1]; }
})();
/* ===== Chia thành tựu thành nhóm, mỗi nhóm có bậc rank theo số đã mở ===== */
const ACH_GROUPS = [
  ["⚔️", "Ý Chí Bất Khuất", "Kỷ luật, chuỗi ngày và giờ giấc", id => /^(d1|s7|s30|s100|early|owl|week)$/.test(id)],
  ["🧠", "Bậc Thầy Học Thuật", "Lộ trình từ vựng, level và thi thử", id => /^(vr10|vr50|lv5|lv10|mock4)$/.test(id)],
  ["🎧", "Đấu Trường Thính Giả", "Nghe và các game Nghe", id => /^(lst|gn|gc)/.test(id)],
  ["🎙️", "Võ Đài Khẩu Chiến", "Nói và các game Nói", id => /^(spk|gs|gt|gq)/.test(id)],
  ["📖", "Chiến Trường Văn Tự", "Các game Đọc", id => id.startsWith("rg-")],
  ["🛡️", "Tình Huynh Đệ", "Cùng nhóm đánh boss, chọc bạn, đua hạng", id => /^(boss|poke|top)$/.test(id)],
  ["🐉", "Thuần Thú Sư", "Nuôi thần thú", id => /^pet/.test(id)],
  ["💎", "Thợ Săn Kho Báu", "Rương, đồ hiếm và chơi đủ game", id => /^(chest|legend|gall)$/.test(id)]];
const ACH_RANK = [[0, "Chưa xếp hạng", "#868e96"], [1, "Sắt", "#6b5e55"], [.2, "Đồng", "#a0522d"], [.4, "Bạc", "#7d8a96"], [.6, "Vàng", "#c79100"], [.8, "Kim Cương", "#1c7ed6"], [1, "Thách Đấu", "#d9480f"]];
function achRank(n, tot) { if (!n) return ACH_RANK[0]; if (n >= tot) return ACH_RANK[6]; const r = n / tot; return r >= .8 ? ACH_RANK[5] : r >= .6 ? ACH_RANK[4] : r >= .4 ? ACH_RANK[3] : r >= .2 ? ACH_RANK[2] : ACH_RANK[1]; }
/* ===== Thêm thành tựu (đợt 2) ===== */
(function () {
  const sum = o => Object.values(o || {}).reduce((a, v) => a + (Array.isArray(v) ? v[0] : 0), 0);
  const hist = k => { try { return planHistory().filter(x => x.k === k); } catch { return []; } };
  const wb = () => (typeof WRIT !== "undefined" ? WRIT : []).filter(w => w.result?.overall != null);
  const rdN = () => (typeof READS !== "undefined" ? READS : []).reduce((a, r) => a + (r.attempts || []).length, 0);
  const done = L => (L || []).filter(l => P.lessons?.[l.id]?.done).length;
  ACH.push(
    ["s3", "🍚", "Cơm nhà đủ ba bữa", "Chuỗi 3 ngày", q => q.best >= 3],
    ["s14", "🧱", "Lì như bê tông", "Chuỗi 14 ngày", q => q.best >= 14],
    ["s60", "🗿", "Tượng đài kỷ luật", "Chuỗi 60 ngày", q => q.best >= 60],
    ["d10", "🔟", "Mười ngày như một", "Tổng cộng 10 ngày làm đủ nhiệm vụ", q => Object.values(q.days).filter(v => v === 1).length >= 10],
    ["d50", "🏅", "Nửa trăm ngày vàng", "Tổng cộng 50 ngày làm đủ nhiệm vụ", q => Object.values(q.days).filter(v => v === 1).length >= 50],
    ["sun", "⛪", "Chủ nhật không nghỉ lễ", "Làm đủ nhiệm vụ vào một ngày Chủ nhật", q => Object.keys(q.days).some(d => q.days[d] === 1 && new Date(d + "T00:00:00").getDay() === 0)],
    ["m60", "☕", "Cày xuyên trưa", "Học từ 60 phút trong một ngày", q => Object.values(q.hm).some(v => v >= 60)],
    ["m120", "🥵", "Ôn thi như thi đại học", "Học từ 120 phút trong một ngày", q => Object.values(q.hm).some(v => v >= 120)],
    ["frz", "🧊", "Phao cứu sinh", "Được vé đóng băng cứu chuỗi một lần", q => Object.values(q.frz || {}).some(Boolean)],
    ["vb100", "🎒", "Kho chữ di động", "Có 100 từ trong sổ từ vựng", () => VOCAB.length >= 100],
    ["vb500", "🏦", "Ngân hàng từ vựng", "Có 500 từ trong sổ từ vựng", () => VOCAB.length >= 500],
    ["gr10", "🧩", "Ngữ pháp hết là ác mộng", "Qua 10 bài ngữ pháp", () => done(LESSONS) >= 10],
    ["grall", "🎓", "Giáo sư ngữ pháp", "Qua hết các bài ngữ pháp", () => LESSONS.length > 0 && done(LESSONS) >= LESSONS.length],
    ["rcall", "🐛", "Mọt sách chính hiệu", "Qua hết khóa Đọc", () => RL.length > 0 && done(RL) >= RL.length],
    ["wcall", "🖋️", "Bút sa gà chết", "Qua hết khóa Viết", () => WL.length > 0 && done(WL) >= WL.length],
    ["wn10", "✍️", "Tay viết không mỏi", "Nộp 10 bài viết để chấm", () => wb().length >= 10],
    ["w6", "📝", "Ngòi bút có tâm", "Một bài viết đạt band 6.0", () => wb().some(w => w.result.overall >= 6)],
    ["w7", "🏆", "Văn hay chữ tốt", "Một bài viết đạt band 7.0", () => wb().some(w => w.result.overall >= 7)],
    ["lv20", "🌌", "Huyền thoại sống", "Đạt Level 20", () => levelOf(P.xp || 0).L >= 20],
    ["plc", "🔍", "Biết người biết ta", "Làm bài kiểm tra đầu vào đủ 4 kỹ năng", () => ["L", "R", "W", "S"].every(k => P.placement?.[k] != null)],
    ["dict100", "📼", "Máy ghi âm biết đi", "Nghe chép 100 câu", () => (P.ls?.dict?.n || 0) >= 100],
    ["nd50", "☎️", "Tổng đài viên", "Làm 50 lượt Số và đánh vần", () => sum(P.ndStat) >= 50],
    ["lsf", "🪑", "Ngồi im 30 phút", "Làm một đề Listening đầy đủ 40 câu", () => hist("L").length > 0],
    ["lsb7", "🦇", "Tai dơi chúa", "Band Listening từ 7.0", () => hist("L").some(x => (x.band || 0) >= 7)],
    ["sh100", "👥", "Cái bóng người bản xứ", "Shadowing 100 câu", () => (P.shStat?.n || 0) >= 100],
    ["pr200", "👅", "Lưỡi không xương", "Luyện 200 âm trong bài phát âm", () => sum(P.pron) >= 200],
    ["room", "🎤", "Gan lì trước giám khảo", "Thi đủ 3 phần trong phòng thi Speaking", () => hist("S").some(x => /Thi thử đầy đủ|Phòng thi/.test(x.title || ""))],
    ["rd10", "📠", "Máy quét chữ", "Làm 10 lượt bài đọc", () => rdN() >= 10],
    ["rex", "⏳", "Sinh tồn 60 phút", "Làm Reading chế độ thi 60 phút", () => hist("R").some(x => /thi thử/.test(x.sub || ""))],
    ["rb7", "📜", "Đọc như đọc truyện tranh", "Band Reading từ 7.0", () => hist("R").some(x => (x.band || 0) >= 7)],
    ["pk50", "🫵", "Chọc tới khi nào học thì thôi", "Chọc bạn 50 lần", q => q.pokeN >= 50],
    ["boss3", "🗡️", "Sát thủ săn boss", "Cùng nhóm hạ 3 boss tuần", q => Object.keys(q.bossW).length >= 3],
    ["chest50", "💰", "Đại gia rương", "Mở 50 rương", q => q.opened >= 50],
    ["pet2", "🐣", "Trại thú mini", "Thuần hóa 2 thần thú", () => petState(grpMine()).gc >= PET_DAYS * 2],
    ["pet3", "🦚", "Vườn thú gia đình", "Thuần hóa 3 thần thú", () => petState(grpMine()).gc >= PET_DAYS * 3],
    ["rew5", "👗", "Tủ đồ hàng hiệu", "Sưu tầm 5 món đồ từ rương", q => Object.values(q.rew || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0) >= 5]);
  const G = ACH_GROUPS;
  G[0][3] = id => /^(d1|d10|d50|s\d+|early|owl|week|sun|m60|m120|frz)$/.test(id);
  G[1][3] = id => /^(vr10|vr50|lv\d+|mock4|vb\d+|gr10|grall|rcall|wcall|wn10|w6|w7|plc)$/.test(id);
  G[2][3] = id => /^(lst|gn|gc|dict|nd50|lsf|lsb)/.test(id);
  G[3][3] = id => /^(spk|gs|gt|gq|sh100|pr200|room)/.test(id);
  G[4][3] = id => /^(rg-|rd10|rex|rb7)/.test(id);
  G[5][3] = id => /^(boss|poke|top|pk50)/.test(id);
  G[7][3] = id => /^(chest|legend|gall|rew5)/.test(id);
})();
achCard = function (list) {
  const q = fq(), me = window.__grp?.uid, used = new Set();
  const groups = ACH_GROUPS.map(([ico, name, sub, f]) => { const a = ACH.filter(x => !used.has(x[0]) && f(x[0])); a.forEach(x => used.add(x[0])); return [ico, name, sub, a]; });
  const rest = ACH.filter(x => !used.has(x[0])); if (rest.length) groups.push(["✨", "Bí Ẩn", "Thành tựu khác", rest]);
  const tile = ([id, ico, name, how]) => h("div", { class: "ach" + (q.ach[id] ? " on" : ""), title: how }, h("span", { class: "ach-ico" }, ico), h("b", null, name), h("span", { class: "small muted" }, how), q.ach[id] ? h("span", { class: "small" }, "Mở ngày " + fmtDate(new Date(q.ach[id] + "T00:00:00"))) : null);
  const tot = Object.keys(q.ach).filter(id => ACH.some(x => x[0] === id)).length, R = achRank(tot, ACH.length);
  return h("section", { class: "card stack", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px" }, h("h2", { style: "margin:0" }, "Thành tựu"),
      h("div", { class: "row", style: "gap:8px;align-items:center" }, h("span", { class: "ach-rk", style: `--rk:${R[2]}` }, R[1]), h("b", null, `${tot}/${ACH.length}`))),
    h("div", { class: "stack", style: "gap:8px" }, groups.map(([ico, name, sub, a]) => { const n = a.filter(x => q.ach[x[0]]).length, r = achRank(n, a.length);
      return h("details", { class: "ach-g", open: true }, h("summary", null, h("span", { class: "ach-gi" }, ico), h("span", { class: "stack", style: "gap:0;flex:1;min-width:0" }, h("b", null, name), h("span", { class: "small muted" }, sub)),
        h("span", { class: "ach-rk", style: `--rk:${r[2]}` }, r[1]), h("b", { class: "ach-gn" }, `${n}/${a.length}`), h("i", { class: "ach-bar" }, h("i", { style: `width:${Math.round(n / a.length * 100)}%;background:${r[2]}` }))),
        h("div", { class: "ach-grid" }, a.map(tile))); })),
    h("div", { class: "stack", style: "gap:6px" }, list.filter(m => m.id !== me).map(m => { const mine = (m.ach || []).filter(a => ACH.some(z => z[0] === a)), mr = achRank(mine.length, ACH.length);
      return h("div", { class: "row small", style: "gap:8px;flex-wrap:wrap;align-items:center" }, gAva(m, 22), h("b", null, m.name + ":"), h("span", { class: "ach-rk", style: `--rk:${mr[2]}` }, mr[1]), mine.length ? mine.map(a => { const x = ACH.find(z => z[0] === a); return h("span", { title: x[2] }, x[1]); }) : h("span", { class: "muted" }, "chưa có")); })));
};
document.head.append(h("style", null, `.ach-g{border:2px solid var(--edge,#111);background:var(--surface)}.ach-g>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;flex-wrap:wrap;position:relative}
.ach-g>summary::-webkit-details-marker{display:none}.ach-g>summary::before{display:none!important}.ach-g[open]>summary{border-bottom:1px solid var(--line)}.ach-g>.ach-grid{padding:10px}
.ach-gi{font-size:1.7rem;line-height:1}.ach-gn{min-width:3.2em;text-align:right}.ach-bar{flex-basis:100%;height:5px;background:var(--line);display:block}.ach-bar>i{display:block;height:100%}
.ach-rk{font-family:var(--font-mono);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 8px;border:2px solid var(--rk);color:var(--rk);white-space:nowrap}`));
