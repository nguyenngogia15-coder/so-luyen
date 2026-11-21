/* ===== Giao diện Phát âm + Speaking cho bản web ngoài (chấm phát âm chạy trên máy; chỉ "Thi thử" mới gọi AI) ===== */
SP.over = PR_LEX;
const SPEAKS = []; let speaksLoaded = false;
async function loadSpeaks() { if (speaksLoaded) return; speaksLoaded = true; try { const l = await store.list("speaks"); SPEAKS.splice(0, SPEAKS.length, ...l.sort((a, b) => (b.created || 0) - (a.created || 0))); render(); } catch (e) { console.warn(e); } }
const ipaT = t => String(t).split(/(\/[^/\s][^/]*\/)/).map((x, i) => i % 2 ? h("span", { class: "sp-ipa-t" }, x) : x);
const spMd = s => esc(String(s || "")).replace(/\*([^*]+)\*/g, "<b>$1</b>");

/* ----- Giọng đọc mẫu: gói Kokoro thu sẵn (voice/sp), thiếu thì giọng máy ----- */
const SPV = { idx: null, shards: {}, audio: null };
const spvKey = t => String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
function spvIndex() { return SPV.idx ||= fetch("voice/sp/index.json").then(r => { if (!r.ok) throw new Error(); return r.json(); }).catch(() => ({})); }
function spvShard(i) { return SPV.shards[i] ||= fetch("voice/sp/" + String(i).padStart(2, "0") + ".mp3").then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer(); }).catch(e => { delete SPV.shards[i]; throw e; }); }
async function spSay(text, rate) {
  try { VP.audio?.pause(); SPV.audio?.pause(); speechSynthesis.cancel(); } catch {}
  try {
    const e = (await spvIndex())[spvKey(text)];
    if (e) { const ab = await spvShard(e[0]); const url = URL.createObjectURL(new Blob([new Uint8Array(ab, e[1], e[2])], { type: "audio/mpeg" })); const a = SPV.audio = new Audio(url); a.playbackRate = rate || 1; a.onended = () => URL.revokeObjectURL(url); await a.play(); return; }
  } catch {}
  try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = (rate || 1) * 0.95; const v = speechSynthesis.getVoices().find(x => /en-US/i.test(x.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch {}
}
const sayBtn = (text, label, cls) => h("button", { type: "button", class: cls || "btn btn-quiet sp-say", title: "Nghe mẫu", "aria-label": "Nghe: " + text, onclick: e => { e.stopPropagation(); spSay(text); } }, label || "🔊");

/* ----- Ghi âm bằng micro ----- */
function recBox(onBlob, opts = {}) {
  const info = h("span", { class: "small muted" }), lvl = h("i"), meter = h("div", { class: "sp-lvl", hidden: true }, lvl);
  let rec = null, stream = null, tick = null, ac = null, raf = 0;
  const stop = () => { try { rec?.state === "recording" && rec.stop(); } catch {} };
  const btn = h("button", { class: "btn btn-primary sp-rec", type: "button", onclick: async () => {
    if (rec) return stop();
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("nomic");
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      rec = new MediaRecorder(stream); const parts = []; rec.ondataavailable = e => e.data.size && parts.push(e.data);
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); const an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize);
        const loop = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); lvl.style.width = Math.min(100, m / 64 * 100) + "%"; raf = requestAnimationFrame(loop); }; loop(); meter.hidden = false; } catch {}
      rec.onstop = () => { clearInterval(tick); cancelAnimationFrame(raf); meter.hidden = true; try { ac?.close(); } catch {} stream.getTracks().forEach(t => t.stop()); const b = new Blob(parts, { type: rec.mimeType || "audio/webm" }); rec = null; btn.classList.remove("on"); btn.textContent = opts.label || "● Ghi âm"; info.textContent = "Đang xử lý…";
        Promise.resolve(onBlob(b, t => info.textContent = t)).then(() => { info.textContent = ""; }, e => { console.warn(e); info.textContent = e?.vn || "Lỗi: " + (e?.message || e); }); };
      const t0 = Date.now(); rec.start(); btn.classList.add("on"); btn.textContent = "■ Dừng (0:00)"; info.textContent = opts.hint || "";
      tick = setInterval(() => { if (!document.body.contains(btn)) { stop(); return clearInterval(tick); } const s = Math.floor((Date.now() - t0) / 1000); btn.textContent = `■ Dừng (${mmss(s)})`; if (opts.max && s >= opts.max) stop(); }, 300);
    } catch (e) { info.textContent = e?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang → cho phép Micro, rồi thử lại." : "Máy hoặc trình duyệt này chưa ghi âm được. Thử Chrome hoặc Edge bản mới."; }
  } }, opts.label || "● Ghi âm");
  return h("div", { class: "row sp-recbox" }, btn, meter, info);
}
/* ----- Thẻ tải bộ nhận diện ----- */
function spModelCard(need) {
  if (spReady(need)) return null;
  const mb = need.map(spK).reduce((s, k) => s + ({ asr: 250, ph: 120, phx: 320 }[k] || 0), 0) + (SP.T ? 0 : 20);
  const bar = h("div", { class: "meter" }, h("i", { style: "width:0%" })), txt = h("span", { class: "small" }), t0 = Date.now();
  const upd = () => { let g = 0, t = 0; for (const k of ["lib", ...need.map(spK)]) { const p = SP.prog[k]; if (p) { g += p.got; t += p.total || 0; } } bar.firstChild.style.width = (t ? Math.min(100, g / t * 100) : 0) + "%";
    const sec = Math.round((Date.now() - t0) / 1000); txt.textContent = t && g >= t ? `${SP.stage || "Đang khởi động"}… (${sec} giây, lần đầu có thể mất 1 phút)` : t ? `Đang tải ${Math.round(g / 1048576)}/${Math.round(t / 1048576)} MB…` : "Đang chuẩn bị…"; };
  const wrap = h("div", { class: "note warn stack", style: "gap:6px" });
  const btn = h("button", { class: "btn btn-primary", type: "button", onclick: async () => { btn.disabled = true; SP.onProg = upd; upd(); const iv = setInterval(upd, 800);
    try { for (const k of need) await spLoad(k); clearInterval(iv); render(); } catch (e) { clearInterval(iv); console.warn(e); txt.textContent = "Lỗi: " + (e?.message || e) + ". Tải lại trang rồi thử lại."; btn.disabled = false; } } }, `Bật bộ chấm (tải ${mb} MB lần đầu)`);
  wrap.append(h("span", { class: "small" }, h("b", null, "Bộ chấm phát âm chạy ngay trên máy bạn, "), "không gửi giọng nói đi đâu và không tốn lượt AI. Lần đầu cần tải mô hình (nên dùng Wi-Fi), sau đó máy nhớ để dùng tiếp."), h("div", { class: "row" }, btn, txt), bar);
  if (need.some(k => SP.loading[spK(k)])) { btn.disabled = true; SP.onProg = upd; const iv = setInterval(() => { upd(); if (!document.body.contains(wrap)) clearInterval(iv); }, 800); Promise.all(need.map(k => SP.loading[spK(k)] || spLoad(k))).then(() => document.body.contains(wrap) && render(), () => {}); }
  else spCached(need).then(ok => { if (ok && document.body.contains(btn) && !btn.disabled) { txt.textContent = "Đã có sẵn trên máy, đang bật…"; btn.click(); } });
  return wrap;
}
/* ----- Hiển thị kết quả chấm ----- */
const scCls = s => s == null ? "" : s >= 80 ? "good" : s >= 60 ? "warn" : "bad";
const scoreChip = (s, pre) => h("span", { class: "chip " + scCls(s) }, (pre || "") + (s == null ? "—" : s + "/100"));
function phoneLine(w) {
  return h("span", { class: "sp-ipa" }, "/", w.phones.map(x => h("span", { class: "sp-ph " + scCls(x.s), title: `/${x.ipa}/ ${x.s}/100` + (x.heard ? ` · nghe giống /${phIpa(x.heard)}/` : "") }, x.show || x.ipa)), "/");
}
function wordDetail(w) {
  const bad = w.phones.filter(x => x.s < 50);
  return h("div", { class: "sp-detail stack", style: "gap:6px" },
    h("div", { class: "row", style: "gap:10px;align-items:center" }, h("b", { class: "sp-w" }, w.w), phoneLine(w), scoreChip(w.score), sayBtn(w.w)),
    bad.length ? h("ul", { class: "gex" }, [...new Set(bad.map(phTip))].map(t => h("li", null, t))) : h("p", { class: "small", style: "margin:0;color:var(--good,#1a7f37)" }, "Từ này đọc tốt."));
}
function resultView(r, opts = {}) {
  const det = h("div");
  const show = w => det.replaceChildren(wordDetail(w));
  const words = h("p", { class: "sp-words" }, r.words.map(w => { if (w.score == null) return [h("span", { class: "sp-wd muted" }, w.w), " "]; const n = h("button", { type: "button", class: "sp-wd " + scCls(w.score), onclick: () => show(w) }, w.w); return [n, " "]; }));
  const worst = r.words.filter(w => w.score != null).sort((a, b) => a.score - b.score)[0]; if (worst) show(worst);
  return h("div", { class: "stack sp-res", style: "gap:8px" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, opts.label || "Kết quả"), scoreChip(r.score)), words,
    h("p", { class: "small muted", style: "margin:0" }, "Xanh: tốt · Vàng: tạm · Đỏ: cần sửa. Bấm vào từ để xem từng âm."), det);
}
function pronStat(words) {
  P.pron ||= {}; for (const w of words) for (const x of w.phones || []) { const b = phBase(x.p), s = P.pron[b] ||= [0, 0]; s[0]++; if (x.s < 50) s[1]++; }
  saveProfile();
}

