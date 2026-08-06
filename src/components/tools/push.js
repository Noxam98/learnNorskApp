// Веб-пуши на фронте: подписка/отписка через service worker + бэкенд.
// Всё в try/catch — если браузер не поддерживает или юзер отказал, приложение работает как обычно.
import api from "./api.js";
import { isNative } from "../../native/platform.js";

// applicationServerKey должен быть Uint8Array из base64url-VAPID-публичного ключа.
const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
};

// Внутри APK Web Push нет (Capacitor WebView не даёт Service Worker Push), поэтому VAPID-путь
// на нативе отключён целиком — иначе подписка молча падает или виснет на serviceWorker.ready.
// Нативные уведомления пойдут через FCM (задача A6).
export const pushSupported = () =>
    !isNative() &&
    typeof navigator !== "undefined" && "serviceWorker" in navigator &&
    typeof window !== "undefined" && "PushManager" in window && "Notification" in window;

// Текущее состояние: поддержка, наличие подписки, разрешение.
export async function getPushStatus() {
    if (!pushSupported()) return { supported: false, subscribed: false, permission: "unsupported" };
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return { supported: true, subscribed: !!sub, permission: Notification.permission };
    } catch {
        return { supported: true, subscribed: false, permission: Notification.permission };
    }
}

// Включить напоминания: спросить разрешение → подписаться → отдать подписку бэку.
// Бросает: "unsupported" | "denied" | прочее (сеть/конфиг).
export async function enablePush() {
    if (!pushSupported()) throw new Error("unsupported");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("denied");
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        const { publicKey } = await api.pushVapidKey();   // VAPID-публичный ключ с бэка
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    }
    await api.pushSubscribe(sub.toJSON());
    return true;
}

// Выключить: отписать бэк + отписаться в браузере.
export async function disablePush() {
    if (!pushSupported()) return true;   // на нативе serviceWorker.ready никогда не резолвится
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            try { await api.pushUnsubscribe(sub.endpoint); } catch { /* бэк недоступен — всё равно отпишемся локально */ }
            await sub.unsubscribe();
        }
    } catch { /* нет SW/подписки — уже выключено */ }
    return true;
}

// Тихая ре-синхронизация при загрузке: если юзер раньше включал и разрешение есть —
// убеждаемся, что подписка есть и известна бэку (новое устройство/протухла). Без промптов.
export async function resyncPush() {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    try { return await enablePush(); } catch { return false; }
}
