// Service worker: только веб-пуши (без кэширования — чтобы не было «залипшей» версии).
// Показывает уведомление при входящем пуше и открывает приложение по клику.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (_) { /* пустой/не-JSON пуш */ }
    const title = data.title || "Lære Norsk";
    const body = data.body || "";
    const url = data.url || "/";
    event.waitUntil((async () => {
        // приложение открыто (есть видимая вкладка) → системное уведомление НЕ показываем:
        // открытое приложение покажет тост само. Закрыто/в фоне → показываем системный пуш.
        const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const visible = all.some((c) => c.visibilityState === "visible");
        if (visible) return;
        await self.registration.showNotification(title, {
            body,
            icon: "/web-app-manifest-192x192.png",
            badge: "/favicon-96x96.png",
            data: { url },
            tag: data.url && data.url.includes("moderation") ? "laere-moderation" : "laere-reminder",
        });
    })());
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil((async () => {
        const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of all) {
            if ("focus" in c) { try { if (c.navigate) await c.navigate(url); } catch (_) {} return c.focus(); }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
    })());
});
