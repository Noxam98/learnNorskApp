// Самообновление APK (как в SmartTube): нативную часть — плагины, манифест, Kotlin-код —
// живым обновлением веба не заменить, нужен новый APK. Раздаём его через GitHub Releases:
// scripts/release-apk.sh кладёт в релиз learnnorsk.apk и app.json { versionCode, versionName,
// apk, sha256 }. Приложение читает app.json ПОСЛЕДНЕГО релиза; если versionCode больше
// установленного — UI предлагает обновиться, нативный плагин ApkUpdater (Kotlin) качает APK,
// сверяет sha256 и пакет и открывает системный установщик. Тихо поставить нельзя — Android
// всегда спрашивает пользователя; первый раз ещё и разрешение «установка из этого источника».
//
// Пара apk+app.json живёт в ОДНОМ релизе — манифест не может опередить сам файл. Отказ
// («Позже») помним по versionCode: эту версию больше не предлагаем, следующую — предложим.
import { isNative } from "./platform.js";
import { onAppResume } from "./appResume.js";
import { fetchJson } from "./otaUpdate.js";
import { useAppUpdateStore } from "../store/appUpdateStore.jsx";

export const APK_MANIFEST = import.meta.env?.VITE_APK_MANIFEST || "";
const RECHECK_MS = 6 * 60 * 60_000;
const DISMISS_KEY = "apkUpdateDismissed";

/**
 * Есть ли APK новее установленного. Возвращает манифест релиза или null.
 * @param {{ app: any, http: any }} deps
 * @param {{ manifestUrl?: string }} [opts]
 */
export async function checkApk({ app, http }, { manifestUrl = APK_MANIFEST } = {}) {
    if (!manifestUrl) return null;
    const m = await fetchJson(http, manifestUrl);
    if (!m?.versionCode || !m.apk) return null;
    const info = await app.getInfo();
    return Number(m.versionCode) > Number(info.build) ? m : null;
}

function dismissedCode() {
    try { return Number(localStorage.getItem(DISMISS_KEY)) || 0; } catch { return 0; }
}

/** «Позже»: эту версию больше не предлагаем (следующую — предложим). */
export function dismissApk(versionCode) {
    try { localStorage.setItem(DISMISS_KEY, String(versionCode)); } catch { /* приватный режим — спросим снова */ }
    useAppUpdateStore.getState().dismissApk();
}

let started = false;
let lastCheck = 0;

/** Проверка на старте и при возврате в приложение (не чаще RECHECK_MS). */
export async function initApkCheck() {
    if (!isNative() || started) return;
    started = true;
    let deps;
    try {
        const [{ App }, { CapacitorHttp }] = await Promise.all([import("@capacitor/app"), import("@capacitor/core")]);
        deps = { app: App, http: CapacitorHttp };
    } catch { return; }
    const run = async () => {
        if (lastCheck && Date.now() - lastCheck < RECHECK_MS) return;
        lastCheck = Date.now();
        try {
            const m = await checkApk(deps);
            if (m && Number(m.versionCode) !== dismissedCode()) useAppUpdateStore.getState().setApk(m);
        } catch { /* офлайн/нет релиза — молча */ }
    };
    run();
    onAppResume(run);
}

async function plugin() {
    const { registerPlugin } = await import("@capacitor/core");
    return registerPlugin("ApkUpdater");
}

/**
 * Скачать и поставить APK. Без разрешения на установку — фаза permission (UI ведёт в настройки).
 * @param {{ apk: string, sha256?: string }} m
 */
export async function installApk(m) {
    const st = useAppUpdateStore.getState();
    const p = await plugin();
    try {
        const { allowed } = await p.canInstall();
        if (!allowed) { st.setApkPhase("permission"); return; }
        st.setApkProgress(0);
        st.setApkPhase("downloading");
        const sub = await p.addListener("progress", ({ percent }) => useAppUpdateStore.getState().setApkProgress(percent));
        try {
            await p.downloadAndInstall({ url: m.apk, sha256: m.sha256 || "" });
        } finally { sub.remove(); }
        st.setApkPhase("installing");   // открыт системный установщик — дальше решает пользователь
    } catch {
        st.setApkPhase("error");
    }
}

/** Открыть системную настройку «Установка неизвестных приложений» для нас. */
export async function openInstallSettings() {
    const p = await plugin();
    await p.openInstallSettings();
}
