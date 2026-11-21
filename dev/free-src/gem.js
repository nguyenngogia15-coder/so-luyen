/* ===== Giọng Gemini cho mọi câu mẫu: Worker thu dần mỗi đêm theo từng mẻ (voice/gem.json). Mẻ nào đã có thì web dùng giọng Gemini,
   cắt mẻ thành từng câu theo khoảng lặng; chưa có thì vẫn dùng giọng máy thu sẵn như cũ. Mẻ đã tải được nhớ trong trình duyệt. ===== */
const GEMV = { plan: null, map: {}, batches: {}, miss: {} };
function gemPlan() {
  return GEMV.plan ||= fetch("voice/gem.json").then(r => { if (!r.ok) throw 0; return r.json(); }).then(B => { for (const b of B) b.ids.forEach((id, i) => { GEMV.map[b.p + ":" + id] = [b, i]; }); return B; }).catch(() => { GEMV.plan = null; return []; });
}
function gemWav(f) {
  const n = f.length, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, 16000, true); d.setUint32(28, 32000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f[i])) * 32767, true);
  return new Blob([buf], { type: "audio/wav" });
}
/* Cắt mẻ thành n câu: lấy n-1 khoảng lặng dài nhất nằm giữa các đoạn có tiếng */
function gemSplit(a, n) {
  const hop = 160, fr = []; for (let i = 0; i + hop <= a.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += a[j] * a[j]; fr.push(Math.sqrt(s / hop)); }
  const so = fr.slice().sort((x, y) => x - y), noise = so[Math.floor(so.length * 0.1)] || 0, peak = so[Math.floor(so.length * 0.95)] || 0, thr = Math.max(noise * 3, peak * 0.04, 0.003);
  const v = fr.map(x => x > thr), first = v.indexOf(true), last = v.lastIndexOf(true); if (first < 0) return null;
  const runs = []; let st = -1;
  for (let i = first; i <= last; i++) { if (!v[i]) { if (st < 0) st = i; } else if (st >= 0) { if (i - st >= 45) runs.push([st, i]); st = -1; } }
  if (runs.length < n - 1) return null;
  const cut = runs.sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).slice(0, n - 1).sort((x, y) => x[0] - y[0]);
  const segs = []; let s = first;
  for (const [a0, b0] of cut) { segs.push([s, a0]); s = b0; } segs.push([s, last + 1]);
  return segs.map(([x, y]) => [Math.max(0, (x - 12) * hop), Math.min(a.length, (y + 15) * hop)]);
}
/* Câu của game, số và đánh vần: chưa có giọng Gemini thì nhờ Worker đọc ngay bằng model bản nhẹ (chạy nền, lần sau là có) */
const GEM_GEN = {};
function gemGen(b) {
  if (!/^(gm|nd)$/.test(b.p) || GEM_GEN[b.k] || !window.__tts) return; GEM_GEN[b.k] = 1; GEM_Q.push(b); gemRun();
}
/* Đọc lần lượt từng mẻ, cách nhau vài giây, để không vượt giới hạn lượt mỗi phút */
const GEM_Q = []; let gemRunning = false;
async function gemRun() {
  if (gemRunning) return; gemRunning = true;
  while (GEM_Q.length) {
    const b = GEM_Q.shift();
    try { const blob = await window.__tts({ key: "vb-" + b.k, gen: true }); try { await (await caches.open("gem-v1")).put(new URL("__gem/" + b.k, location.href).href, new Response(blob, { headers: { "content-type": "audio/wav" } })); } catch {} delete GEMV.miss[b.k]; delete GEMV.batches[b.k]; }
    catch (e) { if (e?.code === "rate_limited") { GEM_Q.length = 0; break; } }
    await new Promise(r => setTimeout(r, 6500));
  }
  gemRunning = false;
}
/* Đọc trước các mẻ của game khi mở game */
async function gemWarm(pack) { const B = await gemPlan(); for (const b of B.filter(x => x.p === pack)) gemBatch(b); }
function gemBatch(b) {
  if (GEMV.miss[b.k] && Date.now() - GEMV.miss[b.k] < 1800e3) return Promise.resolve(null);
  return GEMV.batches[b.k] ||= (async () => {
    const url = new URL("__gem/" + b.k, location.href).href; let blob = null;
    try { const hit = await (await caches.open("gem-v1")).match(url); if (hit) blob = await hit.blob(); } catch {}
    if (!blob) {
      if (!window.__tts) throw 0;
      try { blob = await window.__tts({ key: "vb-" + b.k, cacheOnly: true }); }
      catch (e) { gemGen(b); throw e; }
      try { await (await caches.open("gem-v1")).put(url, new Response(blob, { headers: { "content-type": "audio/wav" } })); } catch {}
    }
    const a = await spDecode(blob), segs = b.ids.length === 1 ? [[0, a.length]] : gemSplit(a, b.ids.length);
    if (!segs) throw 0;
    return segs.map(([s, e]) => gemWav(spTrim(a.subarray(s, e))));
  })().catch(() => { GEMV.miss[b.k] = Date.now(); delete GEMV.batches[b.k]; return null; });
}
async function gemClip(pack, id) {
  await gemPlan(); const m = GEMV.map[pack + ":" + id]; if (!m) return null;
  const clips = await gemBatch(m[0]); return clips?.[m[1]] || null;
}
function gemPlayBlob(blob, rate = 1) {
  alStop(); try { SPV.audio?.pause(); speechSynthesis.cancel(); } catch {}
  const url = URL.createObjectURL(blob), a = new Audio(url); a.playbackRate = rate; try { a.preservesPitch = true; } catch {}
  AL_PLAY.a = a; AL_PLAY.url = url; return a.play().then(() => a);
}
(function () {
  const _say = spSay;
  spSay = async function (text, rate) { const g = await gemClip("sp", spvKey(text)).catch(() => null); if (g) { const a = await gemPlayBlob(g, rate || 1).catch(() => null); if (a) return new Promise(r => { a.onended = () => r(); }); } return _say(text, rate); };
  const _nd = ndPlay;
  ndPlay = async function (it, rate = 1) { const g = await gemClip("nd", it.id).catch(() => null); if (g) { const a = await gemPlayBlob(g, rate).catch(() => null); if (a) return a; } return _nd(it, rate); };
  const _gm = gmAudio;
  gmAudio = async function (key, rate = 1) { const g = await gemClip("gm", key).catch(() => null); if (g) { const a = await gemPlayBlob(g, rate).catch(() => null); if (a) return new Promise(r => { a.onended = () => r(); }); } return _gm(key, rate); };
})();
