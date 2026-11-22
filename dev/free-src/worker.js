/* Cloudflare Worker: giữ key Gemini, chỉ cho người đã đăng nhập Google và có tên trong danh sách gọi AI.
   Biến cần đặt trong Settings → Variables and Secrets:
   GEMINI_KEY          (Secret) key lấy ở aistudio.google.com
   FIREBASE_PROJECT_ID (Text)   project ID của Firebase
   ALLOWED_EMAILS      (Text)   các email được dùng, cách nhau bằng dấu phẩy
   ALLOWED_ORIGIN      (Text)   địa chỉ trang web, ví dụ https://ten-ban.github.io
   Không bắt buộc, để đổi thứ tự model cho từng hạng (cách nhau bằng dấu phẩy):
   MODELS_TOP  chấm/sửa bài viết, tạo bài đọc        (mặc định: xem TIERS bên dưới)
   MODELS_MID  phần lớn việc khác
   MODELS_LITE tra từ, sổ từ vựng, phân tích câu ngắn
   Model nào hết lượt (429), quá tải (503) hoặc không tồn tại (404) thì tự chuyển sang model sau.
   Không bắt buộc, cho phần Listening: gắn KV namespace với tên biến AUDIO (Settings → Bindings → KV namespace)
   để bài nghe giọng Gemini được lưu lại và cả nhóm nghe chung, không tốn lượt lần sau.
   Không bắt buộc, cho Bảng lượt AI: RPD = giới hạn lượt mỗi ngày của từng model, lấy ở trang Rate limit của AI Studio,
   dạng "gemini-3.8-flash=250,gemini-3.5-flash-lite=1000". Model nào chưa ghi thì Worker tự học giới hạn khi Google báo hết lượt. */

const TIERS = {
  top:  "gemini-4-hydrogen,gemini-3.8-flash,gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite-preview",
  mid:  "gemini-3.8-flash,gemini-3.6-flash,gemini-3-flash-preview,gemini-2.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite-preview,gemini-4-hydrogen",
  lite: "gemini-3.5-flash-lite,gemini-3.1-flash-lite-preview,gemini-2.5-flash-lite,gemini-2.5-flash,gemini-3-flash-preview,gemini-3.6-flash,gemini-3.8-flash"
};
const MISSING = new Set(); // model không tồn tại (404), bỏ qua lần sau

let JWKS = null, JWKS_AT = 0;
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

function b64urlBytes(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function b64urlJson(s) { return JSON.parse(new TextDecoder().decode(b64urlBytes(s))); }

async function getKeys(fetchFn, fresh = false) {
  if (JWKS && !fresh && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetchFn(JWKS_URL); if (!r.ok) throw new Error("jwks " + r.status);
  JWKS = (await r.json()).keys; JWKS_AT = Date.now(); return JWKS;
}

export async function verifyIdToken(token, projectId, fetchFn = fetch, now = Date.now() / 1000) {
  const parts = String(token || "").split("."); if (parts.length !== 3) throw new Error("token format");
  const head = b64urlJson(parts[0]), pay = b64urlJson(parts[1]);
  if (head.alg !== "RS256") throw new Error("alg");
  if (pay.aud !== projectId || pay.iss !== "https://securetoken.google.com/" + projectId) throw new Error("aud/iss");
  if (!(pay.exp > now - 30) || !(pay.iat < now + 300) || !pay.sub) throw new Error("expired");
  let jwk = (await getKeys(fetchFn)).find(k => k.kid === head.kid);
  if (!jwk && Date.now() - JWKS_AT > 60e3) jwk = (await getKeys(fetchFn, true)).find(k => k.kid === head.kid); // Google vừa đổi khóa
  if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) throw new Error("signature");
  return pay;
}

function cors(env, req) {
  const o = req.headers.get("origin") || "", allow = String(env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean);
  return { "access-control-allow-origin": allow.includes(o) ? o : allow[0] || "null", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "POST, OPTIONS", "vary": "origin" };
}
const out = (env, req, status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors(env, req) } });

async function gemini(env, model, body, fetchFn) {
  return fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_KEY }, body: JSON.stringify(body)
  });
}

