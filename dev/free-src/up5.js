/* ===== Nâng cấp đợt 5: nhiệm vụ ngày rõ hơn, bảng AI cho chủ nhóm, điền từ không cần AI, tổng kết tháng, tải trang nhanh ===== */

/* ----- 1. Nhiệm vụ ngày: ghi rõ cách tính, bấm vào là tới bài ngắn nhất ----- */
(function () {
  const nextOf = L => (L || []).find(l => !P.lessons?.[l.id]?.done);
  const FAST = {
    V: { how: "Qua 1 bài trong Lộ trình từ vựng hoặc 1 bài ngữ pháp. Từ tự thêm vào sổ không tính.", fast: () => ["1 bài Lộ trình từ vựng · khoảng 5 phút", "#vocab", () => { UI.vTab = "road"; }] },
    L: { how: "Mỗi câu nghe chép tính 1 phút, mỗi lượt Số và đánh vần 4 phút, mỗi phần Section 8 phút. Không cần làm cả đề.", fast: () => ["Nghe chép 5 câu · khoảng 5 phút", "#listen", () => { UI.lsTab = "dict"; }] },
    S: { how: "Mỗi câu shadowing tính 1 phút, 1 bài phát âm 5 phút là đủ luôn.", fast: () => ["1 bài Phát âm · khoảng 5 phút", "#speak", () => { UI.spTab = "pron"; }] },
    R: { how: "1 bài trong khóa Đọc (tính 15 phút) hoặc 1 bài đọc bất kỳ (tính 20 phút) là đủ. Không cần làm cả đề.", fast: () => { const n = nextOf(typeof RL !== "undefined" ? RL : []); return n ? ["Bài tiếp theo khóa Đọc: " + n.title, "#rl-" + n.id, null] : ["1 bài đọc ngắn", "#reading", null]; } },
    W: { how: "1 bài trong khóa Viết (tính 15 phút) là đủ. Không cần viết cả Task 1 hay Task 2.", fast: () => { const n = nextOf(typeof WL !== "undefined" ? WL : []); return n ? ["Bài tiếp theo khóa Viết: " + n.title, "#wl-" + n.id, null] : ["1 bài trong khóa Viết", "#writing", null]; } }
  };
  for (const x of DQ_T) if (FAST[x.k]) x.how = FAST[x.k].how;
  const _row = dqRow;
  dqRow = function (x, st) {
    const n = _row(x, st), f = FAST[x.k]; if (!f || (st[x.k] || 0) >= x.need) return n;
    const [label, href, go] = f.fast();
    n.setAttribute("href", href); n.onclick = () => go?.();
    n.querySelector(".stack")?.append(h("span", { class: "dq-fast small" }, "⚡ Nhanh nhất: " + label + " →"));
    return n;
  };
  document.head.append(h("style", null, ".dq-fast{color:#0b6b52;font-weight:600}"));
})();

