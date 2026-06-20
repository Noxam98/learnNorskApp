// Раздел «Учёба»: заголовок + сегмент-переключатель (Сегодня/Все слова/Экзамен/Прогресс)
// с клиентским роутингом по ?tab=. Управляет общими оверлеями: сессия практики и карточка слова.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../../components/ui/Icon.jsx";
import { WordInfoModal } from "../../components/ui/WordInfoModal.jsx";
import LearningSession from "../../components/learning/LearningSession.jsx";
import PlacementScreen from "../../components/learning/PlacementScreen.jsx";
import api from "../../components/tools/api.js";
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

    useEffect(() => {
        let on = true;
        api.learningStats().then((s) => { if (on) { setLevel(s?.currentLevel || null); setPlaced(s?.placed !== false); } }).catch(() => {});
        return () => { on = false; };
    }, [reloadKey]);

    // На мобилке прячем верхнюю шапку (лого/профиль) — навигация в нижнем таб-баре (CSS по body.study-active)
    useEffect(() => {
        document.body.classList.add("study-active");
        return () => document.body.classList.remove("study-active");
    }, []);

    const openSession = (words, mode = "choice") => { if (words?.length) setSession({ words, mode }); };
    const openWord = (no, wordId) => setInfo({ no, wordId });
    const closeSession = (didPractice) => { setSession(null); if (didPractice) setReloadKey((k) => k + 1); };
    const openPlacement = () => setPlacement(true);
    const closePlacement = (didPlace) => { setPlacement(false); if (didPlace) setReloadKey((k) => k + 1); };

    const tabProps = { lang, go, openSession, openWord, openPlacement, placed, reloadKey, refresh: () => setReloadKey((k) => k + 1) };
    const Active = { today: TodayTab, words: WordsTab, exam: ExamTab, progress: ProgressTab }[tab];

    return (
        <main className="shell study-root study-main">
            <div className="study-head">
                <div>
                    <span className="eyebrow"><Icon n="graduation" sm /> {t.title}{level ? ` · ${level}` : ""}</span>
                    <h1 className="h1" style={{ margin: "var(--sp-1) 0 0" }}>{t.hi}{name ? `, ${name}` : ""}</h1>
                </div>
                <div className="seg" role="tablist">
                    {TABS.map((x) => (
                        <button key={x.key} role="tab" aria-selected={tab === x.key}
                            className={"seg__item" + (tab === x.key ? " is-active" : "")} onClick={() => go(x.key)}>
                            <Icon n={x.icon} sm /> <span>{t[x.key]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {Active && <Active {...tabProps} />}

            {session && (
                <LearningSession words={session.words} mode={session.mode} lang={lang} onClose={closeSession} />
            )}
            <WordInfoModal open={!!info} word={info?.no} wordId={info?.wordId}
                lang={lang} t={tg} onClose={() => { setInfo(null); }} />
            {placement && <PlacementScreen lang={lang} onClose={closePlacement} />}
        </main>
    );
}