/* ----- Thông báo nhắc học (Web Push, không cần Firebase Messaging).
   Worker tự tạo cặp khóa VAPID lần đầu và cất trong KV, không ai phải dán khóa.
   Đẩy thông báo rỗng (không mã hóa nội dung); trình duyệt nhận xong tự hỏi /push/msg để lấy chữ hiển thị. ----- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const vnDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
async function sha(s) { return b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).slice(0, 32); }
async function vapid(env) {
  let k = await env.AUDIO.get("vapid", "json");
  if (!k) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    k = { priv: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
    await env.AUDIO.put("vapid", JSON.stringify(k));
  }
  return k;
}
async function pushSend(env, sub, msg) {
  const k = await vapid(env), aud = new URL(sub.endpoint).origin;
  await env.AUDIO.put("pmsg:" + await sha(sub.endpoint), JSON.stringify({ ...msg, at: Date.now() }), { expirationTtl: 172800 });
  const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://nguyenngogia15-coder.github.io/so-luyen/" });
  const key = await crypto.subtle.importKey("jwk", k.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = b64u(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  const r = await fetch(sub.endpoint, { method: "POST", headers: { TTL: "43200", Urgency: "high", Authorization: `vapid t=${unsigned}.${sig}, k=${k.pub}`, "content-length": "0" } });
  return r.status;
}
async function pushApi(req, env, path, b, user) {
  if (!env.AUDIO) return out(env, req, 501, { error: { code: "no_kv", message: "Worker chưa gắn KV AUDIO" } });
  const uid = user.sub;
  if (path === "/push/key") return out(env, req, 200, { key: (await vapid(env)).pub });
  if (path === "/push/sub") { if (!b.sub?.endpoint) return out(env, req, 400, { error: { code: "bad_request" } }); await env.AUDIO.put("push:" + uid, JSON.stringify({ sub: b.sub, name: String(b.name || "").slice(0, 24) })); return out(env, req, 200, { ok: true }); }
  if (path === "/push/unsub") { await env.AUDIO.delete("push:" + uid); return out(env, req, 200, { ok: true }); }
  if (path === "/push/status") { await env.AUDIO.put("pst:" + uid, JSON.stringify({ d: String(b.d || ""), left: +b.left || 0, name: String(b.name || "").slice(0, 24), miss: (Array.isArray(b.miss) ? b.miss : []).slice(0, 5).map(x => String(x).slice(0, 40)), streak: +b.streak || 0 }), { expirationTtl: 604800 }); return out(env, req, 200, { ok: true }); }
  if (path === "/push/poke") {
    const to = await env.AUDIO.get("push:" + String(b.to || ""), "json"); if (!to) return out(env, req, 200, { ok: false, reason: "chưa bật thông báo" });
    const st = await pushSend(env, to.sub, { title: `👉 ${String(b.name || "Bạn học").slice(0, 24)} chọc bạn`, body: "Làm nhiệm vụ tiếng Anh hôm nay đi, cả nhóm đang chờ!", url: "#today" });
    if (st === 404 || st === 410) await env.AUDIO.delete("push:" + b.to);
    return out(env, req, 200, { ok: st < 300 });
  }
  if (path === "/push/test") { const me = await env.AUDIO.get("push:" + uid, "json"); if (!me) return out(env, req, 200, { ok: false }); const st = await pushSend(env, me.sub, { title: "Thông báo đã bật ✓", body: "Mỗi tối 20h web sẽ nhắc nếu bạn chưa xong nhiệm vụ.", url: "#today" }); return out(env, req, 200, { ok: st < 300, status: st }); }
  return out(env, req, 404, { error: { code: "not_found" } });
}
/* Trình duyệt (service worker) hỏi chữ của thông báo vừa nhận, theo địa chỉ đăng ký của chính nó */
async function pushMsg(req, env) {
  let b = {}; try { b = await req.json(); } catch {}
  const key = "pmsg:" + await sha(String(b.endpoint || "")), m = env.AUDIO ? await env.AUDIO.get(key, "json") : null;
  if (m) await env.AUDIO.delete(key);
  return new Response(JSON.stringify(m || { title: "Sổ luyện IELTS", body: "Vào học tiếng Anh hôm nay nhé!", url: "#today" }), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
}
/* 20h tối (giờ VN): nhắc ai chưa xong nhiệm vụ, kèm tên những bạn đã xong */
async function remind(env, late) {
  if (!env.AUDIO) return; const d = vnDay(), subs = [], st = {};
  for (const k of (await env.AUDIO.list({ prefix: "push:" })).keys) subs.push([k.name.slice(5), await env.AUDIO.get(k.name, "json")]);
  for (const k of (await env.AUDIO.list({ prefix: "pst:" })).keys) st[k.name.slice(4)] = await env.AUDIO.get(k.name, "json");
  const done = Object.values(st).filter(x => x?.d === d && x.left === 0).map(x => x.name).filter(Boolean);
  for (const [uid, s] of subs) {
    const me = st[uid]; if (!s || (me?.d === d && me.left === 0)) continue;
    const today = me?.d === d, left = today ? me.left : 5, miss = today && me.miss?.length ? me.miss : [], streak = me?.streak || 0, others = done.filter(n => n !== s.name);
    const title = late ? (streak > 1 ? `🔥 Chuỗi ${streak} ngày sắp đứt!` : "⏰ Còn 3 tiếng là hết ngày") : `Còn ${left} nhiệm vụ tiếng Anh hôm nay`;
    const need = miss.length ? "Còn thiếu: " + miss.join(", ") + "." : "Bạn chưa làm nhiệm vụ nào hôm nay.";
    const tail = late ? " Làm nhanh trước 23:59 nhé!" : others.length ? ` ${others.join(", ")} đã xong rồi, đừng để cả nhóm đứt chuỗi!` : " Hạn chót 23:59.";
    const code = await pushSend(env, s.sub, { title, body: need + tail, url: "#today" });
    if (code === 404 || code === 410) await env.AUDIO.delete("push:" + uid);
  }
}

export async function handle(req, env, fetchFn = fetch) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === "/push/msg") return pushMsg(req, env);
  if (req.method !== "POST" || !(["/ai", "/tts", "/ls-pool", "/ls-al", "/yt", "/quota"].includes(url.pathname) || url.pathname.startsWith("/push/"))) return out(env, req, 404, { error: { code: "not_found" } });
  let user;
  try { user = await verifyIdToken((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""), env.FIREBASE_PROJECT_ID, fetchFn); }
  catch (e) { return out(env, req, 401, { error: { code: "not_granted", message: "Chưa đăng nhập hoặc phiên đã hết hạn (" + e.message + ")" } }); }
  const allowed = String(env.ALLOWED_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  if (!user.email || !user.email_verified || !allowed.includes(String(user.email).toLowerCase())) return out(env, req, 403, { error: { code: "not_granted", message: "Email này chưa được mời" } });

  let b; try { b = await req.json(); } catch { return out(env, req, 400, { error: { code: "bad_request" } }); }
  if (url.pathname === "/tts") return tts(req, env, b, fetchFn, user.sub);
  if (url.pathname === "/tts-has") { const pre = "ls:" + String(b.prefix || "").replace(/[^\w.-]/g, "").slice(0, 20), keys = []; let cur; if (env.AUDIO) for (let i = 0; i < 5; i++) { const r = await env.AUDIO.list({ prefix: pre, cursor: cur }); keys.push(...r.keys.map(k => k.name.slice(3))); if (r.list_complete) break; cur = r.cursor; } return out(env, req, 200, { keys }); }
  if (url.pathname === "/ls-pool") return lsPool(req, env);
  if (url.pathname === "/ls-al") return lsAlign(req, env, b);
  if (url.pathname === "/yt") return ytCaps(req, env, b, fetchFn);
  if (url.pathname === "/quota") return quota(req, env, user.sub);
  if (url.pathname.startsWith("/push/")) return pushApi(req, env, url.pathname, b, user);
  const msgs = Array.isArray(b.messages) ? b.messages : [];
  if (!msgs.length || JSON.stringify(msgs).length > 400000) return out(env, req, 400, { error: { code: "bad_request", message: "Nội dung trống hoặc quá dài" } });
  const contents = msgs.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content ?? "") }] }));
  const last = contents[contents.length - 1];
  for (const im of (b.images || []).slice(0, 8)) last.parts.unshift({ inlineData: { mimeType: im.mimeType, data: im.data } });
  const video = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(String(b.video || "")) ? b.video : null;
  if (video) last.parts.unshift({ fileData: { fileUri: video } });
  const body = { contents, generationConfig: { maxOutputTokens: 32768, ...(b.json ? { responseMimeType: "application/json" } : {}), ...(video ? { mediaResolution: "MEDIA_RESOLUTION_LOW" } : {}) } };

  const tier = b.tier === "top" || b.tier === "complex" ? "top" : b.tier === "lite" || b.tier === "quick" ? "lite" : "mid";
  const order = String(env["MODELS_" + tier.toUpperCase()] || TIERS[tier]).split(",").map(s => s.trim()).filter(m => m && !MISSING.has(m));
  let last429 = null, lastErr = null;
  for (const model of order) {
    if (await isOut(env, model)) { last429 = model + ": đã hết lượt hôm nay"; continue; }
    const r = await gemini(env, model, body, fetchFn);
    const j = await r.json().catch(() => ({}));
    await track(env, model, r.status, j, user.sub);
    if (r.ok) {
      const c = j.candidates?.[0];
      const text = (c?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
      if (!text) return out(env, req, 502, { error: { code: "empty", message: "AI không trả lời (" + (c?.finishReason || j.promptFeedback?.blockReason || "trống") + ")" } });
      return out(env, req, 200, { text, model, tier, truncated: c?.finishReason === "MAX_TOKENS" });
    }
    if (r.status === 404) MISSING.add(model);
    if (r.status === 429 || r.status === 503 || r.status === 404) { last429 = model + ": " + (j.error?.message || "hết lượt"); continue; }
    lastErr = { code: "gemini_" + r.status, message: model + ": " + (j.error?.message || "Gemini báo lỗi") };
    if (r.status === 400 && /api key|API_KEY/i.test(lastErr.message)) break;
    if (r.status >= 400 && r.status < 600) continue;
  }
  if (lastErr && /location is not supported/i.test(lastErr.message)) return out(env, req, 502, { error: { code: "geo_blocked", message: "Google không nhận yêu cầu từ máy chủ Cloudflare ở khu vực này (" + (req.cf?.colo || "?") + "). " + lastErr.message } });
  if (lastErr && !last429) return out(env, req, 502, { error: lastErr });
  return out(env, req, 429, { error: { code: "rate_limited", message: "Đã hết lượt AI miễn phí hôm nay hoặc đang gọi quá nhanh. " + (last429 || "") + (lastErr ? " | " + lastErr.message : "") } });
}

