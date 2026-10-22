// Живое обновление веб-части APK (OTA) без переустановки приложения.
//
// Веб-часть вшита в APK (capacitor webDir=dist), поэтому раньше любой фикс фронта доходил до
// приложения только с новым APK. Теперь Vercel на каждом деплое кладёт рядом с сайтом
// /ota/latest.json + zip сборки (scripts/ota-bundle.mjs), а приложение:
//   1. на старте отмечает текущую веб-часть рабочей (notifyAppReady) — без этого плагин
//      @capgo/capacitor-updater через appReadyTimeout откатит её как сломанную;
//   2. читает манифест; если там другая сборка и она совместима с нативкой (minNative ≤
//      versionCode APK) — качает zip (sha256 сверяет плагин) и ставит его «на следующий запуск»;
//   3. сообщает UI (баннер «Доступна новая версия» → «Обновить» применяет сразу).
// Повторно проверяем при возврате в приложение, но не чаще RECHECK_MS.
//
// Манифест читаем нативным HTTP (CapacitorHttp): у WebView свой origin, и fetch на Vercel
// упёрся бы в CORS. В вебе модуль — no-op, плагины в бандл не тянутся (динамический импорт).
/* global __BUILD_ID__ */
import { isNative } from "./platform.js";
import { onAppResume } from "./appResume.js";
import { useAppUpdateStore } from "../store/appUpdateStore.jsx";

export const OTA_MANIFEST = import.meta.env?.VITE_OTA_MANIFEST || "";
const BAKED = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : null;
const RECHECK_MS = 30 * 60_000;

/**
 * GET JSON нативным HTTP. Ассет GitHub-релиза приходит как octet-stream — тогда data строка.
 * @param {{ get: (o: any) => Promise<{ status: number, data: any }> }} http
 * @param {string} url
 */
export async function fetchJson(http, url) {
    const r = await http.get({ url, headers: { "Cache-Control": "no-cache" } });
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
}

/**
 * Одна проверка. Возвращает id подготовленного (скачанного и поставленного на следующий
 * запуск) бандла или null, если обновлять нечего. Зависимости инжектируются — для тестов.
 * @param {{ updater: any, app: any, http: any }} deps
 * @param {{ manifestUrl?: string, current?: string|null }} [opts]
 */
export async function checkOta({ updater, app, http }, { manifestUrl = OTA_MANIFEST, current = BAKED } = {}) {
    if (!manifestUrl || !current) return null;
    const m = await fetchJson(http, manifestUrl);
    if (!m?.version || !m.url || m.version === current) return null;
    const info = await app.getInfo();
    // веб собран под нативку новее этой — ставить нельзя (плагина/разрешения может не быть); ждём APK
    if (Number(info.build) < Number(m.minNative || 0)) return null;
    const { bundles } = await updater.list();
    let bundle = (bundles || []).find((b) => b.version === m.version && b.status !== "error");
    if (!bundle) {
        bundle = await updater.download({ url: new URL(m.url, manifestUrl).href, version: m.version, checksum: m.checksum });
    }
    await updater.next({ id: bundle.id });
    return bundle.id;
}

let started = false;
let lastCheck = 0;
let inflight = false;

/** Запуск на старте приложения (после первого рендера): notifyAppReady + проверка. */
export async function initOta() {
    if (!isNative() || started) return;
    started = true;
    let deps;
    try {
        const [{ CapacitorUpdater }, { App }, { CapacitorHttp }] = await Promise.all([
            import("@capgo/capacitor-updater"), import("@capacitor/app"), import("@capacitor/core"),
        ]);
        deps = { updater: CapacitorUpdater, app: App, http: CapacitorHttp };
        await CapacitorUpdater.notifyAppReady();
    } catch { return; }   // APK без плагина (старше otaMinNative) — живых обновлений нет
    const run = async () => {
        if (inflight || (lastCheck && Date.now() - lastCheck < RECHECK_MS)) return;
        inflight = true;
        lastCheck = Date.now();
        try {
            const id = await checkOta(deps);
            if (id) useAppUpdateStore.getState().setOtaReady(id);
        } catch { /* офлайн/битый манифест — попробуем в следующий раз */ }
        finally { inflight = false; }
    };
    run();
    onAppResume(run);
}

/** Применить скачанную веб-часть сейчас (перезагрузка WebView в новую сборку). */
export async function applyOta(id) {
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
    await CapacitorUpdater.set({ id });
}
