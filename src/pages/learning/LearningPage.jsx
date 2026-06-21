// Раздел «Учёба»: заголовок + сегмент-переключатель (Сегодня/Все слова/Экзамен/Прогресс)
// с клиентским роутингом по ?tab=. Управляет общими оверлеями: сессия практики и карточка слова.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../../components/ui/Icon.jsx";
import { WordInfoModal } from "../../components/ui/WordInfoModal.jsx";
import LearningSession from "../../components/learning/LearningSession.jsx";
import PlacementScreen from "../../components/learning/PlacementScreen.jsx";
import LearningIntro from "../../components/learning/LearningIntro.jsx";
import LevelUpToast from "../../components/learning/LevelUpToast.jsx";
import api from "../../components/tools/api.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
import TodayTab from "./TodayTab.jsx";
import WordsTab from "./WordsTab.jsx";
import ExamTab from "./ExamTab.jsx";
import ProgressTab from "./ProgressTab.jsx";

const TABS = [
    { key: "today", icon: "zap" },
    { key: "words", icon: "list" },
    { key: "exam", icon: "graduation" },
    { key: "progress", icon: "chart" },
];
const TAB_LABELS = {
    ru:  { title: "Учёба", today: "Сегодня", words: "Все слова", exam: "Экзамен", progress: "Прогресс", hi: "Добрый день" },
    en:  { title: "Study", today: "Today", words: "All words", exam: "Exam", progress: "Progress", hi: "Hello" },
    ukr: { title: "Навчання", today: "Сьогодні", words: "Усі слова", exam: "Екзамен", progress: "Прогрес", hi: "Доброго дня" },
    pl:  { title: "Nauka", today: "Dziś", words: "Wszystkie", exam: "Egzamin", progress: "Postęp", hi: "Dzień dobry" },
    lt:  { title: "Mokymasis", today: "Šiandien", words: "Visi žodžiai", exam: "Egzaminas", progress: "Pažanga", hi: "Laba diena" },
};

