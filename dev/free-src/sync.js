/* ===== Đồng bộ dữ liệu giữa web riêng (claude.ai) và web ngoài: chép một mã gọn từ web này, dán vào web kia.
   Hai web không gọi thẳng được nhau (trang trên claude.ai bị chặn kết nối ra ngoài), nên dữ liệu đi qua mã nén. ===== */
const SYNC = { code: "", busy: false, msg: "", undo: null, pre: null };
const syncIsFree = () => !!window.FREE_CONFIG;
const syncAllowed = () => !syncIsFree() || !!window.__isOwner;
async function syncGz(str, dir) {
  const cs = dir === "c" ? new CompressionStream("gzip") : new DecompressionStream("gzip");
  const src = dir === "c" ? new Blob([str]).stream() : new Blob([str]).stream();
  return new Response(src.pipeThrough(cs));
}
async function syncEncode(obj) {
  const buf = new Uint8Array(await (await syncGz(JSON.stringify(obj), "c")).arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return "SLSYNC1:" + btoa(bin);
}
async function syncDecode(code) {
  const m = String(code).replace(/\s+/g, "").match(/SLSYNC1:([A-Za-z0-9+/=]+)/); if (!m) throw new Error("Không phải mã đồng bộ của Sổ luyện");
  const bin = atob(m[1]), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return JSON.parse(await (await syncGz(buf, "d")).text());
}
async function syncSnapshot() {
  const cols = {}; for (const c of COLS) cols[c] = await store.list(c).catch(() => []);
  return { v: 1, at: Date.now(), from: syncIsFree() ? "web ngoài" : "web riêng", profile: JSON.parse(JSON.stringify(P)), cols };
}
/* Gộp: số lấy giá trị lớn hơn, ngày lấy ngày mới hơn, mảng gộp không trùng, đối tượng gộp từng khóa */
function syncMerge(a, b) {
  if (a == null) return b; if (b == null) return a;
  if (Array.isArray(a) && Array.isArray(b)) { const seen = new Set(a.map(x => JSON.stringify(x))), out = a.slice(); for (const x of b) { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); out.push(x); } } return out; }
  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) { const o = { ...a }; for (const k of Object.keys(b)) o[k] = syncMerge(a[k], b[k]); return o; }
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (typeof a === "boolean" && typeof b === "boolean") return a || b;
  if (typeof a === "string" && typeof b === "string" && /^\d{4}-\d{2}-\d{2}/.test(a) && /^\d{4}-\d{2}-\d{2}/.test(b)) return a > b ? a : b;
  return a;
}
const syncStamp = d => Math.max(+d.updated || 0, +d.reviewed || 0, +d.created || 0, +d.lastSeen || 0);
const syncPick = (a, b) => { const sa = syncStamp(a), sb = syncStamp(b); if (sa !== sb) return sb > sa ? b : a; return JSON.stringify(b).length > JSON.stringify(a).length ? b : a; };
function syncCount(s) { return { vocab: s.cols.vocab?.length || 0, writings: s.cols.writings?.length || 0, readings: s.cols.readings?.length || 0, xp: s.profile?.xp || 0 }; }
async function syncApply(inc, mode) {
  SYNC.busy = true; SYNC.msg = "Đang lưu…"; render();
  try {
    const cur = await syncSnapshot(); SYNC.undo = cur;
    const prof = mode === "replace" ? inc.profile : syncMerge(cur.profile, inc.profile);
    let n = 0;
    for (const c of COLS) {
      const mine = new Map((cur.cols[c] || []).map(d => [d.id, d]));
      if (mode === "replace") for (const d of cur.cols[c] || []) if (!(inc.cols[c] || []).some(x => x.id === d.id)) await store.del(c, d.id);
      for (const d of inc.cols[c] || []) {
        const old = mine.get(d.id), use = mode === "replace" || !old ? d : syncPick(old, d);
        if (!old || JSON.stringify(old) !== JSON.stringify(use)) { const { id, ...doc } = use; await store.put(c, d.id, doc); n++; }
      }
    }
    await store.setProfile(prof); await loadAll();
    SYNC.pre = null; SYNC.msg = `Đã ${mode === "replace" ? "thay bằng" : "gộp"} dữ liệu từ ${inc.from} (${n} mục được cập nhật).`;
  } catch (e) { console.warn(e); SYNC.msg = "Chưa lưu được: " + (e?.message || e?.code || "lỗi"); }
  SYNC.busy = false; render();
}
async function syncUndo() {
  const u = SYNC.undo; if (!u) return; SYNC.undo = null; await syncApply(u, "replace"); SYNC.undo = null; SYNC.msg = "Đã hoàn tác, dữ liệu trở lại như trước khi đồng bộ."; render();
}
function syncCard() {
  if (!syncAllowed()) return null;
  const other = syncIsFree() ? "web riêng" : "web ngoài";
  const ta = h("textarea", { rows: 3, placeholder: "Dán mã đồng bộ (bắt đầu bằng SLSYNC1:) vào đây", style: "width:100%;font:12px/1.4 ui-monospace,monospace" });
  const file = h("input", { type: "file", accept: ".txt,text/plain", hidden: true, onchange: async e => { const f = e.target.files?.[0]; if (f) { ta.value = await f.text(); readIt(); } } });
  const readIt = async () => { try { const s = await syncDecode(ta.value); SYNC.pre = s; SYNC.msg = ""; } catch (e) { SYNC.pre = null; SYNC.msg = e.message || "Mã không đọc được"; } render(); };
  const make = async () => { SYNC.busy = true; SYNC.msg = "Đang tạo mã…"; render(); try { SYNC.code = await syncEncode(await syncSnapshot()); SYNC.msg = ""; } catch (e) { SYNC.msg = "Chưa tạo được mã: " + (e?.message || "lỗi"); } SYNC.busy = false; render(); };
  const copy = () => { const box = document.getElementById("sync-code"); navigator.clipboard?.writeText(SYNC.code).then(() => toast("Đã sao chép mã"), () => { box?.select(); toast("Bấm Ctrl+C để sao chép"); }); };
  const dl = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([SYNC.code], { type: "text/plain" })); a.download = "so-luyen-dong-bo-" + today() + ".txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const pre = SYNC.pre, c = pre && syncCount(pre), me = { vocab: VOCAB.length, writings: WRIT.length, readings: READS.length, xp: P.xp || 0 };
  return h("details", { class: "today-more sync-card", open: SYNC.code || SYNC.pre || SYNC.msg ? true : null },
    h("summary", null, h("b", null, "⇄ Đồng bộ với " + other), h("span", { class: "small muted" }, "Chép tiến độ, sổ từ, bài viết, bài đọc giữa hai web")),
    h("div", { class: "stack", style: "gap:12px;margin-top:10px" },
      h("div", { class: "stack", style: "gap:6px" }, h("b", null, "1. Lấy dữ liệu từ web này"),
        h("p", { class: "small muted", style: "margin:0" }, `Tạo mã rồi dán vào mục Đồng bộ ở ${other}.`),
        h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, h("button", { class: "btn", type: "button", disabled: SYNC.busy || null, onclick: make }, SYNC.code ? "Tạo lại mã" : "Tạo mã đồng bộ"),
          SYNC.code ? h("button", { class: "btn btn-primary", type: "button", onclick: copy }, "Sao chép mã") : null,
          SYNC.code && syncIsFree() ? h("button", { class: "btn", type: "button", onclick: dl }, "Tải tệp .txt") : null),
        SYNC.code ? h("textarea", { id: "sync-code", readonly: true, rows: 2, style: "width:100%;font:11px/1.3 ui-monospace,monospace", onclick: e => e.target.select() }, SYNC.code) : null,
        SYNC.code ? h("span", { class: "small muted" }, `Mã dài ${Math.round(SYNC.code.length / 1024)} KB.`) : null),
      h("div", { class: "stack", style: "gap:6px" }, h("b", null, "2. Nhận dữ liệu từ " + other),
        ta, h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" }, h("button", { class: "btn", type: "button", onclick: readIt }, "Đọc mã"), h("button", { class: "btn btn-quiet", type: "button", onclick: () => file.click() }, "Chọn tệp .txt"), file),
        pre ? h("div", { class: "note stack", style: "gap:6px" },
          h("span", null, `Mã từ ${pre.from}, tạo lúc ${new Date(pre.at).toLocaleString("vi-VN")}.`),
          h("span", { class: "small" }, `Trong mã: ${c.vocab} từ, ${c.writings} bài viết, ${c.readings} bài đọc, ${c.xp} XP. Ở đây: ${me.vocab} từ, ${me.writings} bài viết, ${me.readings} bài đọc, ${me.xp} XP.`),
          h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" },
            h("button", { class: "btn btn-primary", type: "button", disabled: SYNC.busy || null, onclick: () => syncApply(pre, "merge") }, "Gộp vào đây (khuyên dùng)"),
            h("button", { class: "btn", type: "button", disabled: SYNC.busy || null, onclick: () => { if (SYNC.sure !== 1) { SYNC.sure = 1; render(); return; } SYNC.sure = 0; syncApply(pre, "replace"); } }, SYNC.sure === 1 ? "Bấm lần nữa để thay toàn bộ" : "Thay toàn bộ")),
          h("span", { class: "small muted" }, "Gộp: giữ cả hai bên, tiến độ lấy phần cao hơn. Thay toàn bộ: dữ liệu ở đây bị thay bằng dữ liệu trong mã.")) : null),
      SYNC.msg ? h("p", { class: "small", style: "margin:0" }, SYNC.msg) : null,
      SYNC.undo && !SYNC.busy ? h("button", { class: "btn btn-quiet", type: "button", onclick: syncUndo }, "↶ Hoàn tác lần đồng bộ vừa rồi") : null));
}
(function () {
  const _pt = pageToday;
  pageToday = function () { const n = _pt(), c = syncCard(); if (c) n.append(c); return n; };
})();
