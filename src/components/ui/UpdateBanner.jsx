// Баннер «доступна новая версия» — появляется, когда на сервере вышла новая сборка фронта.
// Совмещён с ченжлогом: показывает ТИЗЕР свежайшей записи «что нового» (если она уже
// сгенерирована стражем пуша) — юзер видит, ЗАЧЕМ обновляться, а после перезагрузки
// WhatsNew сам раскроет полный таймлайн.
// В вебе «Обновить» = перезагрузка страницы; в APK — применить уже скачанную веб-часть
// (живое обновление, src/native/otaUpdate.js): иначе она встала бы только при следующем запуске.
import { useEffect, useState } from "react";
import { useVersionCheck } from "../../hooks/useVersionCheck.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useAppUpdateStore } from "../../store/appUpdateStore.jsx";
import { applyOta } from "../../native/otaUpdate.js";
import { Icon } from "./Icon.jsx";
import api from "../tools/api.js";
import { wnText } from "./WhatsNew.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

const T = langGuard({
    ru:  { msg: "Доступна новая версия", btn: "Обновить" },
    en:  { msg: "A new version is available", btn: "Refresh" },
    ukr: { msg: "Доступна нова версія", btn: "Оновити" },
    pl:  { msg: "Dostępna nowa wersja", btn: "Odśwież" },
    lt:  { msg: "Yra nauja versija", btn: "Atnaujinti" },
    lv:  { msg: "Ir pieejama jauna versija", btn: "Atjaunināt" },
    ar:  { msg: "يتوفّر إصدار جديد", btn: "تحديث" },
}, "UpdateBanner.T");

export function UpdateBanner() {
    const webUpdate = useVersionCheck();
    const otaId = useAppUpdateStore((s) => s.otaBundleId);
    const update = webUpdate || !!otaId;
    const apply = () => {
        if (otaId) applyOta(otaId).catch(() => window.location.reload());
        else window.location.reload();
    };
    const [dismissed, setDismissed] = useState(false);
    const [teaser, setTeaser] = useState("");
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = T[lang] || T.ru;

    // тизер: заголовок свежайшей записи ченжлога (страж мог ещё не догнать деплой — тогда без тизера)
    useEffect(() => {
        if (!update) return;
        api.getChangelog(1)
            .then((r) => setTeaser(wnText(r?.entries?.[0], lang).t || ""))
            .catch(() => { /* без тизера */ });
    }, [update]); // eslint-disable-line

    if (!update || dismissed) return null;
    return (
        <div className="update-banner" role="status">
            <span className="update-banner__ic"><Icon n="sparkles" sm /></span>
            <span className="update-banner__msg">
                {t.msg}
                {teaser && <span className="update-banner__teaser">✨ {teaser}</span>}
            </span>
            <button className="update-banner__btn" onClick={apply}>{t.btn}</button>
            <button className="update-banner__x" onClick={() => setDismissed(true)} aria-label="×"><Icon n="x" sm /></button>
        </div>
    );
}

export default UpdateBanner;