/* =================== LỘ TRÌNH PHÁT ÂM =================== */
const prSt = id => (P.pr ||= {})[id] ||= { quiz: 0, w: {}, s: {} };
function prWordPass(l, st) { const ws = l.words, got = ws.map(w => st.w[w] ?? null); return { n: got.filter(x => x != null).length, avg: got.every(x => x != null) ? Math.round(got.reduce((a, b) => a + b, 0) / ws.length) : null }; }
function prSentPass(l, st) { const got = l.sents.map((_, i) => st.s[i] ?? null); return { n: got.filter(x => x != null).length, avg: got.every(x => x != null) ? Math.round(got.reduce((a, b) => a + b, 0) / got.length) : null }; }
function prDone(l) { const st = (P.pr || {})[l.id]; return !!st?.done; }
function prCheckDone(l) {
  const st = prSt(l.id); if (st.done) return;
  const w = prWordPass(l, st), s = prSentPass(l, st), quizOk = !l.pairs.length || st.quiz >= PR_PASS.quiz;
  if (quizOk && w.avg != null && w.avg >= PR_PASS.word && s.avg != null && s.avg >= PR_PASS.sent) { st.done = today(); award("speaking", 40); addAct("speaking", 10); toast("Hoàn thành bài! Bài tiếp theo đã mở khóa."); }
  saveProfile();
}
/* Chặng "Nói liền" là nhánh riêng: mở ngay bài đầu, không cần xong các chặng trước (hữu ích cho cả Listening) */
const prUnlocked = l => { const i = PR_LESSONS.findIndex(x => x.id === l.id); return i === 0 || prDone(PR_LESSONS[i - 1]) || prDone(l) || (l.stage === "lk" && PR_LESSONS[i - 1]?.stage !== "lk"); };
function pagePron() {
  const done = PR_LESSONS.filter(prDone).length, next = PR_LESSONS.find(l => !prDone(l));
  const weak = Object.entries(P.pron || {}).filter(([, v]) => v[0] >= 6 && v[1] / v[0] > 0.35).sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0]).slice(0, 6);
  return h("div", { class: "stack", style: "gap:18px" },
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Phát âm"), h("h1", null, "Lộ trình phát âm IPA"),
      h("p", { class: "muted", style: "max-width:66ch" }, `${PR_LESSONS.length} bài, đi từ nguyên âm, phụ âm, âm cuối tới đọc câu tự nhiên (giọng Mỹ). Mỗi bài: hiểu cách đặt miệng → nghe và chọn → đọc từng từ → đọc cả câu. Máy chấm từng âm ngay trên máy bạn. Đạt ${PR_PASS.word} điểm phần từ và ${PR_PASS.sent} điểm phần câu là mở khóa bài sau.`),
      h("div", { class: "row" }, h("div", { class: "meter", style: "flex:1;max-width:320px" }, h("i", { style: `width:${done / PR_LESSONS.length * 100}%` })), h("span", { class: "small muted" }, `${done}/${PR_LESSONS.length} bài`), next ? h("a", { class: "btn btn-primary", href: "#pr-" + next.id }, done ? "Học tiếp" : "Bắt đầu") : null, h("a", { class: "btn", href: "#ipa-chart" }, "Bảng 44 âm"))),
    weak.length ? h("section", { class: "card stack", style: "gap:6px" }, h("h2", null, "Âm bạn hay sai"), h("div", { class: "row", style: "gap:6px" }, weak.map(([b, v]) => h("span", { class: "chip bad" }, `/${phIpa(b)}/ sai ${Math.round(v[1] / v[0] * 100)}%`)))) : null,
    PR_STAGES.map((s, si) => { const ls = s.lessons, dn = ls.filter(prDone).length;
      return h("section", { class: "stack", style: "gap:10px" },
        h("div", { class: "row", style: "justify-content:space-between;align-items:baseline" }, h("div", { class: "stack", style: "gap:2px" }, h("h2", null, `Chặng ${si + 1}: ${s.name}`), h("span", { class: "small muted" }, s.sub)), h("span", { class: "small muted" }, `${dn}/${ls.length}`)),
        h("div", { class: "grid3" }, ls.map(l => { const st = (P.pr || {})[l.id], open = prUnlocked(l), i = PR_LESSONS.findIndex(x => x.id === l.id);
          const inner = [h("span", { class: "num" }, open ? i + 1 : "🔒"), h("div", { class: "stack", style: "gap:4px" }, h("h3", null, ipaT(l.t)), h("span", { class: "small muted" }, l.img),
            h("div", { class: "row" }, st?.done ? h("span", { class: "chip good" }, "Đã đạt") : open ? h("span", { class: "chip" }, st && (Object.keys(st.w).length || st.quiz) ? "Đang học" : "Chưa học") : h("span", { class: "chip" }, "Khóa")))];
          return open ? h("a", { class: "card lesson-card", href: "#pr-" + l.id }, inner) : h("div", { class: "card lesson-card sp-locked", title: "Hoàn thành bài trước để mở" }, inner); }))); }));
}
function pagePrLesson(l) {
  if (!prUnlocked(l)) return h("div", { class: "stack", style: "gap:12px" }, h("a", { class: "btn btn-quiet", href: "#ipa" }, "‹ Lộ trình"), h("p", { class: "note warn" }, "Bài này chưa mở. Hoàn thành bài trước (đạt cả phần từ và phần câu) để mở khóa."));
  const st = prSt(l.id), i = PR_LESSONS.indexOf(l), nx = PR_LESSONS[i + 1];
  const W = UI.prW && UI.prW.id === l.id ? UI.prW : (UI.prW = { id: l.id, word: l.words[0], sent: 0, res: null, sres: null, q: null });
  const ipaOf = w => { if (l.ipa?.[w]) return l.ipa[w]; if (/\s/.test(w)) return SP.lexData ? "/" + w.split(/\s+/).map(x => { const ph = spWordPh(SP.lexData, x); return ph ? arpaIpa(ph) : x; }).join(" ") + "/" : ""; const ph = SP.lexData && spWordPh(SP.lexData, w); return ph ? "/" + arpaIpa(ph) + "/" : ""; };
  if (!SP.lexData) spLex().then(() => document.querySelector(".sp-lesson") && render(), () => {});
  /* 1. Hiểu */
  const s1 = h("section", { class: "card stack", style: "gap:10px" }, secH(1, "Hiểu cách phát âm"),
    h("p", { style: "margin:0" }, l.how), h("p", { class: "gnote", style: "margin:0" }, h("b", null, "Hình ảnh để nhớ: "), l.img), h("p", { class: "gnote gwarn", style: "margin:0" }, h("b", null, "Người Việt hay sai: "), l.trap),
    l.pairs.length ? h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Cặp từ dễ nhầm, bấm để nghe"), h("div", { class: "row", style: "gap:8px" }, l.pairs.map(([a, b]) => h("span", { class: "sp-pair" }, sayBtn(a, a, "opt"), h("span", { class: "muted" }, "–"), sayBtn(b, b, "opt"))))) : null);
  /* 2. Nghe và chọn */
  let s2 = null;
  if (l.pairs.length) {
    const Q = W.q ||= { n: 0, ok: 0, cur: null, picked: null };
    const next = () => { const pair = l.pairs[Math.floor(Math.random() * l.pairs.length)]; Q.cur = { pair, w: pair[Math.random() < 0.5 ? 0 : 1] }; Q.picked = null; render(); setTimeout(() => spSay(Q.cur.w), 60); };
    const body = !Q.cur ? h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: next }, Q.n ? "Làm lại" : "Bắt đầu nghe"), h("span", { class: "small muted" }, `${l.phr ? "Máy đọc một câu, bạn chọn câu nghe được" : "Máy đọc một từ, bạn chọn từ nghe được"}. Đúng ${PR_PASS.quiz}/8 là đạt.`))
      : h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => spSay(Q.cur.w) }, "🔊 Nghe lại"), h("span", { class: "small muted" }, `Câu ${Math.min(8, Q.n + (Q.picked ? 0 : 1))}/8 · đúng ${Q.ok}`)),
        h("div", { class: "opts" }, Q.cur.pair.map(x => h("button", { type: "button", class: "opt" + (Q.picked ? (x === Q.cur.w ? " right" : x === Q.picked ? " wrong" : "") : ""), disabled: Q.picked || null, onclick: () => { Q.picked = x; Q.n++; if (x === Q.cur.w) Q.ok++; if (Q.n >= 8) { st.quiz = Math.max(st.quiz || 0, Q.ok); prCheckDone(l); } render(); } }, x))),
        Q.picked ? h("div", { class: "row" }, h("span", { class: "small" }, Q.picked === Q.cur.w ? "Đúng." : `Từ vừa đọc là “${Q.cur.w}”.`), Q.n < 8 ? h("button", { class: "btn btn-primary", type: "button", onclick: next }, "Câu tiếp ›") : h("button", { class: "btn", type: "button", onclick: () => { W.q = { n: 0, ok: 0, cur: null, picked: null }; render(); } }, `Xong: ${Q.ok}/8 · làm lại`)) : null);
    s2 = h("section", { class: "card stack", style: "gap:10px" }, secH(2, "Nghe và chọn", st.quiz >= PR_PASS.quiz ? `Đã đạt (${st.quiz}/8)` : `Cần đúng ${PR_PASS.quiz}/8`), body);
  }
  /* 3. Đọc từ */
  const wp = prWordPass(l, st), cur = W.word;
  const judgeW = async (blob, say) => { await spLoad("phx"); const r = await spCheckText(blob, cur, say);
    if (l.phr) { if (r.score == null) throw { vn: "Máy chưa nghe rõ cụm này." }; st.w[cur] = Math.max(st.w[cur] ?? 0, r.score); pronStat(r.words); W.res = { word: cur, r, tOk: true, sc: r.score, phrase: true }; award("speaking", 2); prCheckDone(l); render(); return; }
    const w = r.words[0]; if (!w || w.score == null) throw { vn: "Máy chưa nghe rõ từ này." };
    const tgt = w.phones.filter(x => l.ph.includes(phBase(x.p))), tOk = tgt.every(x => x.s >= PR_PASS.target), sc = tOk ? w.score : Math.min(w.score, PR_PASS.word - 1);
    st.w[cur] = Math.max(st.w[cur] ?? 0, sc); pronStat([w]); W.res = { word: cur, r, tOk, sc }; award("speaking", 2); prCheckDone(l); render(); };
  const s3 = h("section", { class: "card stack", style: "gap:10px" }, secH(l.pairs.length ? 3 : 2, l.phr ? "Đọc từng cụm" : "Đọc từng từ", wp.avg != null ? `Trung bình ${wp.avg}/100 · cần ${PR_PASS.word}` : `Đã đọc ${wp.n}/${l.words.length} ${l.phr ? "cụm" : "từ"} · cần trung bình ${PR_PASS.word}`),
    h("div", { class: "sp-wgrid" }, l.words.map(w => { const b = st.w[w]; return h("button", { type: "button", class: "sp-wbtn" + (w === cur ? " on" : ""), onclick: () => { W.word = w; W.res = null; render(); } }, h("b", null, w), h("span", { class: "small muted" }, ipaOf(w)), b != null ? scoreChip(b) : h("span", { class: "chip" }, "chưa đọc")); })),
    h("div", { class: "task-box stack", style: "gap:8px" },
      h("div", { class: "row", style: "gap:12px;align-items:center" }, h("span", { class: "sp-big" }, cur), h("span", { class: "sp-ipa-big" }, ipaOf(cur)), sayBtn(cur, "🔊 Nghe mẫu", "btn"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => spSay(cur, 0.7) }, "🐢 Chậm")),
      spModelCard(["phx"]), spReady(["phx"]) ? recBox(judgeW, { max: l.phr ? 8 : 5, hint: l.phr ? "Đọc cả cụm liền một hơi rồi bấm Dừng." : "Đọc to, rõ một lần rồi bấm Dừng." }) : null,
      W.res && W.res.word === cur ? h("div", { class: "stack", style: "gap:6px" }, W.res.phrase ? resultView(W.res.r, { label: "Cả cụm" }) : wordDetail(W.res.r.words[0]), !W.res.tOk && l.ph.length ? h("p", { class: "note warn small", style: "margin:0" }, `Âm trọng tâm của bài chưa đạt (dưới ${PR_PASS.target}), nên lần này tính tối đa ${PR_PASS.word - 1} điểm.`) : null,
        h("div", { class: "row" }, (() => { const k = l.words.indexOf(cur), n = l.words.find((w, j) => j > k && st.w[w] == null) || l.words[(k + 1) % l.words.length]; return h("button", { class: "btn", type: "button", onclick: () => { W.word = n; W.res = null; render(); } }, "Từ tiếp ›"); })())) : null));
  /* 4. Đọc câu */
  const sp2 = prSentPass(l, st), si = W.sent, sent = l.sents[si];
  const judgeS = async (blob, say) => { await spLoad("phx"); const r = await spCheckText(blob, sent, say); st.s[si] = Math.max(st.s[si] ?? 0, r.score ?? 0); pronStat(r.words); W.sres = { i: si, r }; award("speaking", 4); prCheckDone(l); render(); };
  const s4 = h("section", { class: "card stack", style: "gap:10px" }, secH(l.pairs.length ? 4 : 3, "Đọc cả câu", sp2.avg != null ? `Trung bình ${sp2.avg}/100 · cần ${PR_PASS.sent}` : `Đã đọc ${sp2.n}/${l.sents.length} câu · cần trung bình ${PR_PASS.sent}`),
    h("div", { class: "row", style: "gap:6px" }, l.sents.map((s, k) => h("button", { type: "button", class: "opt", "aria-pressed": String(k === si), onclick: () => { W.sent = k; W.sres = null; render(); } }, `Câu ${k + 1}`, st.s[k] != null ? " · " + st.s[k] : ""))),
    h("div", { class: "task-box stack", style: "gap:8px" }, h("p", { class: "prompt", style: "font-size:1.2rem;margin:0" }, sent),
      h("div", { class: "row" }, sayBtn(sent, "🔊 Nghe mẫu", "btn"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => spSay(sent, 0.75) }, "🐢 Chậm")),
      spModelCard(["phx"]), spReady(["phx"]) ? recBox(judgeS, { max: 15, hint: "Đọc cả câu một hơi tự nhiên rồi bấm Dừng." }) : null,
      W.sres && W.sres.i === si ? resultView(W.sres.r, { label: "Cả câu" }) : null));
  return h("div", { class: "stack sp-lesson", style: "gap:16px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("a", { class: "btn btn-quiet", href: "#ipa" }, "‹ Lộ trình"), h("span", { class: "small muted" }, `Bài ${i + 1}/${PR_LESSONS.length}`)),
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, PR_STAGES.find(s => s.id === l.stage).name), h("h1", null, ipaT(l.t)),
      st.done ? h("p", { class: "note", style: "margin:0" }, "Đã đạt bài này. ", nx ? h("a", { href: "#pr-" + nx.id }, "Sang bài tiếp: " + nx.t + " ›") : "Bạn đã xong cả lộ trình!") : null),
    s1, s2, s3, s4);
}

