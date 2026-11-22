/* ===== Điền lời bài hát (YouTube): phát từng dòng rồi tự dừng, che vài từ, nghe và gõ lại. Lời bài hát chỉ hiện trong lúc chơi, không lưu lại.
   Tùy chọn hát theo: ghi giọng trong lúc dòng nhạc phát để tự nghe lại (không chấm điểm, vì web không đọc được âm thanh của video YouTube). ===== */
/* Dòng lời: giữ nguyên từng dòng phụ đề của video, mốc lấy theo từng từ khi có phụ đề tự động */
function songLines(r) {
  const words = []; r.cues.forEach((c, ci) => ytWords([c]).forEach(w => words.push({ ...w, ci })));
  const al = !r.asr && r.aw?.length ? ytAlignWords(words, r.aw) : words, out = [];
  for (const w of al) { const L = out[out.length - 1]; if (L && L.ci === w.ci) { L.w.push(w); continue; } out.push({ ci: w.ci, w: [w] }); }
  return out.map((L, k) => { const nx = out[k + 1], last = L.w[L.w.length - 1]; return { x: ytClean(L.w.map(z => z.w).join(" ")), s: Math.max(0, L.w[0].t - 0.15), e: nx ? Math.max(last.e, Math.min(last.e + 0.35, nx.w[0].t - 0.02)) : last.e + 0.5 }; }).filter(z => /[a-z]/i.test(z.x) && z.e > z.s);
}
const SONG_LV = [["easy", "Dễ: che 1 từ"], ["mid", "Vừa: che 2–3 từ"], ["hard", "Khó: chép cả dòng"]];
function songBlanks(x, lv, seed) {
  const toks = x.split(/\s+/), cand = toks.map((t, i) => [i, t.toLowerCase().replace(/[^a-z']/g, "")]).filter(([, t]) => t.length >= 3 && !DP_STOP.has(t));
  if (lv === "hard" || !cand.length) return lv === "hard" ? toks.map((_, i) => i) : [toks.length - 1];
  let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280, pick = [], pool = cand.slice(), n = lv === "easy" ? 1 : Math.min(pool.length, 2 + (toks.length > 8 ? 1 : 0));
  while (pick.length < n && pool.length) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0][0]);
  return pick.sort((a, b) => a - b);
}
function gmSong() {
  const S = UI.song ||= { url: "", id: "", lines: null, how: "", err: "", busy: "", i: 0, lv: "easy", ans: {}, res: null, score: 0, combo: 0, sing: false, rec: null };
  const st = gmSt("song"), nz = t => String(t).toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']/g, "");
  const noCaps = () => { for (const t of [0, 300, 1000]) setTimeout(() => { try { SHW.player?.unloadModule("captions"); SHW.player?.unloadModule("cc"); } catch {} }, t); };
  const load = async () => {
    const id = ytId(S.url); if (!id) { S.err = "Link YouTube chưa đúng."; render(); return; }
    Object.assign(S, { id, lines: null, err: "", busy: "Đang mở video…", i: 0, ans: {}, res: null, score: 0, combo: 0 }); render();
    try { await ytOpen(id); } catch (e) { S.err = e.message; S.busy = ""; render(); return; }
    S.busy = "Đang lấy lời bài hát từ phụ đề của video…"; render();
    try { const r = await window.__yt?.(id, { nocache: true });
      if (!r?.cues?.length) throw 0;
      const lines = songLines(r); if (lines.length < 3) throw 0;
      Object.assign(S, { lines, busy: "", how: r.asr ? "⚠ Video chỉ có phụ đề tự động: lời có thể sai vì tiếng nhạc lấn giọng hát. Nên chọn video lyric có phụ đề tiếng Anh." : r.aw?.length ? "Lời theo phụ đề của video, mốc căn theo từng từ." : "Lời theo phụ đề của video (mốc theo dòng, lệch thì bấm nghe lại)." });
    } catch (e) { S.busy = ""; S.err = e?.message && !/^\d+$/.test(e.message) ? "Chưa lấy được lời: " + e.message + ". Thử video lyric khác có phụ đề tiếng Anh." : "Video này không có phụ đề tiếng Anh, hoặc không phát được ở trang khác. Thử video lyric khác (thường có chữ “lyrics” trong tên)."; }
    render();
  };
  const urlIn = h("input", { type: "url", placeholder: "Dán link bài hát YouTube (nên chọn video lyric có phụ đề tiếng Anh)…", value: S.url, style: "flex:1;min-width:0", oninput: e => { S.url = e.target.value; }, onkeydown: e => { if (e.key === "Enter") load(); } });
  const head = h("section", { class: "card stack", style: "gap:8px" },
    h("div", { class: "row", style: "gap:6px;flex-wrap:nowrap" }, urlIn, h("button", { class: "btn btn-primary", type: "button", onclick: load }, "Mở bài")),
    h("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, SONG_LV.map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(S.lv === k), onclick: () => { S.lv = k; S.ans = {}; S.res = null; render(); } }, t))),
    h("span", { class: "small muted" }, "Bài hát nối âm, nuốt âm rất mạnh (gonna, wanna, 'cause), đúng phần giọng đọc trên web không có. Điều kiện: video phải cho phát ở trang khác (nhiều MV chính thức bị chặn, video lyric thường được) và có phụ đề tiếng Anh. Lời chỉ hiện trong lúc chơi, không lưu lại."),
    S.err ? h("p", { class: "note bad small", style: "margin:0" }, S.err) : null, S.busy ? h("p", { class: "small muted", style: "margin:0" }, S.busy) : null,
    S.id ? h("div", { class: "shw-yt-ph" }) : null, S.how ? h("span", { class: "small muted" }, S.how) : null);
  const box = h("div", { class: "stack", style: "gap:12px" }, gmHead("🎵 Điền lời bài hát", "Nghe từng dòng nhạc, gõ những từ bị che. Đúng liền nhiều dòng được nhân điểm.", st.best), head);
  if (!S.lines) return box;
  const n = S.lines.length, i = Math.min(S.i, n - 1), L = S.lines[i], toks = L.x.split(/\s+/), bl = songBlanks(L.x, S.lv, i * 7919 + n), done = !!S.res;
  const play = r => { const x = ytPlaySeg(L.s, L.e, r || 1); noCaps(); return x; };
  const check = () => {
    if (done) return; const ok = bl.map(k => nz(S.ans[k]) === nz(toks[k]) || (nz(toks[k]).length > 3 && nz(S.ans[k]).length > 2 && nz(toks[k]).startsWith(nz(S.ans[k])) && nz(toks[k]).length - nz(S.ans[k]).length <= 1));
    const hit = ok.filter(Boolean).length; S.res = { ok }; if (hit === bl.length) { S.combo++; S.score += 10 * bl.length * Math.min(4, S.combo); } else S.combo = 0;
    if (S.score > (st.best || 0)) st.best = S.score; st.lines = (st.lines || 0) + 1; award("game", Math.min(6, hit * 2)); addAct("listening", 0.5); saveProfile(); render();
  };
  const next = d => { S.i = Math.max(0, Math.min(n - 1, i + d)); S.ans = {}; S.res = null; try { SHW.player?.pauseVideo(); } catch {} render(); setTimeout(() => { const z = S.lines[S.i]; ytPlaySeg(z.s, z.e); noCaps(); }, 80); };
  const line = h("p", { class: "song-line" }, toks.map((t, k) => bl.includes(k) ? (done ? h("span", { class: "song-b " + (S.res.ok[bl.indexOf(k)] ? "ok" : "no") }, S.res.ok[bl.indexOf(k)] ? t : [h("s", null, S.ans[k] || "…"), " ", t]) :
    h("input", { class: "song-in", type: "text", autocomplete: "off", spellcheck: "false", value: S.ans[k] || "", style: `width:${Math.max(3, t.replace(/[^\w']/g, "").length + 1)}ch`, "aria-label": "Từ bị che", oninput: e => { S.ans[k] = e.target.value; }, onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); check(); } } })) : h("span", null, t)).flatMap((x, k) => k ? [" ", x] : [x]));
  /* Hát theo: ghi giọng trong lúc dòng nhạc phát rồi nghe lại (đeo tai nghe để micro không thu tiếng nhạc) */
  const singBtn = h("button", { class: "btn btn-quiet", type: "button", onclick: async () => {
    singBtn.disabled = true; singBtn.textContent = "🎤 Đang ghi…";
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }), mr = new MediaRecorder(stream), parts = [];
      mr.ondataavailable = e => parts.push(e.data); mr.start(); const a = play(1);
      await new Promise(r => { if (!a) return setTimeout(r, (L.e - L.s) * 1000); a.addEventListener("ended", r, { once: true }); setTimeout(r, (L.e - L.s) * 1000 + 3000); });
      await new Promise(r => setTimeout(r, 400)); mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (S.rec) URL.revokeObjectURL(S.rec); S.rec = URL.createObjectURL(new Blob(parts, { type: mr.mimeType })); render(); }; mr.stop();
    } catch (e) { toast(e?.name === "NotAllowedError" ? "Bạn chưa cho phép dùng micro." : "Chưa ghi được: " + (e?.message || e)); singBtn.disabled = false; singBtn.textContent = "🎤 Hát theo dòng này"; } } }, "🎤 Hát theo dòng này");
  box.append(h("section", { class: "card stack", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;flex-wrap:wrap;gap:8px" }, h("b", null, `Dòng ${i + 1}/${n}`), h("span", { class: "row", style: "gap:10px" }, h("b", null, "Điểm " + S.score), S.combo > 1 ? h("span", { class: "chip acc" }, "🔥 x" + Math.min(4, S.combo)) : null)),
    h("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => play(1) }, "▶ Nghe dòng này"), h("button", { class: "btn", type: "button", onclick: () => play(0.75) }, "🐢 0.75×"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => { try { SHW.player?.pauseVideo(); } catch {} } }, "⏹ Dừng")),
    line,
    h("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, done ? null : h("button", { class: "btn", type: "button", onclick: check }, "Kiểm tra"), h("button", { class: "btn btn-quiet", type: "button", disabled: !i || null, onclick: () => next(-1) }, "‹ Dòng trước"), h("button", { class: "btn" + (done ? " btn-primary" : " btn-quiet"), type: "button", disabled: i >= n - 1 || null, onclick: () => next(1) }, "Dòng tiếp ›")),
    done && S.res.ok.every(Boolean) ? h("p", { class: "small", style: "margin:0;color:var(--good,#0e8a6a)" }, "Chuẩn! Nghe lại một lần để để ý chỗ ca sĩ nối và nuốt âm.") : done ? h("p", { class: "small muted", style: "margin:0" }, "Nghe chậm 0.75× vài lần, để ý từ bị nối với từ trước hoặc bị đọc yếu.") : null,
    h("details", null, h("summary", { class: "small" }, "🎤 Hát theo (tự nghe lại, đeo tai nghe)"), h("div", { class: "stack", style: "gap:6px;margin-top:6px" },
      h("span", { class: "small muted" }, "Bấm để video phát dòng này và ghi giọng bạn cùng lúc, rồi nghe lại xem mình hát có khớp lời, khớp nhịp không. Phần này không chấm điểm, vì web không đọc được âm thanh của video YouTube để so cao độ với ca sĩ."),
      h("div", { class: "row", style: "gap:6px" }, singBtn, S.rec ? h("audio", { controls: true, src: S.rec, style: "max-width:100%" }) : null)))));
  return box;
}
(function () {
  LS_GAMES.push(["g-song", "🎵 Điền lời bài hát", null, () => [gmSong()]]);
  SUB_DESC["lsTab:g-song"] = "Nghe nhạc YouTube, điền từ bị che, hát theo";
  ACH.push(["song50", "🎵", "Ca sĩ phòng thu", "Điền lời 50 dòng bài hát", () => (P.gm?.song?.lines || 0) >= 50]);
  const G = ACH_GROUPS[2], f = G[3]; G[3] = id => f(id) || id === "song50";
  document.head.append(h("style", null, ".song-line{font-size:1.35rem;line-height:2.2;margin:0}.song-in{font:inherit;font-weight:700;border:0;border-bottom:2px solid var(--edge,#111);background:color-mix(in srgb,#1c7ed6 6%,transparent);padding:0 3px;text-align:center;min-width:3ch;max-width:100%}.song-in:focus{outline:none;border-bottom-color:#1c7ed6}.song-b{font-weight:700;padding:0 3px}.song-b.ok{color:var(--good,#0e8a6a)}.song-b.no{color:#e03131}.song-b s{color:var(--muted);font-weight:400}"));
})();
