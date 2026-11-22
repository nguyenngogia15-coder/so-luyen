/* Sổ luyện: nhận thông báo nhắc học. Thông báo đến dạng rỗng, lấy chữ từ Worker theo địa chỉ đăng ký của máy này. */
const W = "https://so-luyen-ai.nguyenngogia15.workers.dev";
self.addEventListener("install", () => self.skipWaiting());
/* Giữ một bản web và dữ liệu trong máy: mở ngay từ bản đã giữ, tải bản mới ở nền; trang khác bản cũ thì báo trang tải lại */
const C = "sl-v2";
const sleep = ms => new Promise(r => setTimeout(r, ms));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url), scope = new URL(self.registration.scope);
  if (r.method !== "GET" || u.origin !== scope.origin) return;
  const nav = r.mode === "navigate" && (u.pathname === scope.pathname || u.pathname === scope.pathname + "index.html");
  const data = /\/(vr\/.*\.json|ls-bank\.json|sp-bank\.json|voice\/gm\/index\.json)$/.test(u.pathname);
  if (!nav && !data) return;
  e.respondWith((async () => {
    const c = await caches.open(C), key = nav ? scope.href : u.href, hit = await c.match(key);
    const tag = x => x && (x.headers.get("etag") || x.headers.get("last-modified") || "");
    const net = fetch(r.url, { cache: "no-cache", credentials: "same-origin" }).then(async res => {
      if (!res.ok) return res;
      const changed = hit && tag(hit) !== tag(res); await c.put(key, res.clone());
      if (nav && changed && e.resultingClientId) for (let i = 0; i < 15; i++) { const cl = await self.clients.get(e.resultingClientId); if (cl) { await sleep(1500); cl.postMessage({ type: "sl-update" }); break; } await sleep(1000); }
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || fetch(r);
  })());
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => e.waitUntil((async () => {
  let m = {};
  try { const s = await self.registration.pushManager.getSubscription(); m = await (await fetch(W + "/push/msg", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: s && s.endpoint }) })).json(); } catch (_) {}
  return self.registration.showNotification(m.title || "Sổ luyện IELTS", { body: m.body || "Vào học tiếng Anh hôm nay nhé!", icon: "icon-192.png", badge: "icon-192.png", tag: "nhac-hoc", renotify: true, data: { url: m.url || "#today" } });
})()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL("./" + ((e.notification.data && e.notification.data.url) || ""), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.startsWith(self.registration.scope)); if (c) { c.navigate(url).catch(() => {}); return c.focus(); } return self.clients.openWindow(url); }));
});