/* =================== SPEAKING =================== */
function fluencyOf(tr, pz) {
  const ws = tr.words.filter(w => /[A-Za-z]/.test(w.w)), n = ws.length;
  const first = ws[0]?.s ?? pz.start, last = ws[n - 1]?.e ?? pz.end, span = Math.max(0.5, (last ?? 0) - (first ?? 0));
  const gaps = []; for (let i = 1; i < n; i++) { const g = (ws[i].s ?? 0) - (ws[i - 1].e ?? 0); if (g >= 0.5) gaps.push({ i, len: +g.toFixed(1) }); }
  const fill = (tr.text.match(/\b(um+|uh+|er+m?|ah+|hmm+)\b/gi) || []).length;
  let rep = 0; for (let i = 1; i < n; i++) if (ws[i].w.toLowerCase().replace(/[^a-z']/g, "") === ws[i - 1].w.toLowerCase().replace(/[^a-z']/g, "")) rep++;
  const runs = []; let r = 1; for (let i = 1; i < n; i++) { if (gaps.some(g => g.i === i)) { runs.push(r); r = 1; } else r++; } if (n) runs.push(r);
  return { words: n, dur: +pz.total.toFixed(1), span: +span.toFixed(1), wpm: Math.round(n / span * 60), pauses: gaps.length, long: gaps.filter(g => g.len >= 1).length, longest: gaps.reduce((a, g) => Math.max(a, g.len), 0), fillers: fill, reps: rep, run: runs.length ? +(n / runs.length).toFixed(1) : 0, gaps };
}
async function spAnalyze(blob, say) {
  say?.("Đang chuẩn bị bộ chấm…"); await spLoad("asr"); await spLoad("phx");
  const a = await spDecode(blob), pz = spPauses(a); if (pz.speech < 1) throw { vn: "Câu trả lời quá ngắn hoặc không có tiếng." };
  say?.("Đang chép lời… câu dài có thể mất 1 phút");
  const tr = await spTranscribe(a); if (!tr.text || !/[A-Za-z]/.test(tr.text)) throw { vn: "Không nghe ra lời nói. Thử nói to, gần micro hơn." };
  const fl = fluencyOf(tr, pz);
  say?.("Đang chấm phát âm từng âm…");
  const r = spGOP(await spLogp(a, null, "phx"), await spExpected(tr.text));
  const bad = r.words.filter(w => w.score != null && w.score < 60).sort((x, y) => x.score - y.score).slice(0, 8).map(w => ({ w: w.w, ipa: w.ipa, score: w.score, tips: [...new Set(w.phones.filter(x => x.s < 50).map(phTip))].slice(0, 2) }));
  const by = {}; for (const w of r.words) for (const x of w.phones) if (x.s < 50) { const k = x.miss && x.last ? `thiếu âm cuối /${x.ipa}/` : x.heard ? `/${x.ipa}/ → /${phIpa(x.heard)}/` : `/${x.ipa}/ yếu`; by[k] = (by[k] || 0) + 1; }
  pronStat(r.words);
  return { text: tr.text, fl, pron: { score: r.score, words: r.words, bad, top: Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 6) } };
}
function metricsView(an, checks) {
  const m = an.fl;
  return h("div", { class: "stack", style: "gap:8px" },
    h("span", { class: "eyebrow" }, "Máy chép lại lời bạn (bấm từ đỏ để xem lỗi âm)"), resultView({ words: an.pron.words, score: an.pron.score }, { label: "Lời bạn nói" }),
    h("div", { class: "statgrid" }, [["Thời lượng", m.dur + " giây"], ["Số từ", m.words], ["Tốc độ", m.wpm + " từ/phút"], ["Ngừng ≥1 giây", m.long + " lần"], ["Từ mỗi cụm nói liền", m.run], ["Phát âm", (an.pron.score ?? "—") + "/100"]].map(([k, v]) => h("div", null, h("span", { class: "small muted" }, k), h("b", null, String(v))))),
    checks ? h("ul", { class: "sp-checks" }, checks.map(([ok, t]) => h("li", { class: ok ? "ok" : "no" }, (ok ? "✓ " : "✗ ") + t))) : null);
}
function spChecks(l, an) {
  const p = l.practice, m = an.fl, t = an.text, out = [];
  if (p.min) out.push([m.span >= p.min * 0.9, `Nói đủ ${p.min} giây (bạn nói ${Math.round(m.span)} giây)`]);
  if (p.words) out.push([m.words >= p.words, `Ít nhất ${p.words} từ (bạn nói ${m.words} từ)`]);
  if (p.wpm) out.push([m.wpm >= p.wpm, `Tốc độ từ ${p.wpm} từ/phút (bạn: ${m.wpm})`]);
  if (p.longMax != null) out.push([m.long <= p.longMax, `Ngừng dài (≥1 giây) không quá ${p.longMax} lần (bạn: ${m.long})`]);
  if (p.chunk) out.push([m.run >= p.chunk, `Trung bình từ ${p.chunk} từ mỗi cụm nói liền (bạn: ${m.run})`]);
  if (p.fillers != null) out.push([m.fillers <= p.fillers, `Từ đệm “ừm, à” không quá ${p.fillers} lần (bạn: ${m.fillers})`]);
  for (const [label, k] of p.need || []) out.push([k === "linker2" ? (t.match(RX.linker) || []).length >= 2 : RX[k].test(t), label]);
  return out;
}
const splSt = id => (P.spl ||= {})[id] ||= {};
function pageSpeak() {
  loadSpeaks();
  if (UI.spTabSeen !== UI.spTab) { UI.spTabSeen = UI.spTab; UI.spView = null; }
  const T = subMenu("spTab", [["pron", "Phát âm", null, () => [spPronTab()]], ["path", "Lộ trình nói", null, () => [spPathTab()]], ["shadow", "Shadowing", null, () => [spShadowTab()]], ["bank", "Luyện đề", null, () => [spBankTab()]], ["test", "Thi thử", null, () => [spTestTab()]], ["hist", "Kết quả", null, () => [spHistTab()]], ...(typeof SP_GAMES !== "undefined" ? SP_GAMES : [])]);
  UI.spTabSeen = T.cur;
  return h("div", { class: "stack", style: "gap:18px" },
    pageHead("Speaking", "Nói, ghi âm và được chấm", "Phát âm, lộ trình nói, shadowing và luyện đề chấm ngay trên máy: chép lời, đo độ trôi chảy, chấm từng âm, không tốn lượt AI. Chỉ phần Thi thử mới nhờ AI chấm band theo 4 tiêu chí IELTS.", T.menu), ...T.body);
}
/* Phát âm gộp vào Nói: nội dung trang Phát âm cũ, bỏ phần đầu trang */
function spPronTab() { const n = pagePron(); const f = n.firstElementChild; if (f?.classList?.contains("page-banner")) f.remove(); return n; }
function spPathTab() {
  const dn = SP_PATH.filter(l => splSt(l.id).done).length;
  return h("div", { class: "stack", style: "gap:12px" }, h("div", { class: "row" }, h("div", { class: "meter", style: "flex:1;max-width:320px" }, h("i", { style: `width:${dn / SP_PATH.length * 100}%` })), h("span", { class: "small muted" }, `${dn}/${SP_PATH.length} bài đạt`)),
    h("div", { class: "grid3" }, SP_PATH.map((l, i) => h("a", { class: "card lesson-card", href: "#sl-" + l.id }, h("span", { class: "num" }, i + 1), h("div", { class: "stack", style: "gap:4px" }, h("h3", null, l.t), h("span", { class: "small muted" }, l.part ? "Part " + l.part : "Kỹ năng chung"), h("div", { class: "row" }, splSt(l.id).done ? h("span", { class: "chip good" }, "Đã đạt") : h("span", { class: "chip" }, "Chưa đạt")))))));
}
function pageSpLesson(l) {
  const st = splSt(l.id), i = SP_PATH.indexOf(l), p = l.practice;
  const S = UI.slS && UI.slS.id === l.id ? UI.slS : (UI.slS = { id: l.id, q: 0, an: null, rd: null });
  const prep = p.prep ? (() => { const t = h("span", { class: "timer" }, mmss(p.prep)); let iv = null; return h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { if (iv) return; let left = p.prep; iv = setInterval(() => { if (!document.body.contains(t)) return clearInterval(iv); left--; t.textContent = mmss(Math.max(0, left)); if (left <= 0) { clearInterval(iv); toast("Hết thời gian chuẩn bị. Bắt đầu nói!"); } }, 1000); } }, `Bắt đầu ${p.prep / 60} phút chuẩn bị`), t, h("span", { class: "small muted" }, "Ghi 4–6 từ khóa ra giấy, rồi bấm Ghi âm.")); })() : null;
  let practice;
  if (p.read) {
    const judge = async (blob, say) => { await spLoad("phx"); const r = await spCheckText(blob, l.model.a, say); S.rd = r; pronStat(r.words); if ((r.score ?? 0) >= PR_PASS.sent && !st.done) { st.done = today(); award("speaking", 30); addAct("speaking", 5); toast("Đạt bài này!"); } saveProfile(); render(); };
    practice = h("div", { class: "task-box stack", style: "gap:8px" }, h("p", { class: "prompt", style: "margin:0" }, l.model.a), h("div", { class: "row" }, sayBtn(l.model.a, "🔊 Nghe mẫu", "btn")), spModelCard(["phx"]), spReady(["phx"]) ? recBox(judge, { max: 40 }) : null, S.rd ? resultView(S.rd, { label: `Cần ${PR_PASS.sent} điểm` }) : null);
  } else {
    const q = p.qs[S.q];
    const judge = async (blob, say) => { const an = await spAnalyze(blob, say); const ch = spChecks(l, an); S.an = { q: S.q, an, ch }; if (ch.every(x => x[0]) && !st.done) { st.done = today(); award("speaking", 30); addAct("speaking", 5); toast("Đạt bài này!"); } st.last = { q, text: an.text, wpm: an.fl.wpm, pron: an.pron.score }; saveProfile(); render(); };
    practice = h("div", { class: "task-box stack", style: "gap:8px" },
      h("div", { class: "row", style: "gap:6px" }, p.qs.map((x, k) => h("button", { type: "button", class: "opt", "aria-pressed": String(k === S.q), onclick: () => { S.q = k; S.an = null; render(); } }, "Câu " + (k + 1)))),
      h("p", { class: "prompt", style: "font-size:1.15rem;margin:0" }, q), h("div", { class: "row" }, sayBtn(q, "🔊 Nghe câu hỏi", "btn")),
      p.tip ? h("p", { class: "small muted", style: "margin:0" }, p.tip) : null,
      h("p", { class: "small", style: "margin:0" }, h("b", null, "Để đạt: "), spChecks(l, { fl: { span: 0, words: 0, wpm: 0, long: 0, run: 0, fillers: 0 }, text: "" }).map(x => x[1].replace(/\s*\(bạn[^)]*\)/, "")).join(" · ")),
      prep, spModelCard(["asr", "phx"]), spReady(["asr", "phx"]) ? recBox(judge, { max: (p.min || 30) * 2 + 30, hint: "Nói xong bấm Dừng." }) : null,
      S.an && S.an.q === S.q ? metricsView(S.an.an, S.an.ch) : null);
  }
  return h("div", { class: "stack", style: "gap:16px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("a", { class: "btn btn-quiet", href: "#speak" }, "‹ Speaking"), h("span", { class: "small muted" }, `Bài ${i + 1}/${SP_PATH.length}`)),
    h("div", { class: "stack page-banner", style: "gap:6px" }, h("span", { class: "eyebrow" }, l.part ? "Speaking Part " + l.part : "Speaking"), h("h1", null, l.t), st.done ? h("p", { class: "note", style: "margin:0" }, "Đã đạt bài này. ", SP_PATH[i + 1] ? h("a", { href: "#sl-" + SP_PATH[i + 1].id }, "Bài tiếp ›") : null) : null),
    h("section", { class: "card stack", style: "gap:10px" }, secH(1, "Bản chất"), h("p", { style: "margin:0", html: spMd(l.idea) }),
      l.frame.length ? h("div", { class: "stack", style: "gap:4px" }, h("span", { class: "eyebrow" }, "Khung trả lời"), h("ol", { class: "gex" }, l.frame.map(x => h("li", null, x)))) : null,
      l.phrases.length ? h("div", { class: "stack", style: "gap:6px" }, h("span", { class: "eyebrow" }, "Cụm nên dùng"), h("div", { class: "row", style: "gap:6px" }, l.phrases.map(x => h("span", { class: "chip acc sp-phr" }, x, " ", sayBtn(x, "🔊", "sp-say-in"))))) : null),
    h("section", { class: "card stack", style: "gap:8px" }, secH(2, "Bài mẫu band 7"), h("p", { class: "prompt", style: "margin:0" }, l.model.q), h("p", { class: "model-text", style: "margin:0" }, l.model.a), h("div", { class: "row" }, sayBtn(l.model.a, "🔊 Nghe bài mẫu", "btn"))),
    h("section", { class: "card stack", style: "gap:10px" }, secH(3, "Luyện và tự kiểm tra", "Máy kiểm tra trên máy bạn, không gọi AI"), practice));
}
function spBankTab() {
  const part = UI.bkPart ||= "p1";
  const tabs = h("div", { class: "row", style: "gap:6px" }, [["p1", "Part 1"], ["p2", "Part 2 + 3"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(part === k), onclick: () => { UI.bkPart = k; UI.bk = null; render(); } }, t)));
  const B = UI.bk ||= { i: 0, q: 0, an: null };
  let body;
  if (part === "p1") {
    const tp = SP_BANK.p1[B.i % SP_BANK.p1.length], [q, a] = tp.qs[B.q];
    body = h("div", { class: "stack", style: "gap:10px" },
      h("div", { class: "row", style: "gap:6px" }, SP_BANK.p1.map((t, k) => h("button", { type: "button", class: "opt", "aria-pressed": String(k === B.i), onclick: () => { B.i = k; B.q = 0; B.an = null; render(); } }, t.topic))),
      h("section", { class: "card stack", style: "gap:8px" }, h("div", { class: "row", style: "gap:6px" }, tp.qs.map((_, k) => h("button", { type: "button", class: "opt", "aria-pressed": String(k === B.q), onclick: () => { B.q = k; B.an = null; render(); } }, "Câu " + (k + 1)))),
        h("p", { class: "prompt", style: "font-size:1.15rem;margin:0" }, q), h("div", { class: "row" }, sayBtn(q, "🔊 Nghe câu hỏi", "btn")),
        h("details", null, h("summary", null, "Xem trả lời mẫu band 7"), h("p", { class: "model-text", style: "margin:8px 0" }, a), sayBtn(a, "🔊 Nghe mẫu", "btn")),
        bankRec(q, 45), B.an && B.an.q === q ? metricsView(B.an.an, null) : null));
  } else {
    const c = SP_BANK.p2[B.i % SP_BANK.p2.length];
    body = h("div", { class: "stack", style: "gap:10px" },
      h("div", { class: "row", style: "gap:6px" }, h("button", { class: "btn btn-quiet", type: "button", onclick: () => { B.i = (B.i + SP_BANK.p2.length - 1) % SP_BANK.p2.length; B.q = 0; B.an = null; render(); } }, "‹"), h("span", { class: "small muted" }, `Thẻ ${B.i % SP_BANK.p2.length + 1}/${SP_BANK.p2.length}`), h("button", { class: "btn btn-quiet", type: "button", onclick: () => { B.i = (B.i + 1) % SP_BANK.p2.length; B.q = 0; B.an = null; render(); } }, "›")),
      h("section", { class: "card stack", style: "gap:8px" }, h("span", { class: "eyebrow" }, "Part 2 · cue card"), h("p", { class: "prompt", style: "font-size:1.15rem;margin:0" }, c.card), h("span", { class: "small muted" }, "You should say:"), h("ul", { class: "gex" }, c.pts.map(x => h("li", null, x))),
        h("details", null, h("summary", null, "Xem bài mẫu band 7"), h("p", { class: "model-text", style: "margin:8px 0" }, c.a), sayBtn(c.a, "🔊 Nghe mẫu", "btn")),
        bankRec(c.card, 150), B.an && B.an.q === c.card ? metricsView(B.an.an, null) : null),
      h("section", { class: "card stack", style: "gap:8px" }, h("span", { class: "eyebrow" }, "Part 3 · thảo luận"), c.p3.map(([q, a]) => h("div", { class: "stack", style: "gap:6px;border-top:1px dashed var(--line);padding-top:8px" },
        h("p", { class: "prompt", style: "margin:0" }, q), h("div", { class: "row" }, sayBtn(q, "🔊 Câu hỏi", "btn btn-quiet")),
        h("details", null, h("summary", null, "Trả lời mẫu"), h("p", { class: "model-text", style: "margin:8px 0" }, a), sayBtn(a, "🔊 Nghe mẫu", "btn")),
        bankRec(q, 90), B.an && B.an.q === q ? metricsView(B.an.an, null) : null))));
  }
  return h("div", { class: "stack", style: "gap:12px" }, tabs, body);
}
function bankRec(q, max) {
  const B = UI.bk;
  return h("div", { class: "stack", style: "gap:6px" }, spModelCard(["asr", "phx"]), spReady(["asr", "phx"]) ? recBox(async (blob, say) => { const an = await spAnalyze(blob, say); B.an = { q, an }; award("speaking", 5); addAct("speaking", 2); render(); }, { max, label: "● Ghi âm trả lời" }) : null);
}
/* ----- Thi thử: 1 lượt AI chấm cả bài ----- */
function spNewSession(kind) {
  const p1 = SP_BANK.p1[Math.floor(Math.random() * SP_BANK.p1.length)], p2 = SP_BANK.p2[Math.floor(Math.random() * SP_BANK.p2.length)], items = [];
  if (kind === "p1" || kind === "full") p1.qs.forEach(([q]) => items.push({ part: 1, q, topic: p1.topic, max: 45 }));
  if (kind === "p2" || kind === "full") items.push({ part: 2, q: p2.card, points: p2.pts, max: 130, prep: 60 });
  if (kind === "p3" || kind === "full") p2.p3.forEach(([q]) => items.push({ part: 3, q, max: 90 }));
  UI.spSess = { kind, items, i: 0, ans: {} };
}
function spTestTab() {
  if (UI.room) return roomView();
  const S = UI.spSess;
  if (!S) return h("section", { class: "card stack", style: "gap:10px" }, h("h2", null, "Thi thử Speaking"),
    h("p", { class: "small muted", style: "margin:0" }, "Trả lời từng câu bằng giọng nói. Máy chép lời, đo độ trôi chảy và chấm phát âm ngay trên máy. Khi xong, AI đọc bản chép lời và các số đo để chấm band theo 4 tiêu chí: cả bài chỉ tốn 1 lượt AI. Âm thanh không gửi đi đâu."),
    h("div", { class: "note stack", style: "gap:6px" }, h("b", null, "Phòng thi giống thật"), h("span", { class: "small" }, "Giám khảo đọc câu hỏi, chữ được ẩn, tự ghi âm khi tới lượt, Part 2 có 1 phút chuẩn bị và tự dừng ở 2 phút."), h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => { roomNew(); render(); } }, "Vào phòng thi (khoảng 13 phút)"))),
    h("span", { class: "small muted" }, "Hoặc tự luyện từng câu (thấy chữ câu hỏi, tự bấm ghi âm):"),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { spNewSession("full"); render(); } }, "Đề đầy đủ (Part 1 → 3)"), ...["p1", "p2", "p3"].map(k => h("button", { class: "btn", type: "button", onclick: () => { spNewSession(k); render(); } }, "Part " + k[1]))),
    spModelCard(["asr", "phx"]));
  const it = S.items[S.i], an = S.ans[S.i];
  const prep = it.prep ? (() => { const t = h("span", { class: "timer" }, "1:00"); let iv = null; return h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { if (iv) return; let left = it.prep; iv = setInterval(() => { if (!document.body.contains(t)) return clearInterval(iv); left--; t.textContent = mmss(Math.max(0, left)); if (left <= 0) { clearInterval(iv); toast("Hết 1 phút chuẩn bị. Bắt đầu nói!"); } }, 1000); } }, "Bắt đầu 1 phút chuẩn bị"), t); })() : null;
  const allDone = S.items.every((_, k) => S.ans[k]);
  return h("div", { class: "stack", style: "gap:14px" },
    h("div", { class: "row", style: "justify-content:space-between" }, h("button", { class: "btn btn-quiet", type: "button", onclick: () => { if (Object.keys(S.ans).length && !confirm("Bỏ bài thi này?")) return; UI.spSess = null; render(); } }, "‹ Thoát"), h("span", { class: "small muted" }, `Câu ${S.i + 1}/${S.items.length} · Part ${it.part}`)),
    h("div", { class: "meter" }, h("i", { style: `width:${Object.keys(S.ans).length / S.items.length * 100}%` })),
    h("section", { class: "card stack", style: "gap:10px" }, h("span", { class: "eyebrow" }, `Part ${it.part}` + (it.topic ? " · " + it.topic : "")),
      h("p", { class: "prompt", style: "font-size:1.15rem;margin:0" }, it.q), it.points ? h("div", null, h("span", { class: "small muted" }, "You should say:"), h("ul", { class: "gex" }, it.points.map(p => h("li", null, p)))) : null,
      h("div", { class: "row" }, sayBtn(it.q + (it.points ? ". You should say: " + it.points.join(", ") : ""), "🔊 Nghe câu hỏi", "btn btn-quiet"), h("span", { class: "small muted" }, it.part === 1 ? "Trả lời 2–4 câu (20–30 giây)." : it.part === 2 ? "Nói 1–2 phút." : "Trả lời 30–60 giây, có lý do và ví dụ.")),
      prep, spModelCard(["asr", "phx"]), spReady(["asr", "phx"]) ? recBox(async (blob, say) => { S.ans[S.i] = await spAnalyze(blob, say); render(); }, { max: it.max }) : null,
      an ? metricsView(an, null) : null,
      h("div", { class: "row" }, S.i > 0 ? h("button", { class: "btn", type: "button", onclick: () => { S.i--; render(); } }, "‹ Câu trước") : null, S.i < S.items.length - 1 ? h("button", { class: "btn" + (an ? " btn-primary" : ""), type: "button", onclick: () => { S.i++; render(); window.scrollTo(0, 0); } }, an ? "Câu tiếp ›" : "Bỏ qua ›") : null)),
    Object.keys(S.ans).length ? spGradeCard(S, allDone) : null);
}
const SPEAK_RUBRIC = `Band descriptors IELTS Speaking (bản công khai, tóm tắt). 4 tiêu chí ngang nhau.
Fluency and Coherence: 9 trôi chảy, hiếm lặp/tự sửa; 8 trôi chảy, thỉnh thoảng lặp; 7 nói dài không gắng sức, đôi lúc ngập ngừng tìm từ, dùng từ nối linh hoạt; 6 sẵn lòng nói dài nhưng đôi khi mất mạch lạc do lặp, tự sửa, ngập ngừng; 5 giữ được nhịp nhưng phải lặp, tự sửa, nói chậm; 4 ngừng rõ rệt, nói chậm.
Lexical Resource: 9 chính xác, tự nhiên; 8 rộng, linh hoạt, dùng thành ngữ khéo; 7 linh hoạt, có từ ít phổ biến, có collocation, vài lỗi; 6 đủ để bàn lâu, diễn đạt lại được; 5 đủ cho chủ đề quen, diễn đạt lại hạn chế; 4 đủ cho chủ đề quen, lỗi chọn từ nhiều.
Grammatical Range and Accuracy: 9 chính xác tự nhiên; 8 đa dạng, phần lớn không lỗi; 7 dùng nhiều cấu trúc phức, nhiều câu không lỗi; 6 kết hợp câu đơn và phức, câu phức hay sai nhưng hiếm gây khó hiểu; 5 câu cơ bản khá đúng, câu phức ít và hay sai; 4 chủ yếu câu cơ bản, lỗi nhiều.
Pronunciation: 9 dùng đầy đủ đặc điểm phát âm tinh tế; 8 linh hoạt, thỉnh thoảng sơ suất, dễ hiểu suốt bài; 7 có điểm của band 6 và một phần band 8; 6 dùng nhiều đặc điểm nhưng chưa đều, nhìn chung hiểu được; 5 có điểm của band 4 và một phần band 6; 4 phát âm sai thường xuyên gây khó hiểu.`;
function spGradeCard(S, allDone) {
  const out = h("div");
  const btn = h("button", { class: "btn btn-primary", type: "button", disabled: !sample || null, onclick: async () => {
    const idx = S.items.map((_, k) => k).filter(k => S.ans[k]);
    if (!allDone && !confirm(`Mới trả lời ${idx.length}/${S.items.length} câu. Chấm luôn các câu đã trả lời?`)) return;
    const ctl = new AbortController(); UI.busy.spg = ctl; btn.disabled = true; out.replaceChildren(h("p", { class: "muted" }, "AI đang chấm, thường mất 30–90 giây…"), stopBtn("spg"));
    const parts = idx.map(k => { const it = S.items[k], a = S.ans[k]; return `[Part ${it.part}] Câu hỏi: ${it.q}${it.points ? " (gợi ý: " + it.points.join("; ") + ")" : ""}
Lời học sinh (máy chép): "${a.text}"
Số đo: ${a.fl.words} từ trong ${a.fl.span} giây, ${a.fl.wpm} từ/phút; ${a.fl.pauses} khoảng ngừng ≥0,5 giây (${a.fl.long} lần ≥1 giây, dài nhất ${a.fl.longest} giây); trung bình ${a.fl.run} từ mỗi cụm nói liền; từ đệm: ${a.fl.fillers}; lặp từ: ${a.fl.reps}.
Phát âm (mô hình âm vị chấm trên máy): ${a.pron.score ?? "?"}/100; lỗi âm hay gặp: ${a.pron.top.map(([k, v]) => k + " ×" + v).join(", ") || "không đáng kể"}; từ sai: ${a.pron.bad.map(b => `${b.w} /${b.ipa}/ ${b.score}`).join("; ") || "không có"}.`; }).join("\n\n");
    const prompt = `Bạn là giám khảo IELTS Speaking giàu kinh nghiệm, chấm cho một sinh viên Việt Nam, mục tiêu band ${P.target}. Chấm trung thực, không nâng điểm để động viên.
${SPEAK_RUBRIC}

LƯU Ý: bạn không nghe được âm thanh. Lời học sinh do máy nhận diện chép lại: máy có thể bỏ bớt "ừm, à" và đôi khi tự sửa từ phát âm sai thành từ đúng. Độ trôi chảy đo bằng thời gian thật. Phát âm đo bằng mô hình nhận diện âm vị (chưa đo được ngữ điệu), nên band Pronunciation là ước lượng; nói rõ điều đó. Part 2 dưới 1 phút thì Fluency and Coherence khó vượt band 5.

BÀI NÓI:
${parts}

Viết tiếng Việt:
- Mỗi tiêu chí: band NGUYÊN 0–9, "comment" 1–3 câu dẫn chứng từ bài và số đo, "to_next" việc cụ thể để lên band kế tiếp.
- "fixes": tối đa 5 lỗi ngữ pháp/dùng từ quan trọng nhất: "original" (trích nguyên văn), "corrected", "why", "category" (Ngữ pháp / Từ vựng / Mạch lạc).
- "pron_tips": 2–4 lời khuyên phát âm cụ thể dựa trên lỗi âm ở trên.
- "better": với mỗi câu đã trả lời, một câu trả lời mẫu band 7 ngắn (Part 1: 2–3 câu; Part 2: 120–160 từ; Part 3: 3–4 câu), giữ ý của học sinh khi hợp lý.
- "next_step": một việc nên luyện tiếp.
Chỉ trả lời JSON: {"criteria":[{"name":"Fluency and Coherence","band":5,"comment":"...","to_next":"..."},{"name":"Lexical Resource","band":5,"comment":"...","to_next":"..."},{"name":"Grammatical Range and Accuracy","band":5,"comment":"...","to_next":"..."},{"name":"Pronunciation","band":5,"comment":"...","to_next":"..."}],"fixes":[{"original":"...","corrected":"...","why":"...","category":"Ngữ pháp"}],"pron_tips":["..."],"better":["..."],"next_step":"..."}`;
    try {
      const r = await ai(prompt, { json: true, signal: ctl.signal });
      if (!Array.isArray(r?.criteria) || r.criteria.length < 4) throw { code: "invalid_json" };
      const crit = r.criteria.slice(0, 4).map(c => ({ name: String(c.name || ""), band: Math.max(0, Math.min(9, Math.round(Number(c.band) || 0))), comment: String(c.comment || ""), to_next: String(c.to_next || "") }));
      const res = { overall: roundBand(crit.reduce((a, c) => a + c.band, 0) / 4), criteria: crit, fixes: (r.fixes || []).slice(0, 5).map(f => ({ original: String(f.original || ""), corrected: String(f.corrected || ""), why: String(f.why || ""), category: String(f.category || "") })), pron_tips: (r.pron_tips || []).map(String).slice(0, 4), better: (r.better || []).map(String), next_step: String(r.next_step || "") };
      const doc = { kind: S.kind, created: Date.now(), items: idx.map(k => ({ part: S.items[k].part, q: S.items[k].q, text: S.ans[k].text, fl: { ...S.ans[k].fl, gaps: null }, pron: { score: S.ans[k].pron.score, bad: S.ans[k].pron.bad, top: S.ans[k].pron.top } })), result: res };
      const id = newId(); await putDoc("speaks", id, JSON.parse(JSON.stringify(doc))).catch(() => {}); SPEAKS.unshift({ ...doc, id });
      award("speaking", 60, "speak"); addAct("speaking", Math.max(5, Math.round(idx.length * 1.5)));
      UI.spSess = null; UI.room = null; UI.spTab = "hist"; UI.spTabSeen = "hist"; UI.spView = id; render(); window.scrollTo(0, 0);
    } catch (e) { out.replaceChildren(h("p", { class: "note " + (e?.code === "cancelled" ? "" : "bad") }, aiMsg(e))); btn.disabled = false; }
    finally { delete UI.busy.spg; }
  } }, allDone ? "Nhờ AI chấm cả bài (1 lượt)" : "Chấm các câu đã trả lời (1 lượt)");
  return h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Chấm bài"), h("p", { class: "small muted", style: "margin:0" }, "AI nhận bản chép lời, số đo trôi chảy và kết quả phát âm, rồi chấm theo 4 tiêu chí. Âm thanh không được gửi đi. Bản chép lời và kết quả được lưu vào mục Kết quả."), h("div", { class: "row" }, btn), out);
}
function spHistTab() {
  const v = UI.spView && SPEAKS.find(x => x.id === UI.spView);
  if (v) { const r = v.result;
    return h("div", { class: "stack", style: "gap:14px" }, h("button", { class: "btn btn-quiet", type: "button", style: "align-self:flex-start", onclick: () => { UI.spView = null; render(); } }, "‹ Tất cả lần thi"),
      h("section", { class: "card stack", style: "gap:12px" }, h("div", { class: "row", style: "align-items:flex-end;gap:18px" }, h("div", { class: "stack", style: "gap:2px" }, h("span", { class: "eyebrow" }, "Band Speaking ước tính"), h("span", { class: "band-big" }, r.overall.toFixed(1))), h("div", { style: "flex:1;min-width:220px" }, ruler(r.overall, P.target))),
        h("div", { class: "stack", style: "gap:10px" }, r.criteria.map(c => h("div", { class: "sp-crit" }, h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, c.name), h("b", null, String(c.band))), h("p", { style: "margin:0" }, c.comment), c.to_next ? h("p", { class: "small", style: "margin:0;color:var(--accent,#0b6e4f)" }, "Lên band " + Math.min(9, c.band + 1) + ": " + c.to_next) : null))),
        r.pron_tips.length ? h("div", { class: "stack", style: "gap:4px" }, h("h3", null, "Luyện phát âm"), h("ul", { class: "gex" }, r.pron_tips.map(t => h("li", null, t)))) : null,
        r.fixes.length ? h("div", { class: "stack" }, h("h3", null, "Lỗi nên sửa"), fixesNode(r.fixes)) : null,
        r.next_step ? h("p", { class: "note" }, "Luyện tiếp: " + r.next_step) : null),
      v.items.map((it, k) => h("section", { class: "card stack", style: "gap:8px" }, h("span", { class: "eyebrow" }, "Part " + it.part), h("p", { class: "prompt", style: "margin:0" }, it.q),
        h("p", { class: "small", style: "margin:0" }, h("b", null, "Bạn nói: "), it.text), h("p", { class: "small muted", style: "margin:0" }, `${it.fl.wpm} từ/phút · ${it.fl.long} lần ngừng ≥1 giây · phát âm ${it.pron.score ?? "—"}/100`),
        r.better[k] ? h("details", null, h("summary", null, "Câu trả lời mẫu band 7"), h("p", { class: "model-text", style: "margin-top:8px;white-space:pre-wrap" }, r.better[k])) : null))); }
  return h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Các lần thi Speaking"),
    SPEAKS.length ? h("div", { class: "stack", style: "gap:6px" }, SPEAKS.map(s => h("button", { type: "button", class: "sp-hrow", onclick: () => { UI.spView = s.id; render(); window.scrollTo(0, 0); } }, h("b", { class: "sp-hb" }, s.result.overall.toFixed(1)), h("span", null, { full: "Đề đầy đủ", room: "Phòng thi", p1: "Part 1", p2: "Part 2", p3: "Part 3" }[s.kind] || "Speaking"), h("span", { class: "small muted" }, fmtDate(s.created)))))
      : h("p", { class: "empty" }, "Chưa có lần thi nào. Vào Thi thử để làm bài đầu tiên."));
}