/* ----- Listening: đọc bài bằng Gemini TTS, lưu vào KV "AUDIO" để cả nhóm nghe chung.
   Âm thanh lưu dạng base64 nguyên văn (không giải mã trong Worker để tiết kiệm CPU); trình duyệt tự giải mã. ----- */
const TTS_MODELS = "gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-3.8-flash-lite-tts,gemini-2.5-flash-preview-tts";
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ttsBody(sp, turns) {
  const names = Object.keys(sp), dir = names.map(n => `${n}: ${sp[n].desc || ""}`).join("\n");
  const text = (names.length === 2
    ? `Read this IELTS listening conversation aloud as a natural, realistic recording. Speakers:\n${dir}\nAct out each speaker's emotion and attitude naturally, with realistic pacing, small pauses and reactions. Do not read the speaker names.\n\n`
    : `Read this IELTS listening talk aloud as a natural, realistic recording. Speaker: ${dir}\nSpeak at a natural pace with appropriate emphasis and pauses.\n\n`) + turns.map(t => names.length === 2 ? `${t.sp}: ${t.text}` : t.text).join("\n");
  const speechConfig = names.length === 2
    ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs: names.map(n => ({ speaker: n, voiceConfig: { prebuiltVoiceConfig: { voiceName: sp[n].voice || "Kore" } } })) } }
    : { voiceConfig: { prebuiltVoiceConfig: { voiceName: sp[names[0]].voice || "Kore" } } };
  return { contents: [{ role: "user", parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig } };
}
/* Gọi Gemini TTS, trả về {mime, b64} hoặc {limited:true} khi mọi model hết lượt */
async function ttsRender(env, sp, turns, fetchFn, uid = null, body = null, liteFirst = false) {
  body ||= ttsBody(sp, turns); let last = null;
  let models = String(env.TTS_MODELS || TTS_MODELS).split(",").map(s => s.trim()).filter(m => m && !MISSING.has(m));
  if (liteFirst) models = [...models.filter(m => /lite/.test(m)), ...models.filter(m => !/lite/.test(m))];
  for (const model of models) {
    if (await isOut(env, model)) { last = model + ": đã hết lượt hôm nay"; continue; }
    const r = await gemini(env, model, body, fetchFn);
    if (r.ok) { await track(env, model, 200, null, uid);
      const t = await r.text(); const k = t.indexOf('"data"'); if (k < 0) { last = model + ": không có âm thanh"; continue; }
      const a = t.indexOf('"', t.indexOf(":", k) + 1) + 1, e = t.indexOf('"', a);
      const mk = t.lastIndexOf('"mimeType"', k), mime = mk >= 0 ? t.slice(t.indexOf('"', t.indexOf(":", mk) + 1) + 1, t.indexOf('"', t.indexOf('"', t.indexOf(":", mk) + 1) + 1)) : "audio/wav";
      return { mime, b64: t.slice(a, e), model };
    }
    const j = await r.json().catch(() => ({}));
    await track(env, model, r.status, j, uid);
    if (r.status === 404) MISSING.add(model);
    if (r.status === 429 || r.status === 503 || r.status === 404 || r.status === 400) { last = model + ": " + (j.error?.message || r.status); continue; }
    return { error: j.error?.message || "Gemini TTS lỗi " + r.status };
  }
  return { limited: true, error: last };
}
const kvAudioKey = k => "ls:" + String(k || "").replace(/[^\w.-]/g, "").slice(0, 80);
async function tts(req, env, b, fetchFn, uid) {
  const key = b.key ? kvAudioKey(b.key) : null;
  const send = (mime, b64, hit, model) => new Response(b64, { status: 200, headers: { "content-type": "text/plain", "x-mime": mime, "x-cache": hit ? "hit" : "miss", "x-model": model || "", "access-control-expose-headers": "x-cache, x-model, x-mime", ...cors(env, req) } });
  if (key && env.AUDIO) { const hit = await env.AUDIO.getWithMetadata(key, "text"); if (hit?.value) return send(hit.metadata?.mime || "audio/wav", hit.value, true); }
  /* Mẻ câu của game và số/đánh vần: chưa có thì đọc ngay bằng model TTS bản nhẹ (nhiều lượt) */
  if (b.gen && key && /^ls:vb-(gm|nd)-/.test(key)) {
    const site = String(env.SITE_URL || (String(env.ALLOWED_ORIGIN || "").split(",")[0].trim().replace(/\/$/, "") + "/so-luyen/"));
    let plan = []; try { plan = await (await fetchFn(site + "voice/gem.json")).json(); } catch {}
    const bt = plan.find(x => kvAudioKey("vb-" + x.k) === key); if (!bt) return out(env, req, 404, { error: { code: "not_found" } });
    const r = await ttsRender(env, null, null, fetchFn, uid, gemBatchBody(bt), true);
    if (r.limited) return out(env, req, 429, { error: { code: "rate_limited" } });
    if (r.error || !r.b64) return out(env, req, 502, { error: { code: "gemini_tts", message: r.error } });
    try { await env.AUDIO.put(key, r.b64, { metadata: { mime: r.mime } }); } catch {}
    return send(r.mime, r.b64, false, r.model);
  }
  if (b.cacheOnly) return out(env, req, 404, { error: { code: "not_cached" } });
  const sp = b.speakers || {}, names = Object.keys(sp), turns = Array.isArray(b.turns) ? b.turns : [];
  if (!turns.length || names.length < 1 || names.length > 2 || JSON.stringify(turns).length > 20000) return out(env, req, 400, { error: { code: "bad_request", message: "Bài nghe trống, quá dài hoặc quá 2 người nói" } });
  const r = await ttsRender(env, sp, turns, fetchFn, uid);
  if (r.limited) return out(env, req, 429, { error: { code: "rate_limited", message: "Hết lượt giọng Gemini hôm nay. " + (r.error || "") } });
  if (r.error) return out(env, req, 502, { error: { code: "gemini_tts", message: r.error } });
  if (key && env.AUDIO) { try { await env.AUDIO.put(key, r.b64, { metadata: { mime: r.mime } }); } catch {} }
  return send(r.mime, r.b64, false, r.model);
}
/* Danh sách bài nghe mới do Worker tự soạn mỗi đêm */
async function lsPool(req, env) {
  if (!env.AUDIO) return out(env, req, 200, { items: [] });
  const l = await env.AUDIO.list({ prefix: "lsnew:", limit: 200 });
  const items = (await Promise.all(l.keys.slice(-60).map(k => env.AUDIO.get(k.name, "json").catch(() => null)))).filter(Boolean);
  return out(env, req, 200, { items });
}

