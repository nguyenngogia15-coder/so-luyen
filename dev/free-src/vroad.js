/* ===== Lộ trình từ vựng: theo chủ đề IELTS và theo CEFR (A1→B2). Mỗi bài tối đa 10 sao:
   Học thẻ 1★ → Bài tập 3★ (bắt buộc, sai 1 câu là làm lại từ đầu) ; luyện thêm Nghe viết 3★, Phát âm 3★.
   Dữ liệu đặt cạnh trang: vr/index.json và vr/<phần>.json ===== */
const VR = { idx: null, parts: {} };
function vrIndex() { return VR.idx ||= fetch("vr/index.json").then(r => { if (!r.ok) throw new Error("vr " + r.status); return r.json(); }).catch(e => { VR.idx = null; throw e; }); }
function vrPart(id) { return VR.parts[id] ||= fetch("vr/" + id + ".json").then(r => { if (!r.ok) throw new Error("vr " + r.status); return r.json(); }).catch(e => { delete VR.parts[id]; throw e; }); }
const vrSt = pid => ((P.vr ||= {})[pid] ||= { l: {} });
const vrL = (pid, i) => (vrSt(pid).l[i] ||= {});
const vrStars = s => (s.c ? 1 : 0) + (s.x || 0) + (s.d || 0) + (s.s || 0);
const vrPassed = s => !!(s.c && s.x);
const vrOpen = (pid, i) => i === 0 || vrSt(pid).open || vrPassed(vrL(pid, i - 1)) || vrPassed(vrL(pid, i));
const vrShuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const vrMask = (en, w) => {
  const k = String(w).replace(/\s*\(.*?\)\s*/g, "").trim().split(/\s+/), esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const loose = t => { const st = [t]; if (/e$/.test(t)) st.push(t.slice(0, -1)); if (/y$/.test(t)) st.push(t.slice(0, -1) + "i"); if (/[^aeiouwy][aeiou][^aeiouwy]$/.test(t)) st.push(t + t.slice(-1)); return "(?:" + st.map(esc).join("|") + ")[a-z]{0,4}"; };
  for (const p of [k.map(esc), k.map(loose)]) { const re = new RegExp("(^|[^A-Za-z])(" + p.join("\\s+") + ")(?=[^A-Za-z]|$)", "i"); if (re.test(en)) return en.replace(re, "$1•••"); }
  return en;
};
const vrKey = w => String(w).toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim();
const VR_POS = { noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ", preposition: "giới từ", pronoun: "đại từ", conjunction: "liên từ", determiner: "hạn định từ", exclamation: "thán từ", number: "số từ", "modal verb": "động từ khuyết thiếu", "auxiliary verb": "trợ động từ", phrase: "cụm từ", "verb phrase": "cụm động từ", collocation: "cụm từ", "indefinite article": "mạo từ", "definite article": "mạo từ", "ordinal number": "số thứ tự", "infinitive marker": "tiểu từ", "linking verb": "động từ nối" };
const vrPos = p => VR_POS[p] || p;
function vrSay(w) { try { speakWord(w); } catch { try { speak(w); } catch {} } }
function vrSayText(t) { try { stopTTS(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-GB"; u.rate = 0.95; speechSynthesis.speak(u); } catch {} }
/* Đánh dấu hôm nay đã học Lộ trình từ vựng (cho nhiệm vụ hằng ngày; ôn lại bài cũ cũng tính) */
function vrMarkDay() { const lg = P.log[today()] ||= { min: 0, acts: [] }; if (!lg.vr) { lg.vr = 1; saveProfile(); } }
/* Bài i của phần: các mục từ */
function vrLesson(part, data, i) { let a = 0; for (let k = 0; k < i; k++) a += part.sizes[k]; return data.slice(a, a + part.sizes[i]); }

/* ----- Trang chính ----- */
function vrPage() {
  const V = UI.vr ||= { mode: "topic", part: null, view: null };
  const box = h("div", { class: "stack vr", style: "gap:16px" }, h("p", { class: "muted" }, "Đang tải lộ trình…"));
  vrIndex().then(ix => {
    const parts = ix[V.mode] || [];
    if (!V.part || !parts.some(p => p.id === V.part)) V.part = (parts.find(p => p.lessons > vrDoneN(p)) || parts[0])?.id;
    const part = parts.find(p => p.id === V.part);
    if (V.view && part) { vrPart(part.id).then(data => box.replaceChildren(vrView(part, data, V.view)), e => box.replaceChildren(h("p", { class: "note bad" }, "Chưa tải được dữ liệu: " + e.message))); return; }
    box.replaceChildren(
      h("div", { class: "row vr-modes" }, [["topic", "Từ vựng chủ đề"], ["cefr", "Từ vựng CEFR"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(V.mode === k), onclick: () => { V.mode = k; V.part = null; render(); } }, t))),
      h("div", { class: "vr-layout" },
        h("aside", { class: "vr-parts" }, h("span", { class: "eyebrow" }, V.mode === "topic" ? `${parts.length} chủ đề · ${parts.reduce((a, p) => a + p.n, 0)} mục từ` : `Chuẩn CEFR · ${parts.length} phần`),
          parts.map((p, k) => { const dn = vrDoneN(p); return h("button", { type: "button", class: "vr-part" + (p.id === V.part ? " on" : ""), onclick: () => { V.part = p.id; render(); } }, h("span", { class: "vr-pn" }, String(k + 1).padStart(2, "0")), h("span", { class: "stack", style: "gap:2px;min-width:0" }, h("b", null, p.title), h("span", { class: "small muted" }, `${dn}/${p.lessons} bài · ${Math.round(dn / p.lessons * 100)}%`))); })),
        part ? vrLessonList(part) : h("p", { class: "empty" }, "Chưa có dữ liệu.")));
  }, e => box.replaceChildren(h("p", { class: "note bad" }, "Chưa tải được lộ trình (" + e.message + ").")));
  return box;
}
function vrDoneN(p) { const s = (P.vr || {})[p.id]; return s ? Object.values(s.l || {}).filter(vrPassed).length : 0; }
function vrLessonList(part) {
  const V = UI.vr, st = vrSt(part.id), total = Object.values(st.l).reduce((a, s) => a + vrStars(s), 0);
  const step = (on, done, n, label, stars, go) => h("button", { type: "button", class: "vr-step" + (done ? " done" : "") + (on ? "" : " lock"), disabled: !on || null, onclick: go },
    h("span", { class: "vr-dot" }, done ? "✓" : on ? n : "🔒", h("span", { class: "vr-st" }, "★".repeat(stars))), h("b", null, label));
  const opt = (on, label, got, go, note) => h("button", { type: "button", class: "vr-opt" + (on ? "" : " lock"), disabled: !on || null, onclick: go, title: note || null }, h("b", null, label), h("span", { class: "vr-stars" }, [0, 1, 2].map(k => h("i", { class: k < got ? "on" : "" }, "★"))));
  const canPron = typeof spCheckText === "function";
  return h("div", { class: "stack", style: "gap:14px;min-width:0" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline" }, h("div", { class: "stack", style: "gap:2px" }, h("span", { class: "eyebrow" }, part.sub || ""), h("h2", null, part.title)), h("span", { class: "small muted" }, `${Object.values(st.l).filter(vrPassed).length}/${part.lessons} bài · ${total}/${part.lessons * (canPron ? 10 : 7)} ★`)),
    st.open ? h("p", { class: "note", style: "margin:0" }, "Bạn đã vượt cấp: mọi bài của phần này đã mở.") : h("div", { class: "card vr-skip" }, h("div", { class: "stack", style: "gap:2px" }, h("b", null, "Thi vượt cấp"), h("span", { class: "small muted" }, "30 câu: 25 câu bài tập và 5 câu nghe viết. Đúng từ 25 câu là mở khóa mọi bài của phần này.")), h("button", { class: "btn", type: "button", onclick: () => { V.view = { k: "exam" }; render(); } }, "Làm bài thi →")),
    Array.from({ length: part.lessons }, (_, i) => { const s = vrL(part.id, i), open = vrOpen(part.id, i), pass = vrPassed(s), go = k => () => { V.view = { k, i }; render(); window.scrollTo(0, 0); };
      return h("section", { class: "card vr-lesson" + (open ? "" : " lock") },
        h("div", { class: "row", style: "justify-content:space-between" }, h("div", { class: "row", style: "gap:10px;align-items:baseline" }, h("h3", null, "Bài " + String(i + 1).padStart(2, "0")), h("span", { class: "small muted" }, part.sizes[i] + " mục từ")),
          h("div", { class: "row", style: "gap:10px" }, h("span", { class: "chip " + (pass ? "acc" : open ? "warn" : "") }, pass ? "Đã qua" : open ? "Đang học" : "Chưa mở"), h("b", { class: "vr-sc" }, `${vrStars(s)}/${canPron ? 10 : 7} ★`))),
        h("div", { class: "vr-body" },
          h("div", { class: "stack", style: "gap:8px" }, h("span", { class: "small muted", style: "font-weight:700" }, "Để qua bài"),
            h("div", { class: "vr-steps" }, step(open, !!s.c, 1, "Học thẻ", 1, go("cards")), h("span", { class: "vr-arrow", "aria-hidden": "true" }, "→"), step(open && !!s.c, !!s.x, 2, "Bài tập", 3, go("quiz")))),
          h("div", { class: "vr-more" }, h("span", { class: "small muted" }, h("b", null, "Luyện thêm"), " tuỳ chọn"),
            opt(pass, "Nghe viết", s.d || 0, go("dict")), canPron ? opt(pass, "Phát âm", s.s || 0, go("pron")) : opt(false, "Phát âm", 0, null, "Phần chấm phát âm có ở web ngoài"))));
    }));
}
/* ----- Các màn học ----- */
function vrView(part, data, v) {
  const V = UI.vr, back = () => { V.view = null; stopTTS(); render(); window.scrollTo(0, 0); };
  const head = (t, sub) => h("div", { class: "row", style: "justify-content:space-between" }, h("button", { class: "btn btn-quiet", type: "button", onclick: back }, "× Thoát"), h("span", { class: "small muted" }, part.title + (sub ? " · " + sub : "")), h("span", { class: "small muted" }, t));
  if (v.k === "exam") return vrExam(part, data, head, back);
  const items = vrLesson(part, data, v.i), lab = "Bài " + String(v.i + 1).padStart(2, "0");
  if (v.k === "cards") return vrCards(part, items, v, head(lab, "Học thẻ"), back);
  if (v.k === "quiz") return vrQuiz(part, data, items, v, head(lab, "Bài tập"), back);
  if (v.k === "dict") return vrDict(part, items, v, head(lab, "Nghe viết"), back);
  if (v.k === "pron") return vrPron(part, items, v, head(lab, "Phát âm"), back);
  return h("p", null, "?");
}
function vrDone(title, msg, btns) { return h("section", { class: "card vr-done stack", style: "gap:12px;align-items:center;text-align:center" }, h("span", { class: "vr-big" }, "★"), h("span", { class: "eyebrow" }, title), h("p", { style: "margin:0" }, msg), h("div", { class: "row", style: "justify-content:center" }, btns)); }
function vrCards(part, items, v, head, back) {
  const C = v.c ||= { i: 0, flip: false, front: "en", need: [] }, it = items[C.i];
  if (!it) {
    const s = vrL(part.id, v.i); if (!s.c) { s.c = 1; award("vocab", 5); addAct("vocab", Math.max(2, Math.round(items.length / 4))); saveProfile(); }
    return h("div", { class: "stack", style: "gap:14px" }, head, vrDone("Đã xem hết thẻ", `Bạn đã xem ${items.length} thẻ. Mức Bài tập của bài này đã mở.` + (C.need.length ? ` Có ${C.need.length} từ bạn đánh dấu Cần ôn, đã đưa vào Sổ từ vựng.` : ""), [h("button", { class: "btn btn-primary", type: "button", onclick: () => { UI.vr.view = { k: "quiz", i: v.i }; render(); } }, "Làm bài tập →"), h("button", { class: "btn", type: "button", onclick: back }, "Về lộ trình")]));
  }
  const flip = () => { C.flip = !C.flip; render(); };
  const mark = async need => { if (!C.flip) return; if (need) { C.need.push(it.w); if (!VOCAB.some(x => vrKey(x.word) === vrKey(it.w))) addVocab({ word: it.w, pos: vrPos(it.p), ipa: it.ipa || "", meaning: it.vi, def: it.d, example: it.e[0][0], topic: part.title }).catch(() => {}); } C.i++; C.flip = false; render(); };
  UI.keyH = e => { if (e.target.closest("input,textarea")) return; if (e.code === "Space") { e.preventDefault(); flip(); } else if (e.key === "1") mark(true); else if (e.key === "2") mark(false); else if (e.key.toLowerCase() === "a") vrSay(it.w); };
  const front = C.front === "en" ? h("div", { class: "fc-mid" }, h("span", { class: "fc-word" }, it.w), it.ipa ? h("span", { class: "fc-ipa" }, it.ipa) : null, h("span", { class: "fc-pos" }, vrPos(it.p)))
    : h("div", { class: "fc-mid" }, h("span", { class: "fc-word", style: "font-size:clamp(1.8rem,4.6vw,3rem)" }, it.vi), h("span", { class: "fc-pos" }, vrPos(it.p)));
  const back2 = h("div", { class: "fc-mid", style: "gap:12px;width:100%" }, C.front === "en" ? h("span", { class: "fc-mean", style: "color:#fff" }, it.vi) : h("div", { class: "stack", style: "gap:4px;align-items:center" }, h("span", { class: "fc-word" }, it.w), it.ipa ? h("span", { class: "fc-ipa" }, it.ipa) : null),
    h("span", { class: "vr-def" }, it.d), h("div", { class: "vr-exs" }, it.e.map(([en, vi]) => h("div", { class: "vr-ex" }, h("p", { style: "margin:0" }, vrMask(en, it.w)), h("details", null, h("summary", null, "Xem câu đầy đủ"), h("p", { class: "small", style: "margin:4px 0 0" }, en, " ", h("button", { type: "button", class: "btn btn-quiet small", onclick: e => { e.stopPropagation(); vrSayText(en); } }, "🔊")), h("p", { class: "small", style: "margin:2px 0 0;opacity:.8" }, vi))))));
  return h("div", { class: "stack", style: "gap:14px" }, head,
    h("div", { class: "row", style: "justify-content:space-between" }, h("span", { class: "small muted" }, `Thẻ ${C.i + 1}/${items.length}`), h("div", { class: "row", style: "gap:6px" }, h("span", { class: "small muted" }, "Mặt trước:"), [["en", "Anh"], ["vi", "Việt"]].map(([k, t]) => h("button", { type: "button", class: "opt", "aria-pressed": String(C.front === k), onclick: () => { C.front = k; C.flip = false; render(); } }, t)))),
    h("div", { class: "meter" }, h("i", { style: `width:${C.i / items.length * 100}%` })),
    h("div", { class: "fc fc-dark vr-card", onclick: e => { if (e.target.closest("button,details,summary")) return; flip(); } }, h("span", { class: "fc-eye" }, part.title), C.flip ? back2 : front, h("span", { class: "fc-hint" }, C.flip ? "↻ Lật lại" : "↻ Bấm hoặc nhấn Space để lật thẻ")),
    h("div", { class: "fc-tools" }, h("button", { class: "fc-tool", type: "button", onclick: () => vrSay(it.w) }, "🔊 Nghe"), h("button", { class: "fc-tool", type: "button", onclick: () => { if (!VOCAB.some(x => vrKey(x.word) === vrKey(it.w))) addVocab({ word: it.w, pos: vrPos(it.p), ipa: it.ipa || "", meaning: it.vi, def: it.d, example: it.e[0][0], topic: part.title }).then(() => toast("Đã thêm vào Sổ từ vựng"), () => {}); else toast("Từ này đã có trong Sổ từ vựng"); } }, "+ Ôn tập")),
    h("div", { class: "vr-mark" }, h("button", { class: "fc-g again", type: "button", disabled: !C.flip || null, onclick: () => mark(true) }, "↺ Cần ôn", h("small", null, "phím 1")), h("button", { class: "fc-g ok", type: "button", disabled: !C.flip || null, onclick: () => mark(false) }, "✓ Đã nhớ", h("small", null, "phím 2"))),
    h("p", { class: "small muted", style: "text-align:center;margin:0" }, C.flip ? "Chọn mức độ ghi nhớ để sang thẻ tiếp theo." : "Lật thẻ trước khi đánh dấu mức độ ghi nhớ. Phím A: nghe."));
}
/* Câu hỏi bài tập cho một mục từ. pool: các mục cùng phần để lấy phương án nhiễu */
function vrQ(it, pool, kind) {
  const same = pool.filter(x => x.w !== it.w && vrKey(x.w) !== vrKey(it.w) && x.vi !== it.vi), samePos = same.filter(x => x.p === it.p);
  const pickD = n => { const src = samePos.length >= n ? samePos : same, out = []; for (const x of vrShuf(src)) { if (out.length >= n) break; if (!out.some(o => o.vi === x.vi || vrKey(o.w) === vrKey(x.w))) out.push(x); } return out; };
  const ds = pickD(3), opts = vrShuf([it, ...ds]);
  kind ||= ["vi2w", "w2vi", "fill", "hear"][Math.floor(Math.random() * 4)];
  if (kind === "fill" && !vrMask(it.e[0][0], it.w).includes("•••")) kind = "vi2w";
  if (kind === "w2vi") return { kind, it, ask: h("div", { class: "stack", style: "gap:4px;align-items:center" }, h("span", { class: "small muted" }, "Chọn nghĩa đúng"), h("span", { class: "vr-qw" }, it.w), it.ipa ? h("span", { class: "muted" }, it.ipa) : null), opts: opts.map(o => ({ t: o.vi, ok: o === it })) };
  if (kind === "fill") return { kind, it, ask: h("div", { class: "stack", style: "gap:4px;align-items:center" }, h("span", { class: "small muted" }, "Chọn từ điền vào chỗ trống"), h("p", { class: "vr-qs" }, vrMask(it.e[0][0], it.w)), h("span", { class: "small muted" }, it.e[0][1])), opts: opts.map(o => ({ t: o.w, ok: o === it })) };
  if (kind === "hear") return { kind, it, ask: h("div", { class: "stack", style: "gap:6px;align-items:center" }, h("span", { class: "small muted" }, "Nghe và chọn từ đúng"), h("button", { class: "btn btn-primary", type: "button", onclick: () => vrSay(it.w) }, "🔊 Nghe lại")), opts: opts.map(o => ({ t: o.w + " · " + o.vi, ok: o === it })), auto: true };
  return { kind: "vi2w", it, ask: h("div", { class: "stack", style: "gap:4px;align-items:center" }, h("span", { class: "small muted" }, "Chọn từ có nghĩa"), h("span", { class: "vr-qw", style: "font-size:1.6rem" }, it.vi), h("span", { class: "small muted" }, vrPos(it.p))), opts: opts.map(o => ({ t: o.w, ok: o === it })) };
}
function vrQuiz(part, data, items, v, head, back) {
  const Q = v.q ||= { round: 1, i: 0, list: vrShuf(items).map(it => vrQ(it, items.length >= 8 ? items : data)), picked: null };
  const q = Q.list[Q.i];
  if (!q) {
    const s = vrL(part.id, v.i), got = Q.round === 1 ? 3 : Q.round === 2 ? 2 : 1, first = !s.x; s.x = Math.max(s.x || 0, got);
    if (first) { award("vocab", 15); addAct("vocab", Math.max(3, Math.round(items.length / 3))); } saveProfile(); vrMarkDay();
    const nx = v.i + 1 < part.lessons ? v.i + 1 : null;
    return h("div", { class: "stack", style: "gap:14px" }, head, vrDone("Qua bài · " + "★".repeat(got), `Bạn trả lời đúng hết ${items.length} câu` + (Q.round > 1 ? ` sau ${Q.round} lượt.` : " ngay lượt đầu."), [nx != null ? h("button", { class: "btn btn-primary", type: "button", onclick: () => { UI.vr.view = { k: "cards", i: nx }; render(); } }, "Học bài tiếp →") : null, h("button", { class: "btn", type: "button", onclick: () => { UI.vr.view = { k: "dict", i: v.i }; render(); } }, "Luyện nghe viết"), h("button", { class: "btn btn-quiet", type: "button", onclick: back }, "Về lộ trình")]));
  }
  if (q.auto && !q.played) { q.played = true; setTimeout(() => vrSay(q.it.w), 150); }
  const wrong = Q.picked && !Q.picked.ok;
  const choose = o => { if (Q.picked) return; Q.picked = o; if (o.ok) { setTimeout(() => { if (UI.vr.view !== v) return; Q.i++; Q.picked = null; render(); }, 650); } render(); };
  UI.keyH = e => { if (e.target.closest("input,textarea")) return; const n = +e.key; if (n >= 1 && n <= q.opts.length) choose(q.opts[n - 1]); if (e.key === "Enter" && wrong) restart(); };
  const restart = () => { v.q = { round: Q.round + 1, i: 0, list: vrShuf(items).map(it => vrQ(it, items.length >= 8 ? items : data)), picked: null }; render(); };
  return h("div", { class: "stack", style: "gap:14px" }, head,
    h("div", { class: "row", style: "justify-content:space-between" }, h("span", { class: "small muted" }, `Câu ${Q.i + 1}/${Q.list.length}` + (Q.round > 1 ? ` · lượt ${Q.round}` : "")), h("span", { class: "small muted" }, "Sai 1 câu là làm lại từ đầu")),
    h("div", { class: "meter" }, h("i", { style: `width:${Q.i / Q.list.length * 100}%` })),
    h("section", { class: "card vr-q" }, q.ask,
      h("div", { class: "vr-opts" }, q.opts.map((o, k) => h("button", { type: "button", class: "vr-o" + (Q.picked ? (o.ok ? " right" : o === Q.picked ? " wrong" : "") : ""), disabled: Q.picked || null, onclick: () => choose(o) }, h("span", { class: "vr-k" }, k + 1), o.t))),
      wrong ? h("div", { class: "note bad stack", style: "gap:6px" }, h("span", null, h("b", null, "Sai rồi. "), `Đáp án: ${q.it.w} (${vrPos(q.it.p)}) = ${q.it.vi}.`), h("span", { class: "small" }, q.it.e[0][0]), h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: restart }, "Làm lại từ đầu"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => { UI.vr.view = { k: "cards", i: v.i }; render(); } }, "Xem lại thẻ"))) : null));
}
function vrDict(part, items, v, head, back) {
  const D = v.d ||= { i: 0, list: vrShuf(items), err: 0, typed: "", res: null };
  const it = D.list[D.i];
  if (!it) {
    const got = D.err === 0 ? 3 : D.err <= 2 ? 2 : 1, s = vrL(part.id, v.i); s.d = Math.max(s.d || 0, got); award("vocab", 5); addAct("vocab", 3); saveProfile(); vrMarkDay();
    return h("div", { class: "stack", style: "gap:14px" }, head, vrDone("Nghe viết · " + "★".repeat(got), `Sai ${D.err} lần trên ${items.length} từ.`, [h("button", { class: "btn", type: "button", onclick: () => { v.d = null; render(); } }, "Làm lại"), h("button", { class: "btn btn-primary", type: "button", onclick: back }, "Về lộ trình")]));
  }
  if (!D.played) { D.played = true; setTimeout(() => vrSay(it.w), 150); }
  const ok = t => vrKey(t).replace(/[^a-z' -]/g, "") === vrKey(it.w).replace(/[^a-z' -]/g, "");
  const check = () => { if (D.res) { D.i++; D.typed = ""; D.res = null; D.played = false; render(); return; } if (!D.typed.trim()) return; D.res = ok(D.typed) ? "ok" : "no"; if (D.res === "no") D.err++; render(); };
  const inp = h("input", { type: "text", class: "fc-input", autocomplete: "off", spellcheck: "false", placeholder: "Gõ từ vừa nghe…", value: D.typed, oninput: e => { D.typed = e.target.value; }, onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); check(); } } });
  setTimeout(() => inp.focus(), 0);
  return h("div", { class: "stack", style: "gap:14px" }, head, h("div", { class: "meter" }, h("i", { style: `width:${D.i / D.list.length * 100}%` })),
    h("section", { class: "card vr-q" }, h("span", { class: "small muted" }, `Từ ${D.i + 1}/${D.list.length} · sai ${D.err}`), h("div", { class: "row", style: "justify-content:center" }, h("button", { class: "btn btn-primary", type: "button", onclick: () => vrSay(it.w) }, "🔊 Nghe"), h("span", { class: "small muted" }, "Gợi ý: " + it.vi)),
      h("div", { class: "fc-ask" }, inp, h("button", { class: "btn btn-primary", type: "button", onclick: check }, D.res ? "Tiếp →" : "Kiểm tra")),
      D.res ? h("p", { class: "note " + (D.res === "ok" ? "" : "bad"), style: "margin:0;text-align:center" }, D.res === "ok" ? "✓ Đúng" : "✗ Đáp án: ", h("b", null, it.w), it.ipa ? " " + it.ipa : "") : null));
}
function vrPron(part, items, v, head, back) {
  const R = v.p ||= { i: 0, sc: {}, res: null }, it = items[R.i];
  if (!it) {
    const vals = Object.values(R.sc), avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, got = avg >= 85 ? 3 : avg >= 75 ? 2 : avg >= 65 ? 1 : 0, s = vrL(part.id, v.i);
    s.s = Math.max(s.s || 0, got); saveProfile();
    return h("div", { class: "stack", style: "gap:14px" }, head, vrDone("Phát âm · " + (got ? "★".repeat(got) : "chưa có sao"), `Điểm trung bình ${avg}/100. Cần từ 65 để có 1 sao, 75 có 2 sao, 85 có 3 sao.`, [h("button", { class: "btn", type: "button", onclick: () => { v.p = null; render(); } }, "Làm lại"), h("button", { class: "btn btn-primary", type: "button", onclick: back }, "Về lộ trình")]));
  }
  const judge = async (blob, say) => { await spLoad("ph"); const r = await spCheckText(blob, it.w, say); R.sc[it.w] = Math.max(R.sc[it.w] ?? 0, r.score ?? 0); R.res = r; render(); };
  return h("div", { class: "stack", style: "gap:14px" }, head, h("div", { class: "meter" }, h("i", { style: `width:${R.i / items.length * 100}%` })),
    h("section", { class: "card vr-q" }, h("span", { class: "small muted" }, `Từ ${R.i + 1}/${items.length}`), h("span", { class: "vr-qw" }, it.w), it.ipa ? h("span", { class: "muted" }, it.ipa) : null,
      h("div", { class: "row", style: "justify-content:center" }, h("button", { class: "btn", type: "button", onclick: () => vrSay(it.w) }, "🔊 Nghe mẫu")),
      spModelCard(["ph"]), spReady(["ph"]) ? recBox(judge, { max: 6, hint: "Đọc to từ này rồi bấm Dừng." }) : null,
      R.res ? resultView(R.res, { label: "Điểm" }) : null,
      h("div", { class: "row", style: "justify-content:center" }, h("button", { class: "btn" + (R.sc[it.w] != null ? " btn-primary" : ""), type: "button", onclick: () => { R.i++; R.res = null; render(); } }, R.sc[it.w] != null ? "Từ tiếp →" : "Bỏ qua →"))));
}
/* Thi vượt cấp: 25 câu bài tập + 5 câu nghe viết lấy ngẫu nhiên trong cả phần; đúng ≥ 25 mở mọi bài */
function vrExam(part, data, head, back) {
  const V = UI.vr, E = V.view.e ||= (() => { const pick = vrShuf(data).slice(0, 30); return { i: 0, ok: 0, list: pick.map((it, k) => k < 25 ? vrQ(it, data) : { kind: "dict", it }), picked: null, typed: "" }; })();
  const q = E.list[E.i], top = head(`Câu ${Math.min(E.i + 1, 30)}/30`, "Thi vượt cấp");
  if (!q) { const pass = E.ok >= 25; if (pass) { vrSt(part.id).open = true; award("vocab", 30); saveProfile(); vrMarkDay(); }
    return h("div", { class: "stack", style: "gap:14px" }, top, vrDone(pass ? "Vượt cấp thành công" : "Chưa đủ điểm", `Đúng ${E.ok}/30 câu.` + (pass ? " Mọi bài của phần này đã mở." : " Cần đúng từ 25 câu."), [h("button", { class: "btn btn-primary", type: "button", onclick: back }, "Về lộ trình"), pass ? null : h("button", { class: "btn", type: "button", onclick: () => { V.view.e = null; render(); } }, "Thi lại")])); }
  const next = () => { E.i++; E.picked = null; E.typed = ""; render(); };
  if (q.kind === "dict") {
    if (!q.played) { q.played = true; setTimeout(() => vrSay(q.it.w), 150); }
    const inp = h("input", { type: "text", class: "fc-input", autocomplete: "off", spellcheck: "false", placeholder: "Gõ từ vừa nghe…", value: E.typed, oninput: e => { E.typed = e.target.value; }, onkeydown: e => { if (e.key === "Enter") go(); } });
    const go = () => { if (E.picked) return next(); if (!E.typed.trim()) return; E.picked = vrKey(E.typed) === vrKey(q.it.w) ? "ok" : "no"; if (E.picked === "ok") E.ok++; render(); };
    setTimeout(() => inp.focus(), 0);
    return h("div", { class: "stack", style: "gap:14px" }, top, h("section", { class: "card vr-q" }, h("span", { class: "small muted" }, "Nghe viết"), h("button", { class: "btn btn-primary", type: "button", onclick: () => vrSay(q.it.w) }, "🔊 Nghe"), h("div", { class: "fc-ask" }, inp, h("button", { class: "btn btn-primary", type: "button", onclick: go }, E.picked ? "Tiếp →" : "Kiểm tra")), E.picked ? h("p", { class: "note " + (E.picked === "ok" ? "" : "bad"), style: "margin:0" }, E.picked === "ok" ? "✓ Đúng" : "✗ Đáp án: " + q.it.w) : null));
  }
  if (q.auto && !q.played) { q.played = true; setTimeout(() => vrSay(q.it.w), 150); }
  const choose = o => { if (E.picked) return; E.picked = o; if (o.ok) E.ok++; render(); setTimeout(() => { if (UI.vr.view?.e === E && E.list[E.i] === q) next(); }, o.ok ? 500 : 1300); };
  return h("div", { class: "stack", style: "gap:14px" }, top, h("div", { class: "meter" }, h("i", { style: `width:${E.i / 30 * 100}%` })),
    h("section", { class: "card vr-q" }, q.ask, h("div", { class: "vr-opts" }, q.opts.map((o, k) => h("button", { type: "button", class: "vr-o" + (E.picked ? (o.ok ? " right" : o === E.picked ? " wrong" : "") : ""), disabled: E.picked || null, onclick: () => choose(o) }, h("span", { class: "vr-k" }, k + 1), o.t)))));
}