/* =================== Gắn vào app =================== */
(function () {
  const ipa = NAV.find(x => x[0] === "ipa"); if (ipa) ipa[2] = "M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2";
  const at = NAV.findIndex(x => x[0] === "ipa"); NAV.splice(at + 1, 0, ["speak", "Nói", "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3"]);
  const _nav = navTab; navTab = r => r.startsWith("pr-") || r === "ipa-chart" ? "ipa" : r.startsWith("sl-") ? "speak" : _nav(r);
  const mine = r => r === "ipa-chart" || r === "speak" || (r.startsWith("pr-") && PR_LESSONS.some(l => l.id === r.slice(3))) || (r.startsWith("sl-") && SP_PATH.some(l => l.id === r.slice(3)));
  const _or = onRoute; window.removeEventListener("hashchange", _or);
  onRoute = function () { const raw = (location.hash || "").slice(1); if (!mine(raw)) return _or(); if (raw !== UI.route) { try { stopTTS(); } catch {} UI.route = raw; UI.prW = null; UI.slS = null; $("#lookup").hidden = true; render(); window.scrollTo(0, 0); } };
  window.addEventListener("hashchange", () => onRoute());
  const _ri = renderInner;
  renderInner = function () {
    const r = UI.route; let node = null;
    if (r === "ipa") { UI.spTab = "pron"; node = pageSpeak(); }
    else if (r === "ipa-chart") node = h("div", { class: "stack", style: "gap:12px" }, h("a", { class: "btn btn-quiet", href: "#ipa", style: "align-self:flex-start" }, "‹ Lộ trình phát âm"), pageIPA());
    else if (r.startsWith("pr-") && PR_LESSONS.find(l => l.id === r.slice(3))) node = pagePrLesson(PR_LESSONS.find(l => l.id === r.slice(3)));
    else if (r === "speak") node = pageSpeak();
    else if (r.startsWith("sl-") && SP_PATH.find(l => l.id === r.slice(3))) node = pageSpLesson(SP_PATH.find(l => l.id === r.slice(3)));
    if (!node) return _ri();
    renderNav(); UI.keyH = null; $("#main").replaceChildren(node); renderAsk();
  };
})();