/* ----- Mốc thời gian từng câu của bài nghe giọng Gemini: một người căn xong thì cả nhóm dùng chung ----- */
async function lsAlign(req, env, b) {
  if (!env.AUDIO) return out(env, req, 200, { item: null });
  const key = "al:" + String(b.get || b.put || "").replace(/[^\w.-]/g, "").slice(0, 80);
  if (key === "al:") return out(env, req, 400, { error: { code: "bad_request" } });
  if (b.get) return out(env, req, 200, { item: await env.AUDIO.get(key, "json").catch(() => null) });
  const segs = b.segs, ok = Array.isArray(segs) && segs.length > 0 && segs.length <= 300 && segs.every(x => Array.isArray(x) && x.length === 2 && x.every(v => typeof v === "number" && v >= 0 && v < 3600));
  const body = JSON.stringify({ segs, words: Array.isArray(b.words) ? b.words : undefined, at: Date.now() });
  if (!ok || body.length > 120000) return out(env, req, 400, { error: { code: "bad_request", message: "Mốc câu không hợp lệ" } });
  await env.AUDIO.put(key, body); return out(env, req, 200, { ok: true });
}
/* ----- Phụ đề YouTube (để shadowing theo video). YouTube có thể chặn máy chủ; khi đó trang tự đổi sang cách khác ----- */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
async function ytCaps(req, env, b, fetchFn) {
  const id = (String(b.id || "").match(/^[\w-]{11}$/) || [])[0]; if (!id) return out(env, req, 400, { error: { code: "bad_request" } });
  const ck = "yt2:" + id; if (env.AUDIO && !b.nocache) { const hit = await env.AUDIO.get(ck, "json").catch(() => null); if (hit) return out(env, req, 200, hit); }
  try {
    const html = await (await fetchFn(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" } })).text();
    const m = html.match(/"captionTracks":(\[.*?\])/); if (!m) return out(env, req, 404, { error: { code: "no_captions", message: /consent|sorry|captcha/i.test(html) ? "YouTube chặn máy chủ" : "Video không có phụ đề" } });
    const tracks = JSON.parse(m[1]).filter(t => /^en/.test(t.languageCode || "")), man = tracks.find(x => x.kind !== "asr"), asr = tracks.find(x => x.kind === "asr");
    if (!man && !asr) return out(env, req, 404, { error: { code: "no_captions", message: "Video không có phụ đề tiếng Anh" } });
    const grab = async t => { const j = await (await fetchFn(t.baseUrl + "&fmt=json3", { headers: { "user-agent": UA } })).json(); const cues = [];
      for (const e of j.events || []) { if (!e.segs || e.aAppend) continue; const s = e.tStartMs / 1000, text = e.segs.map(x => x.utf8 || "").join("").replace(/\n/g, " ").trim(); if (!text) continue;
        const w = e.segs.filter(x => (x.utf8 || "").trim()).map(x => [x.utf8.trim(), +(s + (x.tOffsetMs || 0) / 1000).toFixed(2)]);
        cues.push({ s: +s.toFixed(2), e: +(s + (e.dDurationMs || 0) / 1000).toFixed(2), t: text, w: w.length > 1 ? w : undefined }); }
      return cues; };
    const main = await grab(man || asr); if (!main.length) return out(env, req, 404, { error: { code: "no_captions", message: "Phụ đề trống" } });
    const res = { cues: main, asr: !man, lang: (man || asr).languageCode };
    /* Có cả hai: gửi thêm mốc từng từ của phụ đề tự động để căn câu cho đúng */
    if (man && asr) { try { const ac = await grab(asr), aw = []; for (const c of ac) (c.w || [[c.t, c.s]]).forEach(([w, t], k, arr) => aw.push([w, t, +(arr[k + 1] ? arr[k + 1][1] : c.e).toFixed(2)])); if (aw.length) res.aw = aw; } catch {} }
    /* Lời bài hát có bản quyền: không lưu lại */
    if (env.AUDIO && !b.nocache) await env.AUDIO.put(ck, JSON.stringify(res), { expirationTtl: 60 * 86400 }).catch(() => {});
    return out(env, req, 200, res);
  } catch (e) { return out(env, req, 502, { error: { code: "yt_failed", message: String(e?.message || e) } }); }
}
/* ----- Đếm lượt AI theo ngày (Google đặt lại hạn mức lúc 0 giờ giờ Thái Bình Dương) ----- */
const ptNow = () => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, resetAt: Date.now() + (86400 - (+p.hour * 3600 + +p.minute * 60 + +p.second)) * 1000 }; };
const QCACHE = { day: null, d: null, at: 0 };
async function qGet(env) { const { day } = ptNow(); if (QCACHE.day === day && Date.now() - QCACHE.at < 5000) return QCACHE.d; const d = (await env.AUDIO.get("q:" + day, "json").catch(() => null)) || { m: {}, u: {} }; Object.assign(QCACHE, { day, d, at: Date.now() }); return d; }
async function isOut(env, model) { if (!env.AUDIO) return false; const d = await qGet(env); return !!d.m[model]?.out; }
async function track(env, model, status, j, uid) {
  if (!env.AUDIO || status === 404) return;
  try {
    const { day } = ptNow(), d = await qGet(env), m = d.m[model] ||= { n: 0 };
    if (status === 200) { m.n++; if (uid) d.u[uid] = (d.u[uid] || 0) + 1; }
    else if (status === 429) {
      const v = (j?.error?.details || []).flatMap(x => x.violations || []), day1 = v.find(x => /PerDay/i.test(x.quotaId || x.quotaMetric || ""));
      if (day1) { m.out = Date.now(); if (+day1.quotaValue) m.lim = +day1.quotaValue; } else m.rpm = Date.now();
    }
    if (status !== 200) { (d.e ||= []).push({ t: Date.now(), m: model, s: status, msg: String(j?.error?.message || "").slice(0, 200), u: uid || "" }); d.e = d.e.slice(-20); }
    await env.AUDIO.put("q:" + day, JSON.stringify(d), { expirationTtl: 3 * 86400 });
  } catch {}
}
async function quota(req, env, uid) {
  const { day, resetAt } = ptNow(), d = env.AUDIO ? await qGet(env) : { m: {}, u: {} };
  const lim = Object.fromEntries(String(env.RPD || "").split(",").map(x => x.split("=").map(y => y.trim())).filter(x => x[0] && +x[1]).map(x => [x[0], +x[1]]));
  const row = m => ({ model: m, used: d.m[m]?.n || 0, lim: lim[m] || d.m[m]?.lim || null, out: !!d.m[m]?.out, busy: !!(d.m[m]?.rpm && Date.now() - d.m[m].rpm < 70000) });
  const tiers = Object.fromEntries(["top", "mid", "lite"].map(t => [t, String(env["MODELS_" + t.toUpperCase()] || TIERS[t]).split(",").map(s => s.trim()).filter(Boolean).filter(m => !MISSING.has(m)).map(row)]));
  const tts = String(env.TTS_MODELS || TTS_MODELS).split(",").map(s => s.trim()).filter(Boolean).map(row);
  const names = {}; if (env.AUDIO) for (const k of (await env.AUDIO.list({ prefix: "pst:" })).keys) { const v = await env.AUDIO.get(k.name, "json").catch(() => null); if (v?.name) names[k.name.slice(4)] = v.name; }
  const users = Object.entries(d.u || {}).map(([u, n]) => ({ name: names[u] || (u === uid ? "Bạn" : "Một bạn"), n, me: u === uid })).sort((a, b) => b.n - a.n);
  const errs = (d.e || []).slice().reverse().map(e => ({ ...e, u: undefined, who: names[e.u] || "" }));
  return out(env, req, 200, { day, resetAt, tiers, tts, users, errs, me: d.u[uid] || 0, total: Object.values(d.u).reduce((a, b) => a + b, 0), people: Object.keys(d.u).length, kv: !!env.AUDIO });
}

