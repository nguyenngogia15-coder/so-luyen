/* Sổ luyện: nhận thông báo nhắc học. Thông báo đến dạng rỗng, lấy chữ từ Worker theo địa chỉ đăng ký của máy này. */
const W = "https://so-luyen-ai.nguyenngogia15.workers.dev";
self.addEventListener("install", () => self.skipWaiting());
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