/* ----- 2. Bảng AI: ai dùng bao nhiêu, lỗi gần đây; chip không còn hiện "≥0" khó hiểu ----- */
(function () {
  const recentErr = d => (d?.errs || []).find(e => Date.now() - e.t < 15 * 60e3 && e.s !== 429);
  quotaChip = function () {
    const d = QT.d; if (!d) { quotaLoad(); return null; }
    const s = quotaSum(d.tiers.mid), err = recentErr(d);
    const txt = s.allOut ? "Hết lượt AI" : err ? "AI đang lỗi" : s.known ? s.left + " lượt AI" : "AI sẵn sàng";
    return h("a", { class: "chip " + (s.allOut || err ? "bad" : s.known && s.left < 20 ? "warn" : "good"), href: "#quota", title: "Lượt AI hôm nay. Bấm để xem chi tiết" }, "⚡ " + txt);
  };
  const _pq = pageQuota;
  pageQuota = function () {
    const n = _pq(), d = QT.d; if (!d) return n;
    const when = t => new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const why = e => /location is not supported/i.test(e.msg) ? "Google chặn theo vùng máy chủ" : /api key/i.test(e.msg) ? "Khóa Gemini hỏng hoặc hết hạn" : e.s === 429 ? "Hết lượt hoặc gọi quá nhanh" : e.s === 503 ? "Google đang quá tải" : e.msg || "Lỗi " + e.s;
    const users = h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Ai dùng AI hôm nay"),
      d.users?.length ? h("div", { class: "qt-wrap" }, h("table", { class: "qt-tbl" }, h("thead", null, h("tr", null, h("th", null, "Thành viên"), h("th", null, "Số lượt"))),
        h("tbody", null, d.users.map(u => h("tr", null, h("td", null, u.name + (u.me ? " (bạn)" : "")), h("td", null, String(u.n))))))) : h("p", { class: "small muted", style: "margin:0" }, "Hôm nay chưa ai dùng AI."));
    const errs = h("section", { class: "card stack", style: "gap:8px" }, h("h2", null, "Lỗi AI gần đây"),
      h("p", { class: "small muted", style: "margin:0" }, "Mỗi khi Google từ chối một model, Worker ghi lại ở đây. Nếu cả loạt đều cùng một lý do, đó là chỗ cần sửa."),
      d.errs?.length ? h("div", { class: "qt-wrap" }, h("table", { class: "qt-tbl" }, h("thead", null, h("tr", null, h("th", null, "Lúc"), h("th", null, "Model"), h("th", null, "Lý do"), h("th", null, "Ai gặp"))),
        h("tbody", null, d.errs.map(e => h("tr", null, h("td", null, when(e.t)), h("td", null, h("code", null, e.m)), h("td", null, h("b", null, why(e)), e.msg && why(e) !== e.msg ? h("div", { class: "small muted" }, e.msg) : null), h("td", null, e.who || "–")))))) :
        d.errs ? h("p", { class: "small muted", style: "margin:0" }, "Hôm nay chưa có lỗi nào.") : h("p", { class: "note warn small", style: "margin:0" }, "Worker chưa ghi lỗi. Cần dán bản Worker mới."));
    const box = n.querySelector(".card"); box ? box.after(users, errs) : n.append(users, errs);
    return n;
  };
})();

/* ----- 3. Điền từ mới bằng từ điển có sẵn (4500 từ CEFR và 25 chủ đề IELTS), không tốn lượt AI ----- */
const DICT = {};
const DICT_TOPIC = { cities: "Thành phố", crime: "Tội phạm", culture: "Văn hóa", economy: "Kinh tế", education: "Giáo dục", energy: "Năng lượng", environment: "Môi trường", equality: "Bình đẳng", family: "Gia đình", finance: "Tài chính", food: "Ẩm thực", globalisation: "Toàn cầu hóa", government: "Chính phủ", health: "Sức khỏe", housing: "Nhà ở", language: "Ngôn ngữ", media: "Truyền thông", oceans: "Biển và nước", population: "Dân số", science: "Khoa học", sport: "Thể thao", technology: "Công nghệ", tourism: "Du lịch", transport: "Giao thông", work: "Công việc" };
async function dictLook(w) {
  const k = w.trim().toLowerCase(), c = /^[a-z]/.test(k) ? k[0] : "_";
  const shard = await (DICT[c] ||= fetch("vr/dict/" + c + ".json").then(r => r.ok ? r.json() : {}).catch(() => { delete DICT[c]; return {}; }));
  return shard[k] || null;
}
(function () {
  const POS = { noun: "n", verb: "v", adjective: "adj", adverb: "adv", phrase: "phr", "phrasal verb": "phr", idiom: "phr", preposition: "prep", conjunction: "conj" };
  const _af = addForm;
  addForm = function () {
    const n = _af(), old = [...n.querySelectorAll("button")].find(b => /điền giúp/.test(b.textContent)); if (!old) return n;
    const val = id => n.querySelector("#va-" + id);
    const out = h("p", { class: "small muted", style: "margin:0" });
    const btn = h("button", { class: "btn", type: "button", onclick: async () => {
      const w = val("word")?.value.trim(); if (!w) { val("word")?.focus(); return; }
      btn.disabled = true; out.textContent = "Đang tra từ điển…";
      const e = await dictLook(w).catch(() => null);
      if (e) {
        const set = (id, v) => { const i = val(id); if (i && !i.value && v) i.value = v; };
        set("pos", POS[e[0]] || e[0]); set("ipa", e[1]); set("meaning", e[2]); set("example", e[3]); set("topic", e[4] ? DICT_TOPIC[e[4]] || "" : "");
        out.textContent = "Đã điền từ từ điển có sẵn (không tốn lượt AI).";
      }
      const empty = ["pos", "ipa", "stress", "meaning", "def", "example"].some(id => val(id) && !val(id).value);
      if (empty && !old.disabled) {
        out.textContent = (e ? "Đã điền từ từ điển. " : "") + "AI đang điền nốt phần còn trống…";
        old.click();
        const watch = new MutationObserver(() => { const bad = n.querySelector(".note.bad"); if (bad && e) { bad.textContent = "AI đang bận nên phần trọng âm và định nghĩa chưa có, các phần khác đã điền từ từ điển. Bạn có thể thêm từ luôn."; bad.classList.replace("bad", "warn"); } });
        watch.observe(n, { subtree: true, childList: true }); setTimeout(() => watch.disconnect(), 60e3);
        setTimeout(() => { if (/AI đang điền/.test(out.textContent)) out.textContent = ""; }, 4000);
      } else if (!e) out.textContent = "Từ này không có trong từ điển sẵn và AI chưa dùng được. Bạn tự điền nghĩa nhé.";
      btn.disabled = false;
    } }, "Điền giúp");
    old.hidden = true; old.after(btn); btn.parentElement.after(out);
    return n;
  };
})();