/* ----- Chạy tự động mỗi đêm (Cron Trigger): làm giọng Gemini cho kho bài, rồi soạn thêm bài mới ----- */
const LS_KIND = ["a conversation between two people in an everyday social context (booking, enquiry, registration)", "a monologue in an everyday social context (a guide, an announcement, a radio talk)", "a conversation between two students, or a student and a tutor, about an academic task", "a university lecture on an academic topic"];
const GV = { female: ["Aoede", "Kore", "Leda", "Sulafat", "Autonoe", "Despina"], male: ["Charon", "Puck", "Achird", "Iapetus", "Sadaltager", "Algieba"] };
function gemSpeakers(id, sp) {
  const out = {}; Object.entries(sp).forEach(([k, v], i) => { const list = GV[v.g === "female" ? "female" : "male"]; const pick = /lectur|professor|biolog|manager|officer|agent/i.test(v.name + v.mood) ? list[0] : list[(i + id.length) % list.length];
    out[k] = { voice: pick, desc: `${v.name}, a ${v.g} speaker with a ${v.acc} accent; tone: ${v.mood}.` }; });
  return out;
}
async function newSection(env, sec, fetchFn) {
  const base = (sec - 1) * 10, qtype = sec === 1 ? "one gap-fill group of 10 items (form or notes, ONE WORD AND/OR A NUMBER)" : sec === 4 ? "one gap-fill notes group of 10 items (ONE WORD ONLY)" : "5 multiple-choice items (3 options A–C) plus 5 items as matching (3–7 options) or gap-fill";
  const topics = ["travel", "health", "technology", "education", "environment", "work", "food", "sport", "housing", "history", "science", "art", "transport", "shopping", "community", "animals"];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const prompt = `Write an ORIGINAL IELTS Listening Section ${sec} for Vietnamese learners (target band 6–7): ${LS_KIND[sec - 1]}, loosely related to ${topic}. Length 320–450 words of natural spoken English with realistic features (hesitations like "um", self-corrections, one distractor that is later corrected). ${sec === 1 || sec === 3 ? "Exactly 2 speakers." : "Exactly 1 speaker."}
Questions numbered ${base + 1} to ${base + 10}: ${qtype}. STRICT RULES: every answer is stated clearly in the script and has exactly ONE correct answer; gap answers appear word-for-word in the script; questions follow the order of the script.
Speaker keys "A" and "B". For each speaker: name, g ("male"/"female"), acc ("British"/"American"/"Australian"), mood (tone and emotion for a voice actor).
Return ONLY JSON: {"title":"...","ctx":"one Vietnamese sentence describing the situation","sp":{"A":{"name":"...","g":"female","acc":"British","mood":"..."}},"turns":[["A","..."]],"qs":[{"type":"gap","ins":"...","title":"...","items":[{"n":${base + 1},"pre":"...","post":"...","a":["answer"]}]},{"type":"mcq","ins":"Choose the correct letter, A, B or C.","items":[{"n":0,"q":"...","opts":["...","...","..."],"a":"A"}]},{"type":"match","ins":"...","opts":["...","..."],"items":[{"n":0,"q":"...","a":"B"}]}]}`;
  for (const model of String(env.MODELS_MID || TIERS.mid).split(",").map(s => s.trim()).filter(m => m && !MISSING.has(m))) {
    const r = await gemini(env, model, { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 16384, responseMimeType: "application/json" } }, fetchFn);
    if (!r.ok) { if (r.status === 404) MISSING.add(model); continue; }
    const j = await r.json(); const t = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
    let d; try { d = JSON.parse(t.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")); } catch { return null; }
    const txt = (d.turns || []).map(x => x[1]).join(" ").toLowerCase(), qs = (d.qs || []).flatMap(g => (g.items || []).map(i => ({ g, i })));
    const ok = d.turns?.length && d.sp && Object.keys(d.sp).length === (sec === 1 || sec === 3 ? 2 : 1) && qs.length === 10 && qs.every(({ g, i }, k) => i.n === base + k + 1 && (g.type !== "gap" || (i.a || []).some(a => txt.includes(String(a).toLowerCase()))) && (g.type !== "mcq" || (/^[ABC]$/.test(i.a) && i.opts?.length === 3)) && (g.type !== "match" || (i.a?.charCodeAt(0) - 65 < (g.opts || []).length)));
    return ok ? { title: String(d.title || "New listening"), ctx: String(d.ctx || ""), sp: d.sp, turns: d.turns, qs: d.qs, sec } : null;
  }
  return null;
}
/* Lời nhắc cho một mẻ câu ngắn (hoặc một bản tin) */
function gemBatchBody(b) {
  const acc = b.acc === "gb" ? "British" : "American";
  const text = b.news ? `Read this short local news bulletin aloud like a friendly radio presenter, in a clear ${acc} English accent at a natural pace. Letters separated by commas are spelled out one letter at a time.\n\n${b.lines[0]}`
    : `Read each of the following lines aloud, one by one, in a clear, natural ${acc} English accent at a natural pace. After each line, stay completely silent for two full seconds before the next line. Read only the words in the lines, nothing else. Letters separated by commas are spelled out one letter at a time.\n\n` + b.lines.join("\n");
  return { contents: [{ role: "user", parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: b.v || "Kore" } } } } };
}
export async function nightly(env, fetchFn = fetch, opts = {}) {
  if (!env.AUDIO) return { note: "chưa gắn KV AUDIO" };
  const log = []; let budget = opts.budget ?? +(env.TTS_PER_RUN || 10);
  const site = String(env.SITE_URL || (String(env.ALLOWED_ORIGIN || "").split(",")[0].trim().replace(/\/$/, "") + "/so-luyen/"));
  /* 1. Kho bài thu sẵn: làm giọng Gemini cho bài chưa có */
  let bank = []; try { bank = await (await fetchFn(site + "ls-bank.json")).json(); } catch (e) { log.push("không tải được ls-bank.json"); }
  for (const s of bank) {
    if (budget <= 0) break;
    const key = kvAudioKey(s.id + "-g2"); if (await env.AUDIO.get(key, "stream").then(x => { x?.cancel?.(); return !!x; })) continue;
    const r = await ttsRender(env, s.gem, s.turns.map(([sp, text]) => ({ sp, text })), fetchFn);
    if (r.limited) { log.push("hết lượt TTS"); return { log }; }
    if (r.b64) { await env.AUDIO.put(key, r.b64, { metadata: { mime: r.mime } }); log.push("đã đọc " + s.id); budget--; await sleep(opts.gap ?? 21000); }
  }
  /* 1b. Giọng giám khảo cho phòng thi Speaking: mỗi nhóm câu hỏi đọc một lần, các câu cách nhau bằng khoảng lặng */
  let spb = []; try { spb = await (await fetchFn(site + "sp-bank.json")).json(); } catch (e) { log.push("không tải được sp-bank.json"); }
  for (const g of spb) {
    if (budget <= 0) break;
    const key = kvAudioKey("spq-" + g.id + "-v1"); if (await env.AUDIO.get(key, "stream").then(x => { x?.cancel?.(); return !!x; })) continue;
    const text = "Read the following IELTS Speaking test questions aloud as a friendly, professional British examiner, at a calm, natural pace. Read each line as a separate question and leave a clear pause of about two seconds after each line. Do not add any words.\n\n" + g.lines.join("\n\n");
    const r = await ttsRender(env, null, null, fetchFn, null, { contents: [{ role: "user", parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.EXAMINER_VOICE || "Charon" } } } } });
    if (r.limited) { log.push("hết lượt TTS"); return { log }; }
    if (r.b64) { await env.AUDIO.put(key, r.b64, { metadata: { mime: r.mime } }); log.push("giám khảo " + g.id); budget--; await sleep(opts.gap ?? 21000); }
  }
  /* 1c. Chuyển dần mọi giọng máy còn lại sang Gemini: câu mẫu phát âm và shadowing, số và đánh vần, bản tin và câu thần chú trong game.
     voice/gem.json chia sẵn thành từng mẻ (mỗi mẻ một lần gọi, các câu cách nhau khoảng lặng 2 giây, trình duyệt tự cắt) */
  let gem = []; try { gem = await (await fetchFn(site + "voice/gem.json")).json(); } catch (e) { log.push("không tải được voice/gem.json"); }
  for (const b of gem) {
    if (budget <= 0) break;
    const key = kvAudioKey("vb-" + b.k); if (await env.AUDIO.get(key, "stream").then(x => { x?.cancel?.(); return !!x; })) continue;
    const r = await ttsRender(env, null, null, fetchFn, null, gemBatchBody(b));
    if (r.limited) { log.push("hết lượt TTS"); return { log }; }
    if (r.b64) { await env.AUDIO.put(key, r.b64, { metadata: { mime: r.mime } }); log.push("mẻ giọng " + b.k); budget--; await sleep(opts.gap ?? 21000); }
  }
  /* 2. Kho đã đủ: soạn thêm bài mới, mỗi đêm tối đa NEW_PER_NIGHT bài (mặc định 4, xoay vòng Section 1–4) */
  const want = +(env.NEW_PER_NIGHT || 4), have = (await env.AUDIO.list({ prefix: "lsnew:" })).keys.length;
  for (let k = 0; k < want && budget > 0; k++) {
    const sec = ((have + k) % 4) + 1, s = await newSection(env, sec, fetchFn); if (!s) { log.push("soạn bài lỗi"); continue; }
    s.id = "n" + Date.now().toString(36) + k; s.created = Date.now(); s.gem = gemSpeakers(s.id, s.sp);
    const r = await ttsRender(env, s.gem, s.turns.map(([sp, text]) => ({ sp, text })), fetchFn);
    if (r.limited) { log.push("hết lượt TTS"); break; }
    if (!r.b64) continue;
    await env.AUDIO.put(kvAudioKey(s.id + "-g2"), r.b64, { metadata: { mime: r.mime } }); await env.AUDIO.put("lsnew:" + s.id, JSON.stringify(s));
    log.push("bài mới " + s.id + " (Section " + sec + ")"); budget--; await sleep(opts.gap ?? 21000);
  }
  return { log };
}

/* Lịch chạy lúc 13:00 UTC (20h VN) để nhắc học; các lịch khác là việc ban đêm (thu giọng đọc, soạn bài nghe) */
export default { fetch: (req, env) => handle(req, env), scheduled: (ev, env, ctx) => { const hr = new Date(ev.scheduledTime).getUTCHours(); ctx.waitUntil(hr === 13 ? remind(env) : hr === 14 ? remind(env, true) : nightly(env)); } };