export default function LearningPage() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const name = useAuthStore((s) => s.user?.displayName || s.user?.username || "");
    const t = TAB_LABELS[lang] || TAB_LABELS.ru;
    const tg = (interfaceTranslate[lang] || {});
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((x) => x.key === params.get("tab")) ? params.get("tab") : "today";
    const go = (k) => setParams((p) => { p.set("tab", k); return p; }, { replace: false });

    const [level, setLevel] = useState(null);
    const [placed, setPlaced] = useState(true);     // до загрузки считаем «откалибровано», чтобы не моргать тестом
    const [reloadKey, setReloadKey] = useState(0);
    const [session, setSession] = useState(null);   // { words, mode }
    const [info, setInfo] = useState(null);         // { no, wordId }
    const [placement, setPlacement] = useState(false);
    const [intro, setIntro] = useState(false);      // онбординг при первом заходе
    const [levelUp, setLevelUp] = useState(null);   // { from, to } — празднование перехода уровня

    useEffect(() => {
        try { if (!localStorage.getItem("learn_onboarded")) setIntro(true); } catch { /* */ }
        // как только открыли «Учёбу» — фоном греем первую сессию, чтобы старт был мгновенным
        useSessionStore.getState().prefetch(20);
    }, []);

    useEffect(() => {
        let on = true;
        api.learningStats().then((s) => {
            if (!on) return;
            const lv = s?.currentLevel || null;
            setLevel(lv); setPlaced(s?.placed !== false);
            // переход уровня: сравниваем с запомненным; первый раз просто запоминаем (без салюта)
            try {
                const seen = localStorage.getItem("learn_level_seen");
                if (lv) {
                    if (seen && LEVELS.indexOf(lv) > LEVELS.indexOf(seen)) setLevelUp({ from: seen, to: lv });
                    localStorage.setItem("learn_level_seen", lv);
                }
            } catch { /* */ }
        }).catch(() => {});
        return () => { on = false; };
    }, [reloadKey]);

    const closeIntro = () => { try { localStorage.setItem("learn_onboarded", "1"); } catch { /* */ } setIntro(false); if (placed === false) setPlacement(true); };

    // На мобилке прячем верхнюю шапку (лого/профиль) — навигация в нижнем таб-баре (CSS по body.study-active)
    useEffect(() => {
        document.body.classList.add("study-active");
        return () => document.body.classList.remove("study-active");
    }, []);

    // Мобильный хедер-навигация уезжает вместе со скроллом: смещаем на дельту прокрутки
    // (1:1, без снапа) в пределах [-высота, 0]. Вниз скроллишь — прячется, вверх — выезжает.
    const navRef = useRef(null);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 760px)");
        let lastY = window.scrollY;
        let offset = 0;
        let raf = 0;
        const apply = () => {
            raf = 0;
            const el = navRef.current;
            if (!el) return;
            if (!mq.matches) { el.style.transform = ""; offset = 0; lastY = window.scrollY; return; }
            const y = Math.max(0, window.scrollY);
            const h = el.offsetHeight || 64;
            const dy = y - lastY;
            lastY = y;
            offset = Math.min(0, Math.max(-h, offset - dy));
            if (y <= 0) offset = 0;                       // у самого верха всегда показан
            el.style.transform = `translateY(${offset}px)`;
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
    }, []);

    // openSession() без слов → системная сессия (LearningSession сам тянет программу с бэка).
    // openSession(words, mode) — легаси-путь с готовым набором (полки/«Слабые» из других вкладок).
    const openSession = (words = null, mode = "choice") => setSession({ words, mode, system: !words?.length });
    const openWord = (no, wordId) => setInfo({ no, wordId });
    const closeSession = (didPractice) => { setSession(null); if (didPractice) setReloadKey((k) => k + 1); };
    const openPlacement = () => setPlacement(true);
    const closePlacement = (didPlace) => { setPlacement(false); if (didPlace) setReloadKey((k) => k + 1); };

    const tabProps = { lang, go, openSession, openWord, openPlacement, placed, reloadKey, refresh: () => setReloadKey((k) => k + 1) };
    const Active = { today: TodayTab, words: WordsTab, exam: ExamTab, progress: ProgressTab }[tab];

    const segEl = (
        <div className="seg" role="tablist">
            {TABS.map((x) => (
                <button key={x.key} role="tab" aria-selected={tab === x.key}
                    className={"seg__item" + (tab === x.key ? " is-active" : "")} onClick={() => go(x.key)}>
                    <Icon n={x.icon} sm /> <span>{t[x.key]}</span>
                </button>
            ))}
        </div>
    );

    return (
        <main className="shell study-root study-main">
            {/* Мобильный липкий хедер-навигация (на десктопе скрыт). Уезжает вместе со скроллом. */}
            <div className="study-navbar" ref={navRef}>{segEl}</div>

            <div className="study-head">
                <div>
                    <span className="eyebrow"><Icon n="graduation" sm /> {t.title}{level ? ` · ${level}` : ""}</span>
                    <h1 className="h1" style={{ margin: "var(--sp-1) 0 0" }}>{t.hi}{name ? `, ${name}` : ""}</h1>
                </div>
                {segEl}
            </div>

            {Active && <Active {...tabProps} />}

            {session && (
                <LearningSession words={session.words} mode={session.mode} system={session.system} lang={lang} onClose={closeSession} />
            )}
            <WordInfoModal open={!!info} word={info?.no} wordId={info?.wordId}
                lang={lang} t={tg} onClose={() => { setInfo(null); }} />
            {placement && <PlacementScreen lang={lang} onClose={closePlacement} />}
            {intro && <LearningIntro lang={lang} onDone={closeIntro} />}
            {levelUp && <LevelUpToast lang={lang} to={levelUp.to} onClose={() => setLevelUp(null)} />}
        </main>
    );
}
