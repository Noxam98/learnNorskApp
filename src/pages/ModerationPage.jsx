// Админ: модерация. Две очереди:
//  1) Слова, созданные пользователями (личные расширения → общая база): одобрить/отклонить.
//  2) Жалобы «не учить» (мусорные слова): убрать из учёбы (всем) / оставить (+гасить 5 след. жалоб).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/tools/api.js";
import { useAuthStore } from "../store/AuthStore.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { BtnSpinner, SkeletonWordlist } from "../components/ui/Spinner.jsx";
import { posMeta, posLabel } from "../components/ui/pos.js";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { langGuard } from "../interface/i18nGuard.js";

const T = langGuard({
    ru:  { title: "Модерация", sub: "Слова, созданные пользователями. Одобрить → в общую базу; отклонить → останется приватным у автора.", empty: "Очередь пуста — новых слов нет.", approve: "Одобрить", reject: "Отклонить", by: "от",
           repTitle: "Жалобы «не учить»", repSub: "Пользователи отметили слово как мусорное. «Убрать из учёбы» → больше никому не предлагаем; «Оставить» → следующие 5 жалоб гасим автоматически.", repEmpty: "Жалоб нет.", exclude: "Убрать из учёбы", keep: "Оставить", reports: "жалоб" },
    en:  { title: "Moderation", sub: "Words created by users. Approve → shared base; reject → stays private to the author.", empty: "Queue is empty.", approve: "Approve", reject: "Reject", by: "by",
           repTitle: "“Don’t learn” reports", repSub: "Users flagged the word as junk. “Remove from learning” → never suggested again; “Keep” → next 5 reports auto-dismissed.", repEmpty: "No reports.", exclude: "Remove from learning", keep: "Keep", reports: "reports" },
    ukr: { title: "Модерація", sub: "Слова, створені користувачами. Схвалити → у спільну базу; відхилити → лишиться приватним.", empty: "Черга порожня.", approve: "Схвалити", reject: "Відхилити", by: "від",
           repTitle: "Скарги «не вчити»", repSub: "Користувачі позначили слово як сміття. «Прибрати з навчання» → більше не пропонуємо; «Залишити» → наступні 5 скарг гасимо автоматично.", repEmpty: "Скарг немає.", exclude: "Прибрати з навчання", keep: "Залишити", reports: "скарг" },
    pl:  { title: "Moderacja", sub: "Słowa utworzone przez użytkowników. Zatwierdź → wspólna baza; odrzuć → zostaje prywatne.", empty: "Kolejka pusta.", approve: "Zatwierdź", reject: "Odrzuć", by: "od",
           repTitle: "Zgłoszenia „nie ucz”", repSub: "Użytkownicy oznaczyli słowo jako śmieci. „Usuń z nauki” → już nie proponujemy; „Zostaw” → kolejne 5 zgłoszeń pomijamy automatycznie.", repEmpty: "Brak zgłoszeń.", exclude: "Usuń z nauki", keep: "Zostaw", reports: "zgłoszeń" },
    lt:  { title: "Moderacija", sub: "Vartotojų sukurti žodžiai. Patvirtinti → bendra bazė; atmesti → liks privatus.", empty: "Eilė tuščia.", approve: "Patvirtinti", reject: "Atmesti", by: "nuo",
           repTitle: "Skundai „nemokyti“", repSub: "Vartotojai pažymėjo žodį kaip šiukšlę. „Pašalinti iš mokymosi“ → daugiau nesiūlome; „Palikti“ → kitus 5 skundus atmetame automatiškai.", repEmpty: "Skundų nėra.", exclude: "Pašalinti iš mokymosi", keep: "Palikti", reports: "skundų" },
}, "ModerationPage.T");

