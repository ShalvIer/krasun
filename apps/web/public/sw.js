const CACHE_NAME = "krasun-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/krasun.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
      return response;
    }).catch(() => caches.match("/").then((cached) => cached || Response.error())));
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })));
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Krasun", body: "New notification", url: "/chat", tag: "krasun" };
  try { data = { ...data, ...event.data.json() }; } catch { /* Keep safe defaults. */ }
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const visible = clients.find((client) => client.visibilityState === "visible");
    if (visible) {
      visible.postMessage({ type: "KRASUN_PUSH_RECEIVED", payload: data });
      return;
    }
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/krasun.svg",
      badge: "/icons/krasun.svg",
      tag: data.tag,
      renotify: true,
      data: { url: data.url }
    });
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/chat", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(url);
      return existing.focus();
    }
    return self.clients.openWindow(url);
  }));
});
