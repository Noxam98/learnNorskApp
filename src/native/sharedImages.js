// Входящая картинка из системного «Поделиться» (Android, задача A4).
//
// Нативная сторона (share/SharedImages.kt) уже ужала картинку и держит её в очереди — тут только
// доставка в UI: разбудить приложение на вкладке «Наборы» и отдать data-URL'ы подписчику
// (SetsTab), который запустит существующий OCR-импорт.
//
// Очередь нужна из-за случая «приложение было закрыто в момент шаринга»: картинка готова раньше,
// чем смонтируется React, а вкладка «Наборы» подписывается только после навигации. Поэтому
// картинки лежат в модуле, пока за ними не придут, и не теряются. В вебе модуль — no-op, плагин
// Capacitor в бандл не тянется (динамический импорт внутри нативной ветки).
import { isNative } from "./platform.js";

/** Куда уводим приложение при входящей картинке: «Учёба» → вкладка «Наборы». */
export const SETS_ROUTE = "#/learning?tab=sets";

/** Столько же страниц, сколько принимает модалка импорта (MAX_PAGES в PhotoImportModal). */
const MAX_IMAGES = 5;

/** @type {string[]} картинки, за которыми ещё никто не пришёл */
let pending = [];
/** @type {Set<(images: string[]) => void>} */
const subs = new Set();

function flush() {
    if (!pending.length || !subs.size) return;
    const images = pending;
    pending = [];
    for (const fn of [...subs]) {
        try { fn(images); } catch { /* один подписчик не должен ронять остальных */ }
    }
}

/** Увести приложение на «Наборы», если оно там ещё не стоит (hash-роутер, без useNavigate). */
function goToSets() {
    try {
        if (typeof window === "undefined" || !window.location) return;
        const hash = window.location.hash || "";
        if (hash.startsWith("#/learning") && hash.includes("tab=sets")) return;
        window.location.hash = SETS_ROUTE;
    } catch { /* нет window (node-тесты) — навигация не наша забота */ }
}

/**
 * Положить пачку картинок и разбудить UI. Публично — чтобы натив-мост и тесты ходили одним путём.
 * @param {string[]} images data-URL'ы
 * @returns {number} сколько принято
 */
export function pushSharedImages(images) {
    const list = (images || []).filter((s) => typeof s === "string" && s.startsWith("data:image"));
    if (!list.length) return 0;
    pending = [...pending, ...list].slice(-MAX_IMAGES);
    goToSets();
    flush();
    return list.length;
}

/**
 * Подписаться на входящие картинки. Уже накопленное отдаётся сразу же, синхронно.
 * @param {(images: string[]) => void} handler
 * @returns {() => void} отписка
 */
export function onSharedImages(handler) {
    subs.add(handler);
    flush();
    return () => { subs.delete(handler); };
}

/** Сбросить состояние модуля (тесты). */
export function resetSharedImages() {
    pending = [];
    subs.clear();
}

/**
 * Забрать очередь у нативной стороны. Ошибки глушим: не смогли — картинка просто не приедет,
 * приложение от этого падать не должно.
 * @param {{ consume: () => Promise<{images?: string[]}> }} plugin
 */
async function drain(plugin) {
    try {
        const r = await plugin.consume();
        pushSharedImages(r?.images || []);
    } catch { /* см. выше */ }
}

/**
 * Нативный мост: подписка на событие плагина + разовый забор того, что уже накопилось.
 * Порядок важен — сначала слушатель, потом consume: иначе картинка, доехавшая между этими
 * двумя шагами, не досталась бы никому.
 * @returns {Promise<() => void>} снятие слушателя (в вебе — no-op)
 */
export async function setupSharedImages() {
    if (!isNative()) return () => {};
    try {
        const { registerPlugin } = await import("@capacitor/core");
        const plugin = registerPlugin("SharedImages");
        const listener = await plugin.addListener("sharedImages", () => { drain(plugin); });
        await drain(plugin);
        return () => { listener.remove(); };
    } catch {
        return () => {};   // плагина нет (старый APK) — фича просто не работает
    }
}
