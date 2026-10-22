// Обновления нативного приложения (APK) — состояние для UI.
//   • otaBundleId — веб-часть новой версии уже скачана (src/native/otaUpdate.js) и встанет, когда
//     приложение уйдёт в фон; баннер «Доступна новая версия» может применить её сразу;
//   • apk — вышла новая версия самого APK (src/native/apkUpdate.js): { versionCode, versionName,
//     apk, sha256 }; apkPhase/apkProgress — ход скачивания/установки для модалки.
import { create } from "zustand";

export const useAppUpdateStore = create((set) => ({
    otaBundleId: null,
    setOtaReady: (id) => set({ otaBundleId: id }),

    apk: null,
    apkPhase: "idle",       // idle | downloading | permission | installing | error
    apkProgress: 0,         // 0..100
    setApk: (apk) => set({ apk, apkPhase: "idle", apkProgress: 0 }),
    setApkPhase: (apkPhase) => set({ apkPhase }),
    setApkProgress: (apkProgress) => set({ apkProgress }),
    dismissApk: () => set({ apk: null, apkPhase: "idle", apkProgress: 0 }),
}));
