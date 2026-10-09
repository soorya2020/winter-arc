// Winter Arc service worker: shows phone notifications and opens the arena when one is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let n = { title: "Winter Arc", body: "Time to train.", url: "/board" };
  try { n = { ...n, ...e.data.json() }; } catch { /* plain text or empty */ }
  e.waitUntil(self.registration.showNotification(n.title, {
    body: n.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: n.tag || "winter-arc", renotify: true, data: { url: n.url || "/board" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/board", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = wins.find((w) => w.url.startsWith(self.location.origin));
    if (open) { await open.navigate(url).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(url);
  })());
});
