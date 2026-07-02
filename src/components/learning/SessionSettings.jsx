// Попап настроек учёбы — открывается шестерёнкой прямо с карточки Smart Review.
// Всё, что влияет на состав сессий: порция новых слов, слуховые задания, грамматика/формы
// (+ пер-POS). Пишет туда же, куда Профиль (gamePrefs, api.setGamePrefs) — это один источник
// правды; при закрытии принудительно пересобирает прогретую сессию, чтобы превью совпало.
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { NPS, GRM, GRM_POS } from "../../pages/MyPage.i18n.js";
import api from "../tools/api.js";
import { Icon } from "../ui/Icon.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

const T = langGuard({
    ru:  { title: "Настройки учёбы", sub: "Действуют со следующей сессии", close: "Готово" },
    en:  { title: "Study settings", sub: "Apply from the next session", close: "Done" },
    ukr: { title: "Налаштування навчання", sub: "Діють з наступної сесії", close: "Готово" },
    pl:  { title: "Ustawienia nauki", sub: "Obowiązują od następnej sesji", close: "Gotowe" },
    lt:  { title: "Mokymosi nustatymai", sub: "Galioja nuo kitos sesijos", close: "Atlikta" },
    lv:  { title: "Mācību iestatījumi", sub: "Spēkā no nākamās sesijas", close: "Gatavs" },
    ar:  { title: "إعدادات الدراسة", sub: "تسري من الجلسة التالية", close: "تم" },
}, "SessionSettings.T");

export default function SessionSettings({ open, onClose, lang = "ru" }) {
    const t = interfaceTranslate[lang] || interfaceTranslate.ru;
    const s = T[lang] || T.en;
    const nps = NPS[lang] || NPS.en;
    const grm = GRM[lang] || GRM.en;
    const grmPos = GRM_POS[lang] || GRM_POS.en;
    const prefs = useAuthStore((st) => st.user?.gamePrefs) || {};

    // Оптимистичный патч в стор + БД (тот же путь, что в Профиле/онбординге).
    const patch = (p) => {
        useAuthStore.setState((st) => (st.user ? { user: { ...st.user, gamePrefs: { ...(st.user.gamePrefs || {}), ...p } } } : st));
        api.setGamePrefs(p).catch(() => { /* офлайн — не критично */ });
    };
    // Закрытие: пересобрать прогретую сессию — превью Smart Review сразу отразит настройки.
    const close = () => { useSessionStore.getState().refreshIfStale(0); onClose?.(); };

    if (!open) return null;
    const newPer = Math.min(10, Math.max(4, prefs.newPerSession || 6));
    const audioOn = prefs.audio !== false;
    const grammarOn = prefs.grammar !== false;
    const gpos = prefs.grammarPos || {};
    const posOn = (k) => gpos[k] !== false;

    return (
        <div className="wn-backdrop" onClick={close}>
            <section className="wn" role="dialog" aria-modal="true" aria-label={s.title} onClick={(e) => e.stopPropagation()}>
                <span className="wn__halo" aria-hidden="true" />
                <header className="wn__head">
                    <span className="wn__spark"><Icon n="settings" /></span>
                    <div className="wn__titles">
                        <h2 className="wn__title">{s.title}</h2>
                        <p className="wn__sub">{s.sub}</p>
                    </div>
                    <button className="wn__x" onClick={close} aria-label="×"><Icon n="x" sm /></button>
                </header>
                <div className="wn__scroll">
                    {/* порция новых слов за сессию (4–10) */}
                    <div className="setrow">
                        <span className="setrow__ic"><Icon n="layers" sm /></span>
                        <span className="setrow__meta"><span className="setrow__t">{nps.t}</span><span className="setrow__d">{nps.d}</span></span>
                        <span className="row" style={{ gap: 8, alignItems: "center", flex: "none" }}>
                            <input type="range" min="4" max="10" value={newPer}
                                onChange={(e) => patch({ newPerSession: Number(e.target.value) })} style={{ width: 90 }} />
                            <b style={{ minWidth: 16, textAlign: "center", fontSize: "var(--fs-15)" }}>{newPer}</b>
                        </span>
                    </div>
                    {/* слуховые задания (отдельная партия) */}
                    <div className="setrow">
                        <span className="setrow__ic"><Icon n="volume" sm /></span>
                        <span className="setrow__meta"><span className="setrow__t">{t.listenTasks}</span><span className="setrow__d">{t.listenTasksDesc}</span></span>
                        <button type="button" className={`toggle${audioOn ? " is-on" : ""}`} role="switch"
                            aria-checked={audioOn} onClick={() => patch({ audio: !audioOn })} />
                    </div>
                    {/* грамматика/формы + тонкая настройка по частям речи */}
                    <div className="setrow">
                        <span className="setrow__ic"><Icon n="graduation" sm /></span>
                        <span className="setrow__meta"><span className="setrow__t">{grm.t}</span><span className="setrow__d">{grm.d}</span></span>
                        <button type="button" className={`toggle${grammarOn ? " is-on" : ""}`} role="switch"
                            aria-checked={grammarOn} onClick={() => patch({ grammar: !grammarOn })} />
                    </div>
                    {grammarOn && (
                        <div className="grm-pos">
                            {["noun", "verb", "adjective", "pronoun"].map((k) => (
                                <button key={k} type="button" role="switch" aria-checked={posOn(k)}
                                    className={`grm-pos__chip${posOn(k) ? " is-on" : ""}`}
                                    onClick={() => patch({ grammarPos: { ...gpos, [k]: !posOn(k) } })}>{grmPos[k]}</button>
                            ))}
                        </div>
                    )}
                </div>
                <button className="wn__ok" onClick={close}>{s.close}</button>
            </section>
        </div>
    );
}