/* ----- 4. Tổng kết tháng: số ngày đủ nhiệm vụ, phút học, XP, chuỗi, thành tựu, band thi thử; tải thành ảnh để khoe ----- */
function msOf(m) {
  const q = fq(), days = Object.keys(q.days).filter(d => d.startsWith(m)), full = days.filter(d => q.days[d] === 1).length;
  let min = 0, xp = 0; const sk = { L: 0, S: 0, R: 0, W: 0 };
  for (const [d, lg] of Object.entries(P.log || {})) if (d.startsWith(m)) { min += lg.min || 0; const s = dqSkOf(lg); for (const k in sk) sk[k] += s[k] || 0; }
  for (const [d, o] of Object.entries(P.xpDay || {})) if (d.startsWith(m)) xp += Object.values(o).reduce((a, b) => a + b, 0);
  let best = 0, run = 0; const [y, mo] = m.split("-").map(Number), nd = new Date(y, mo, 0).getDate();
  for (let i = 1; i <= nd; i++) { const d = m + "-" + String(i).padStart(2, "0"); if (q.days[d]) { run++; best = Math.max(best, run); } else run = 0; }
  const ach = Object.entries(q.ach).filter(([, d]) => String(d).startsWith(m)).map(([id]) => ACH.find(a => a[0] === id)).filter(Boolean);
  const words = (typeof VOCAB !== "undefined" ? VOCAB : []).filter(v => v.created && new Date(v.created).toLocaleDateString("en-CA").startsWith(m)).length;
  const mm = P.mm?.[m];
  return { m, full, nd, min: Math.round(min), xp, best, sk, ach, words, band: mm?.ov ?? null, mmN: mm?.n || 0, lv: levelOf(P.xp || 0).L };
}
function msDraw(s) {
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const F = (w, px) => `${w} ${px}px ${font}`;
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#111"; g.fillRect(0, 0, W, 300);
  g.fillStyle = "#ffd43b"; g.font = F(700, 34); g.fillText("SỔ LUYỆN IELTS · TỔNG KẾT", 70, 100);
  g.fillStyle = "#fff"; g.font = F(800, 92); g.fillText("Tháng " + +s.m.slice(5) + "/" + s.m.slice(0, 4), 70, 210);
  g.font = F(500, 34); g.fillStyle = "#cfcfcf"; g.fillText((P.me?.name || window.__grp?.dname || "Bạn học") + " · Level " + s.lv, 70, 265);
  const box = (x, y, w, h0, big, label, col) => { g.fillStyle = "#fff"; g.fillRect(x, y, w, h0); g.strokeStyle = "#111"; g.lineWidth = 5; g.strokeRect(x, y, w, h0);
    g.fillStyle = col || "#111"; g.font = F(800, 76); g.fillText(big, x + 34, y + 110); g.fillStyle = "#555"; g.font = F(500, 30); g.fillText(label, x + 34, y + 160); };
  const bw = (W - 70 * 2 - 30) / 2;
  box(70, 350, bw, 200, s.full + "/" + s.nd, "ngày làm đủ nhiệm vụ", "#0e8a6a");
  box(70 + bw + 30, 350, bw, 200, String(s.best), "chuỗi dài nhất (ngày)", "#e8590c");
  box(70, 580, bw, 200, (s.min >= 60 ? Math.floor(s.min / 60) + "h" + String(s.min % 60).padStart(2, "0") : s.min + "'"), "tổng thời gian học");
  box(70 + bw + 30, 580, bw, 200, "+" + s.xp, "XP kiếm được", "#6b4fd8");
  g.fillStyle = "#111"; g.font = F(700, 36); g.fillText("Phút theo kỹ năng", 70, 860);
  const names = { L: "Nghe", S: "Nói", R: "Đọc", W: "Viết" }, maxv = Math.max(1, ...Object.values(s.sk));
  Object.entries(s.sk).forEach(([k, v], i) => { const y = 900 + i * 62; g.font = F(600, 30); g.fillStyle = "#111"; g.fillText(names[k], 70, y + 32);
    g.fillStyle = "#ddd8cc"; g.fillRect(220, y + 6, 640, 34); g.fillStyle = ["#1c7ed6", "#e8590c", "#0e8a6a", "#ae3ec9"][i]; g.fillRect(220, y + 6, 640 * v / maxv, 34);
    g.fillStyle = "#111"; g.fillText(Math.round(v) + "'", 880, y + 32); });
  g.font = F(600, 32); g.fillStyle = "#111";
  g.fillText(`📚 ${s.words} từ mới   🏆 ${s.ach.length} thành tựu   🎯 ${s.band != null ? "Band thi thử " + s.band.toFixed(1) : s.mmN + "/4 phần thi thử"}`, 70, 1190);
  g.font = F(500, 28); g.fillStyle = "#555"; g.fillText(s.ach.slice(0, 4).map(a => a[1] + " " + a[2]).join("   ").slice(0, 70), 70, 1245);
  return c;
}
function msCard() {
  const cur = mmMonth(), prev = mmMonth(addDays(cur + "-01", -1)), pick = UI.msM || (+today().slice(8) <= 5 ? prev : cur), s = msOf(pick);
  const dl = () => msDraw(s).toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `tong-ket-${s.m}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  const st = (v, l) => h("div", { class: "ms-st" }, h("b", null, v), h("span", { class: "small muted" }, l));
  return h("section", { class: "card stack ms-card", style: "gap:12px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px" }, h("h2", { style: "margin:0" }, "Tổng kết " + mmName(pick)),
      h("div", { class: "row", style: "gap:6px" }, [prev, cur].map(m => h("button", { class: "opt", type: "button", "aria-pressed": String(m === pick), onclick: () => { UI.msM = m; render(); } }, "T" + +m.slice(5))))),
    h("div", { class: "ms-grid" }, st(s.full + "/" + s.nd, "ngày đủ nhiệm vụ"), st(s.best, "chuỗi dài nhất"), st(s.min >= 60 ? Math.floor(s.min / 60) + "h" + String(s.min % 60).padStart(2, "0") : s.min + " phút", "thời gian học"), st("+" + s.xp, "XP"), st(s.words, "từ mới"), st(s.ach.length, "thành tựu mở")),
    s.ach.length ? h("div", { class: "row small", style: "gap:10px;flex-wrap:wrap" }, s.ach.map(a => h("span", null, a[1] + " " + a[2]))) : null,
    h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "button", onclick: dl }, "⬇ Tải ảnh tổng kết"), h("span", { class: "small muted" }, "Ảnh dọc để đăng story hoặc gửi nhóm.")));
}
(function () {
  const _pp = pagePlan; pagePlan = function () { const n = _pp(), mm = n.querySelector(".mm-card"); const c = msCard(); mm ? mm.after(c) : n.append(c); return n; };
  document.head.append(h("style", null, ".ms-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media (max-width:600px){.ms-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.ms-st{border:2px solid var(--line);padding:10px;display:flex;flex-direction:column;gap:2px;min-width:0}.ms-st b{font-size:1.5rem}"));
})();

/* ----- 5. Tải trang nhanh: máy tự giữ một bản web, lần sau mở ngay; có bản mới thì báo để tải lại ----- */
(function () {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  navigator.serviceWorker.addEventListener("message", e => {
    if (e.data?.type !== "sl-update" || document.getElementById("sl-upd")) return;
    document.body.append(h("div", { id: "sl-upd", role: "status" }, h("span", null, "Có bản web mới."), h("button", { class: "btn btn-primary", type: "button", onclick: () => location.reload() }, "Tải lại"), h("button", { class: "btn btn-quiet", type: "button", onclick: e2 => e2.target.parentElement.remove() }, "Để sau")));
  });
  navigator.serviceWorker.register("sw.js").catch(() => {});
  document.head.append(h("style", null, "#sl-upd{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;background:var(--surface);border:2px solid var(--edge,#111);box-shadow:4px 4px 0 var(--edge,#111);padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 32px)}@media (max-width:819px){#sl-upd{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}"));
})();
