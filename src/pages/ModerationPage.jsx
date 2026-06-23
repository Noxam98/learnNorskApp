// Админ: модерация пользовательских слов (личные расширения базы → общая база).
// Мобильно-дружелюбный список карточек: слово + часть речи + перевод + автор; одобрить/отклонить.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/tools/api.js";
import { useAuthStore } from "../store/AuthStore.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { BtnSpinner, SkeletonWordlist } from "../components/ui/Spinner.jsx";
import { posMeta, posLabel } from "../components/ui/pos.js";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";

const T = {
    ru:  { title: "Модерация", sub: "Слова, созданные пользователями. Одобрить → в общую базу; отклонить → останется приватным у автора.", empty: "Очередь пуста — новых слов нет.", approve: "Одобрить", reject: "Отклонить", by: "от" },
    en:  { title: "Moderation", sub: "Words created by users. Approve → shared base; reject → stays private to the author.", empty: "Queue is empty.", approve: "Approve", reject: "Reject", by: "by" },
    ukr: { title: "Модерація", sub: "Слова, створені користувачами. Схвалити → у спільну базу; відхилити → лишиться приватним.", empty: "Черга порожня.", approve: "Схвалити", reject: "Відхилити", by: "від" },
    pl:  { title: "Moderacja", sub: "Słowa utworzone przez użytkowników. Zatwierdź → wspólna baza; odrzuć → zostaje prywatne.", empty: "Kolejka pusta.", approve: "Zatwierdź", reject: "Odrzuć", by: "od" },
    lt:  { title: "Moderacija", sub: "Vartotojų sukurti žodžiai. Patvirtinti → bendra bazė; atmesti → liks privatus.", empty: "Eilė tuščia.", approve: "Patvirtinti", reject: "Atmesti", by: "nuo" },
};

export default function ModerationPage() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = T[lang] || T.ru;
    const ig = interfaceTranslate[lang] || interfaceTranslate.ru || {};
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const navigate = useNavigate();
    const [items, setItems] = useState(null);   // null = загрузка
    const [busy, setBusy] = useState(0);          // pool_id в работе

    const load = useCallback(() => {
        api.adminPending().then((r) => setItems(r.words || [])).catch(() => setItems([]));
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

    if (!isAdmin) return null;

    return (
        <main className="shell words-main">
            <div className="page-head" style={{ marginBottom: "var(--sp-4)" }}>
                <div>
                    <span className="eyebrow"><Icon n="check-circle" sm /> {t.title}{items?.length ? ` · ${items.length}` : ""}</span>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{t.sub}</p>
                </div>
            </div>

            {items === null ? (
                <SkeletonWordlist count={6} />
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
        </main>
    );
}
