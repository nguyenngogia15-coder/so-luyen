/* ===== Cài web như app và thông báo nhắc học: 20h tối nhắc nếu chưa xong nhiệm vụ, lời chọc của bạn đến thẳng điện thoại ===== */
const PU = { installEvt: null, busy: false, msg: "" };
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); PU.installEvt = e; });
const puSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const puIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const puStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const puKey = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const puName = () => (P.me?.name || window.__grp?.dname || "Bạn học").slice(0, 24);
async function puEnable() {
  if (PU.busy) return; PU.busy = true; PU.msg = "Đang bật…"; render();
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error(perm === "denied" ? "Trình duyệt đang chặn thông báo của web này. Mở cài đặt trang (biểu tượng ổ khóa cạnh địa chỉ) để cho phép, rồi bấm lại." : "Bạn chưa cho phép thông báo.");
    const reg = await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready;
    const { key } = await window.__push.key();
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: puKey(key) });
    await window.__push.sub(sub.toJSON(), puName());
    P.push = { on: true, at: Date.now() }; saveProfile(); PU.msg = "Đã bật. Bạn sẽ nhận một thông báo thử ngay bây giờ.";
    window.__push.test().catch(() => {}); puStatus(true);
  } catch (e) { PU.msg = e.message || e.code || "Chưa bật được thông báo."; }
  PU.busy = false; render();
}
async function puDisable() {
  try { const reg = await navigator.serviceWorker.getRegistration(); const s = await reg?.pushManager.getSubscription(); await s?.unsubscribe(); await window.__push.unsub(); } catch {}
  P.push = { on: false }; saveProfile(); PU.msg = "Đã tắt thông báo."; render();
}
/* Báo cho Worker biết hôm nay còn mấy nhiệm vụ, để 20h nhắc đúng người và kể tên bạn đã xong */
let puLast = "";
function puStatus(force) {
  if (!window.__push || !P) return; const st = dqToday(today()), b = { d: today(), left: DQ_T.length - st.met.length, name: puName(), streak: dqStreak(dqS().days), miss: DQ_T.filter(x => !st.met.includes(x.k)).map(x => x.unit ? `${x.name} ${Math.max(0, Math.round((x.need - (st[x.k] || 0)) * 10) / 10)} phút` : x.name) }, k = JSON.stringify(b);
  if (!force && k === puLast) return; puLast = k; window.__push.status(b).catch(() => { puLast = ""; });
}
function pushCard(compact) {
  if (!window.__push) return null;
  const on = P.push?.on && Notification?.permission === "granted";
  if (compact && on && !PU.msg) return null;
  const iosNeedInstall = puIOS() && !puStandalone();
  const body = !puSupported() && !iosNeedInstall ? h("p", { class: "small muted", style: "margin:0" }, "Trình duyệt này chưa hỗ trợ thông báo. Dùng Chrome trên Android hoặc máy tính.")
    : iosNeedInstall ? h("ol", { class: "small", style: "margin:0;padding-left:18px;line-height:1.7" }, h("li", null, "Mở web này bằng Safari."), h("li", null, "Bấm nút Chia sẻ (ô vuông có mũi tên lên) → Thêm vào MH chính."), h("li", null, "Mở web từ biểu tượng 9.0 vừa thêm, vào đây bấm Bật thông báo."), h("li", { class: "muted" }, "iPhone cần iOS 16.4 trở lên."))
    : h("div", { class: "row", style: "gap:8px;flex-wrap:wrap" },
      on ? h("button", { class: "btn", type: "button", onclick: puDisable }, "Tắt thông báo") : h("button", { class: "btn btn-primary", type: "button", disabled: PU.busy || null, onclick: puEnable }, "🔔 Bật thông báo"),
      on ? h("button", { class: "btn btn-quiet", type: "button", onclick: () => window.__push.test().then(r => toast(r.ok ? "Đã gửi thông báo thử" : "Chưa gửi được, thử bật lại"), () => toast("Chưa gửi được")) }, "Gửi thử") : null,
      PU.installEvt && !puStandalone() ? h("button", { class: "btn", type: "button", onclick: async () => { PU.installEvt.prompt(); await PU.installEvt.userChoice.catch(() => {}); PU.installEvt = null; render(); } }, "📲 Cài web như app") : null);
  return h("section", { class: "card stack push-card", style: "gap:8px" },
    h("div", { class: "row", style: "justify-content:space-between;align-items:baseline;flex-wrap:wrap" }, h("h2", { style: "margin:0" }, "🔔 Nhắc học trên điện thoại"), h("span", { class: "chip " + (on ? "good" : "warn") }, on ? "Đang bật" : "Chưa bật")),
    h("p", { class: "small muted", style: "margin:0" }, "20h tối web nhắc nếu bạn chưa xong nhiệm vụ, kèm tên những bạn đã xong. Bạn bè bấm Chọc thì thông báo đến ngay. Bật riêng trên từng máy."),
    body, PU.msg ? h("p", { class: "small", style: "margin:0" }, PU.msg) : null);
}
(function () {
  const _pub = dqPublish; dqPublish = function (now) { const r = _pub(now); setTimeout(() => puStatus(), 1500); return r; };
  const _pk = grpPoke; grpPoke = function (m) { const r = _pk(m); window.__push?.poke(m.id, puName()).then(x => { if (x && x.ok === false) toast(m.name + " chưa bật thông báo, lời chọc sẽ hiện khi bạn ấy mở web."); }, () => {}); return r; };
  const _pg = pageGroup; pageGroup = function () { const n = _pg(), c = pushCard(false), prof = n.querySelector(":scope > section"); if (c) prof ? prof.after(c) : n.prepend(c); return n; };
  const _pt = pageToday; pageToday = function () { const n = _pt(), c = pushCard(true), dq = n.querySelector(".dq-card"); if (c && dq) dq.after(c); return n; };
  if (navigator.serviceWorker && P?.push?.on) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
