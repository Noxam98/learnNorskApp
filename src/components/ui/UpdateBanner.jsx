// Баннер «доступна новая версия» — появляется, когда на сервере вышла новая сборка фронта.
import { useState } from "react";
import { useVersionCheck } from "../tools/useVersionCheck.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "./Icon.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

const T = langGuard({
    ru:  { msg: "Доступна новая версия", btn: "Обновить" },
    en:  { msg: "A new version is available", btn: "Refresh" },
    ukr: { msg: "Доступна нова версія", btn: "Оновити" },
    pl:  { msg: "Dostępna nowa wersja", btn: "Odśwież" },
    lt:  { msg: "Yra nauja versija", btn: "Atnaujinti" },
}, "UpdateBanner.T");

export function UpdateBanner() {
    const update = useVersionCheck();
    const [dismissed, setDismissed] = useState(false);
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = T[lang] || T.ru;
    if (!update || dismissed) return null;
    return (
        <div className="update-banner" role="status">
            <span className="update-banner__ic"><Icon n="sparkles" sm /></span>
            <span className="update-banner__msg">{t.msg}</span>
            <button className="update-banner__btn" onClick={() => window.location.reload()}>{t.btn}</button>
            <button className="update-banner__x" onClick={() => setDismissed(true)} aria-label="×"><Icon n="x" sm /></button>
        </div>
    );
}

export default UpdateBanner;