export default function ModerationPage() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = T[lang] || T.ru;
    const ig = interfaceTranslate[lang] || interfaceTranslate.ru || {};
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const navigate = useNavigate();
    const [items, setItems] = useState(null);       // null = загрузка; пользовательские слова на модерации
    const [reported, setReported] = useState(null); // жалобы «не учить»
    const [busy, setBusy] = useState(0);            // pool_id в работе

    const load = useCallback(() => {
        api.adminPending().then((r) => setItems(r.words || [])).catch(() => setItems([]));
        api.adminReported().then((r) => setReported(r.words || [])).catch(() => setReported([]));
    }, []);
    useEffect(() => {
        if (!isAdmin) { navigate("/learning", { replace: true }); return; }
        load();
    }, [isAdmin, load, navigate]);

    const act = async (poolId, kind) => {
        setBusy(poolId);
        try {
            await (kind === "approve" ? api.adminApprove(poolId) : api.adminReject(poolId));
            setItems((xs) => (xs || []).filter((w) => w.pool_id !== poolId));
        } catch { /* тост покажет api.js */ }
        setBusy(0);
    };

    const actRep = async (poolId, kind) => {
        setBusy(poolId);
        try {
            await (kind === "exclude" ? api.adminExcludeWord(poolId) : api.adminKeepWord(poolId));
            setReported((xs) => (xs || []).filter((w) => w.pool_id !== poolId));
        } catch { /* тост покажет api.js */ }
        setBusy(0);
    };

    if (!isAdmin) return null;

    return (
        <main className="shell words-main">
            {/* --- Очередь 1: пользовательские слова на модерации --- */}
            <div className="page-head" style={{ marginBottom: "var(--sp-4)" }}>
                <div>
                    <span className="eyebrow"><Icon n="check-circle" sm /> {t.title}{items?.length ? ` · ${items.length}` : ""}</span>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{t.sub}</p>
                </div>
            </div>

            {items === null ? (
                <SkeletonWordlist count={4} />
            ) : items.length === 0 ? (
                <div className="empty">
                    <div className="empty__ic"><Icon n="check" lg /></div>
                    <div className="empty__t">{t.empty}</div>
                </div>
            ) : (
                <div className="modlist">
                    {items.map((w) => {
                        const { cls } = posMeta(w.part_of_speech);
                        const tr = (w.translate?.[lang] || w.translate?.ru || w.translate?.en || []).join(", ");
                        const working = busy === w.pool_id;
                        return (
                            <div className="modcard" key={w.pool_id}>
                                <div className="modcard__body">
                                    <div className="modcard__top">
                                        <span className="modcard__word">{w.word}</span>
                                        {w.part_of_speech && <span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, ig)}</span>}
                                        {w.level && <span className="chip lvl">{w.level}</span>}
                                    </div>
                                    {tr && <div className="modcard__tr">{tr}</div>}
                                    {w.author && <div className="modcard__by">{t.by} <b>@{w.author}</b></div>}
                                </div>
                                <div className="modcard__actions">
                                    <button className="btn btn--primary btn--sm" disabled={working} onClick={() => act(w.pool_id, "approve")}>
                                        {working ? <BtnSpinner /> : <Icon n="check" sm />} {t.approve}
                                    </button>
                                    <button className="btn btn--ghost btn--sm" disabled={working} onClick={() => act(w.pool_id, "reject")}>
                                        <Icon n="x" sm /> {t.reject}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- Очередь 2: жалобы «не учить» --- */}
            <div className="page-head" style={{ margin: "var(--sp-6) 0 var(--sp-4)" }}>
                <div>
                    <span className="eyebrow"><Icon n="alert" sm /> {t.repTitle}{reported?.length ? ` · ${reported.length}` : ""}</span>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{t.repSub}</p>
                </div>
            </div>

            {reported === null ? (
                <SkeletonWordlist count={3} />
            ) : reported.length === 0 ? (
                <div className="empty">
                    <div className="empty__ic"><Icon n="check" lg /></div>
                    <div className="empty__t">{t.repEmpty}</div>
                </div>
            ) : (
                <div className="modlist">
                    {reported.map((w) => {
                        const { cls } = posMeta(w.part_of_speech);
                        const tr = (w.translate?.[lang] || w.translate?.ru || w.translate?.en || []).join(", ");
                        const working = busy === w.pool_id;
                        return (
                            <div className="modcard" key={w.pool_id}>
                                <div className="modcard__body">
                                    <div className="modcard__top">
                                        <span className="modcard__word">{w.word}</span>
                                        {w.part_of_speech && <span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, ig)}</span>}
                                        {w.level && <span className="chip lvl">{w.level}</span>}
                                        {w.reports > 1 && <span className="chip" style={{ color: "var(--game-incorrect)" }}><Icon n="alert" sm /> {w.reports} {t.reports}</span>}
                                    </div>
                                    {tr && <div className="modcard__tr">{tr}</div>}
                                </div>
                                <div className="modcard__actions">
                                    <button className="btn btn--primary btn--sm" disabled={working} onClick={() => actRep(w.pool_id, "exclude")}>
                                        {working ? <BtnSpinner /> : <Icon n="trash" sm />} {t.exclude}
                                    </button>
                                    <button className="btn btn--ghost btn--sm" disabled={working} onClick={() => actRep(w.pool_id, "keep")}>
                                        <Icon n="check" sm /> {t.keep}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
