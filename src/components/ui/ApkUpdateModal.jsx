// «Новая версия приложения» — самообновление APK (см. src/native/apkUpdate.js). Показывается
// только в нативном приложении, когда в последнем GitHub-релизе versionCode больше
// установленного. Ведёт по шагам: разрешение на установку → скачивание с прогрессом →
// системный установщик. «Позже» (и крестик) больше не предлагают ЭТУ версию.
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useAppUpdateStore } from "../../store/appUpdateStore.jsx";
import { dismissApk, installApk, openInstallSettings } from "../../native/apkUpdate.js";
import { U } from "./AppUpdate.i18n.js";

export default function ApkUpdateModal() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = U[lang] || U.ru;
    const apk = useAppUpdateStore((s) => s.apk);
    const phase = useAppUpdateStore((s) => s.apkPhase);
    const progress = useAppUpdateStore((s) => s.apkProgress);
    if (!apk) return null;

    const busy = phase === "downloading";
    const later = () => { if (!busy) dismissApk(apk.versionCode); };
    return (
        <Modal open onClose={later} title={t.title} maxWidth={420}>
            <p style={{ margin: "0 0 var(--sp-3)" }}>{t.body.replace("{v}", apk.versionName || String(apk.versionCode))}</p>
            {phase === "permission" && <p className="muted" style={{ margin: "0 0 var(--sp-3)" }}>{t.perm}</p>}
            {phase === "error" && <p style={{ margin: "0 0 var(--sp-3)", color: "var(--danger)" }}>{t.error}</p>}
            {phase === "installing" && <p className="muted" style={{ margin: "0 0 var(--sp-3)" }}>{t.installing}</p>}
            {busy && (
                <div className="apk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <span style={{ width: `${progress}%` }} />
                </div>
            )}
            <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-end", flexWrap: "wrap", marginTop: "var(--sp-3)" }}>
                {!busy && <button className="btn btn--ghost" onClick={later}>{t.later}</button>}
                {phase === "permission" && (
                    <button className="btn" onClick={() => openInstallSettings().catch(() => {})}>
                        <Icon n="settings" sm /> {t.openSettings}
                    </button>
                )}
                <button className="btn btn--accent" disabled={busy} onClick={() => installApk(apk)}>
                    {busy ? <><BtnSpinner /> {t.downloading.replace("{p}", String(progress))}</>
                        : <><Icon n="download" sm /> {phase === "error" ? t.retry : t.update}</>}
                </button>
            </div>
        </Modal>
    );
}
