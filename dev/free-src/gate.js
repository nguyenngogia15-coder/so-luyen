/* Lớp đăng nhập Google + thay thế phần "claude.use" của claude.ai bằng Firebase (lưu dữ liệu) và Worker (gọi Gemini). */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CFG = window.FREE_CONFIG || {};
const gate = document.getElementById("gate");
const gMsg = document.getElementById("gate-msg");
const gBtn = document.getElementById("gate-login");
const gOut = document.getElementById("gate-out");
const show = (msg, { login = false, out = false } = {}) => { gate.hidden = false; gMsg.textContent = msg; gBtn.hidden = !login; gOut.hidden = !out; };

if (!CFG.firebase || /DAN_VAO_DAY/.test(JSON.stringify(CFG))) {
  show("Chưa cấu hình: mở file config.js và dán firebaseConfig cùng địa chỉ Worker.");
} else {
  const app = initializeApp(CFG.firebase);
  const auth = getAuth(app);
  const fs = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  gBtn.onclick = async () => {
    gBtn.disabled = true;
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment") await signInWithRedirect(auth, provider);
      else show("Đăng nhập chưa được (" + (e?.code || e?.message || "lỗi") + "). Thử lại.", { login: true });
    } finally { gBtn.disabled = false; }
  };
  gOut.onclick = () => signOut(auth).then(() => location.reload());

  const fsErr = e => { const c = String(e?.code || "error").replace(/-/g, "_"); return { code: c === "permission_denied" ? "not_granted" : c, message: e?.message }; };
  const wrap = fn => async (...a) => { try { return await fn(...a); } catch (e) { throw fsErr(e); } };
  const mkDoc = path => ({
    get: wrap(async () => { const s = await getDoc(doc(fs, path)); return { exists: s.exists(), id: s.id, data: () => s.data() }; }),
    set: wrap(d => setDoc(doc(fs, path), d)),
    delete: wrap(() => deleteDoc(doc(fs, path))),
    collection: c => mkCol(path + "/" + c)
  });
  const mkCol = path => ({
    get: wrap(async () => { const s = await getDocs(collection(fs, path)); return { docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }; }),
    doc: id => mkDoc(path + "/" + id)
  });

  /* Chọn hạng model theo việc: top = chấm/sửa bài viết, tạo bài đọc; lite = tra từ, sổ từ vựng, phân tích câu ngắn; còn lại = mid */
  const TOP = /giám khảo IELTS Writing|giám khảo IELTS Speaking|bài đọc luyện IELTS Academic Reading GỐC|Viết một bài đọc IELTS Academic GỐC|Bạn soạn bài luyện IELTS Reading|sửa bài cho một sinh viên|bài gần nhất của một học sinh/;
  const LITE = /Tra nghĩa từ|vocabulary notebook|^Từ\/cụm tiếng Anh|ghi chép từ vựng|flashcards|Chọn 12 từ|Phân tích câu|paraphrase|You classify grammar|Giải thích ngắn|nâng cấp từ vựng|Sổ từ vựng IELTS/;
  const pickTier = (input, opts) => {
    if (opts.modelTier === "complex") return "top";
    if (opts.modelTier === "quick") return "lite";
    const full = typeof input === "string" ? input : input.map(m => m.content).join("\n"), t = full.slice(0, 800);
    if (TOP.test(t)) {
      /* Bài chữa ngắn (vài câu trong bài ngữ pháp, một đoạn trong khóa Viết) không cần model mạnh nhất; bài dài từ 150 từ mới dùng hạng top */
      if (/sửa bài cho một sinh viên/.test(t)) { const m = full.match(/"""([\s\S]*?)"""/); if (m && m[1].trim().split(/\s+/).length < 150) return "mid"; }
      return "top";
    }
    return LITE.test(t) ? "lite" : "mid";
  };
  window.__pickTier = pickTier;

  const blobB64 = b => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = bad; r.readAsDataURL(b); });
  async function callAI(input, opts = {}, json = false) {
    const user = auth.currentUser; if (!user) throw { code: "not_granted" };
    const msgs = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const images = [];
    for (const b of opts.images || []) images.push({ mimeType: b.type || "image/jpeg", data: await blobB64(b) });
    let r;
    try {
      r = await fetch(CFG.workerUrl.replace(/\/$/, "") + "/ai", {
        method: "POST", signal: opts.signal,
        headers: { "content-type": "application/json", authorization: "Bearer " + await user.getIdToken() },
        body: JSON.stringify({ messages: msgs, json, tier: pickTier(input, opts), images, ...(opts.video ? { video: opts.video } : {}) })
      });
    } catch (e) { if (e?.name === "AbortError") throw { code: "cancelled" }; throw { code: "network", message: String(e) }; }
    const out = await r.json().catch(() => ({ error: { code: "bad_response" } }));
    if (!r.ok || out.error) throw { code: out.error?.code || "http_" + r.status, message: out.error?.message };
    const text = out.text || "";
    if (opts.onText) try { opts.onText({ text, delta: text }); } catch {}
    if (!json) return { text, truncated: !!out.truncated };
    const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(t); }
    catch { const m = t.match(/[\[{][\s\S]*[\]}]/); if (m) try { return JSON.parse(m[0]); } catch {} throw { code: "bad_json", message: "AI trả về không đúng dạng JSON" }; }
  }
  /* Giọng Gemini cho bài nghe: trả về Blob audio/wav hoặc ném {code} */
  window.__tts = async (body, signal) => {
    const user = auth.currentUser; if (!user) throw { code: "not_granted" };
    let r;
    try { r = await fetch(CFG.workerUrl.replace(/\/$/, "") + "/tts", { method: "POST", signal, headers: { "content-type": "application/json", authorization: "Bearer " + await user.getIdToken() }, body: JSON.stringify(body) }); }
    catch (e) { if (e?.name === "AbortError") throw { code: "cancelled" }; throw { code: "network", message: String(e) }; }
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw { code: j.error?.code || "http_" + r.status, message: j.error?.message }; }
    const b64 = await r.text(), mime = r.headers.get("x-mime") || "audio/wav";
    const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    let blob;
    if (/wav/i.test(mime) || (u[0] === 82 && u[1] === 73)) blob = new Blob([u], { type: "audio/wav" });
    else { const rate = +(/rate=(\d+)/.exec(mime)?.[1] || 24000), hd = new DataView(new ArrayBuffer(44)), w = (o, s) => { for (let i = 0; i < s.length; i++) hd.setUint8(o + i, s.charCodeAt(i)); };
      w(0, "RIFF"); hd.setUint32(4, 36 + u.length, true); w(8, "WAVE"); w(12, "fmt "); hd.setUint32(16, 16, true); hd.setUint16(20, 1, true); hd.setUint16(22, 1, true); hd.setUint32(24, rate, true); hd.setUint32(28, rate * 2, true); hd.setUint16(32, 2, true); hd.setUint16(34, 16, true); w(36, "data"); hd.setUint32(40, u.length, true);
      blob = new Blob([hd.buffer, u], { type: "audio/wav" }); }
    blob.cached = r.headers.get("x-cache") === "hit"; blob.model = r.headers.get("x-model"); return blob;
  };
  window.__lsPool = async () => {
    const user = auth.currentUser; if (!user) return [];
    const r = await fetch(CFG.workerUrl.replace(/\/$/, "") + "/ls-pool", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + await user.getIdToken() }, body: "{}" });
    if (!r.ok) return []; return (await r.json()).items || [];
  };
  /* Gọi Worker với JSON, trả về JSON (dùng cho mốc câu chung, phụ đề YouTube, bảng lượt AI) */
  const post = async (path, body) => {
    const user = auth.currentUser; if (!user) throw { code: "not_granted" };
    const r = await fetch(CFG.workerUrl.replace(/\/$/, "") + path, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + await user.getIdToken() }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw { code: j.error?.code || "http_" + r.status, message: j.error?.message }; return j;
  };
  window.__alShare = async b => { const j = await post("/ls-al", b); return b.get ? j.item || null : j; };
  window.__yt = id => post("/yt", { id });
  window.__gemHas = prefix => post("/tts-has", { prefix });
  /* Thông báo nhắc học */
  window.__push = { key: () => post("/push/key"), sub: (sub, name) => post("/push/sub", { sub, name }), unsub: () => post("/push/unsub"), status: b => post("/push/status", b), poke: (to, name) => post("/push/poke", { to, name }), test: () => post("/push/test") };
  window.__quota = () => post("/quota", {});
  const sample = (input, opts) => callAI(input, opts, false);
  sample.json = (input, opts) => callAI(input, opts, true);
  sample.limits = async () => ({ images: true });

  function acctBar(user) {
    const tb = document.querySelector(".topbar-in"); if (!tb || document.getElementById("acct")) return;
    const box = document.createElement("div"); box.id = "acct";
    const who = document.createElement("span"); who.className = "acct-who"; who.textContent = user.email;
    const b = document.createElement("button"); b.type = "button"; b.className = "acct-out"; b.textContent = "Đăng xuất";
    b.onclick = () => signOut(auth).then(() => location.reload());
    box.append(who, b); tb.append(box);
  }

  let started = false;
  onAuthStateChanged(auth, async user => {
    if (!user) { show("Đăng nhập bằng tài khoản Google đã được mời để vào học.", { login: true }); return; }
    if (started) return;
    show("Đang mở sổ của " + user.email + "…");
    try { await getDoc(doc(fs, "data/users/" + user.uid + "/profile")); }
    catch (e) {
      if (e?.code === "permission-denied") { show("Tài khoản " + user.email + " chưa được mời vào trang này. Nhờ chủ trang thêm email của bạn, hoặc đăng xuất để chọn tài khoản khác.", { out: true }); return; }
      show("Chưa kết nối được nơi lưu dữ liệu (" + (e?.code || e?.message) + "). Kiểm tra mạng rồi tải lại trang.", { out: true }); return;
    }
    started = true;
    /* Nút đồng bộ với web riêng chỉ hiện cho tài khoản chủ trang (so bằng mã băm, không để lộ email trong mã nguồn) */
    try { const hb = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(user.email || "").toLowerCase())); window.__isOwner = [...new Uint8Array(hb)].map(b => b.toString(16).padStart(2, "0")).join("") === "ac659011536510d5edf2a23f4a961be12a2d0d7c28a3fe70a4673c9fd7be6a85"; } catch { window.__isOwner = false; }
    /* Nhóm học: mỗi người ghi bản tóm tắt của mình vào group/{uid}, ai trong nhóm cũng đọc được */
    window.__grp = {
      uid: user.uid, dname: user.displayName || "", photo: user.photoURL || "",
      put: d => setDoc(doc(fs, "group/" + user.uid), d),
      watch: (cb, err) => onSnapshot(collection(fs, "group"), s => cb(s.docs.map(x => ({ ...x.data(), id: x.id }))), e => err?.(e)),
      poke: (to, name) => setDoc(doc(fs, "group/" + to + "/pokes/" + user.uid + "_" + Date.now()), { from: user.uid, name, at: Date.now() }),
      pokes: cb => onSnapshot(collection(fs, "group/" + user.uid + "/pokes"), s => cb(s.docs.map(x => ({ ...x.data(), id: x.id }))), () => {}),
      clear: id => deleteDoc(doc(fs, "group/" + user.uid + "/pokes/" + id)),
      getCfg: () => getDoc(doc(fs, "cfg/reset")).then(s => s.exists() ? s.data() : null),
      setCfg: d => setDoc(doc(fs, "cfg/reset"), d)
    };
    window.claude = { use: async n => n === "db" ? { doc: mkDoc } : n === "user" ? { id: async () => user.uid, isOwner: () => true, canEdit: () => true } : n === "sample" ? sample : null };
    gate.hidden = true;
    window.__bootApp?.();
    setTimeout(() => acctBar(user), 0);
  });
}
