// Контроллер вкладки «Сегодня»: грузит статистику/ворота, считает ЧЕСТНЫЙ состав следующей сессии
// (из префетча), прогресс к след. уровню CEFR, авто-добор пустой учёбы и фокус-темы. Возвращает
// данные + действия; разметку (баннеры/кольцо/панель тем/состав) рисует TodayTab. Вынесено из TodayTab.jsx.
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../components/tools/api.js";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function useToday({ reloadKey, refresh, openSession }) {
    const [stats, setStats] = useState(null);
    const [gate, setGate] = useState(null);   // {pack, threshold, open} — ворота экзамена пачки
    const [listen, setListen] = useState(null); // {pending, pack, ready, audio} — слуховая партия
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lbOpen, setLbOpen] = useState(false);   // открыта модалка полного рейтинга
    const [focusSaving, setFocusSaving] = useState(false);
    const focusTopicsSel = useAuthStore((s) => s.user?.focusTopics);
    const autoFillTried = useRef(false);       // авто-добор пустой учёбы — один раз за монтирование
    const sessionLoading = useSessionStore((s) => s.loading); // следующая сессия ещё грузится фоном

    useEffect(() => {
        let on = true;
        setLoading(true);
        setError(false);
        api.learningGate().then((g) => { if (on) setGate(g || null); }).catch(() => { if (on) setGate(null); });
        api.getListenStatus().then((s) => { if (on) setListen(s || null); }).catch(() => { if (on) setListen(null); });
        api.learningStats()
            .then((s) => { if (on) { setStats(s || null); setLoading(false); } })
            .catch(() => { if (on) { setError(true); setLoading(false); } });
        return () => { on = false; };
    }, [reloadKey]);

    // Ворота экзамена пачки: open → можно/нужно сдавать экзамен (новые слова заблокированы).
    const gateOpen = !!gate?.open;
    const gatePack = gate?.pack || 0;
    const gateThreshold = gate?.threshold || 0;
    const gateLeft = Math.max(0, gateThreshold - gatePack);

    // Слуховая партия: показываем карточку, когда аудио вкл и есть слова в ожидании слуха.
    const listenAudio = !!listen?.audio;
    const listenPending = listen?.pending || 0;
    const listenPack = listen?.pack || 0;
    const listenReady = !!listen?.ready;                                   // pending >= pack — партия готова
    const listenLeft = Math.max(0, listenPack - listenPending);            // ещё M до партии
    const listenShow = listenAudio && listenPending > 0;                   // есть что подтверждать на слух
    // Старт слуховой сессии — системный путь с источником /learning/listen.
    const runListen = () => openSession(null, "choice", { listen: true });

    const by = stats?.byStatus || {};
    const total = stats?.total || 0;
    const placed = stats?.placed;

    // ЧЕСТНЫЙ состав: берём из реально собранной (префетч) следующей сессии — ровно то, что увидит
    // пользователь (новых не больше NEW_PER_SESSION). Пока сессия не прогрелась — оценка из stats.
    const sess = useSessionStore((s) => s.next);
    const sessComp = (sess?.composition && sess.composition.total > 0) ? sess.composition : null;
    // Состав показываем ТОЛЬКО когда реальная сессия прогрелась (sessReady) — без оценки из пула.
    const sessReady = !!sessComp;
    const composition = useMemo(() => sessComp ? {
        review: sessComp.review || 0,
        progress: sessComp.progress || 0,
        weak: sessComp.weak || 0,
        fresh: sessComp.fresh || 0,
        phrases: sessComp.phrases || 0,   // устойчивые выражения в сессии (показываем, если есть)
        grammar: sessComp.grammar || 0,   // грамм-упражнения (род/формы) в сессии — только из реальной
    } : {
        review: by.repeat || 0,        // Повторение (выучено + подошёл срок)
        progress: by.in_progress || 0, // В процессе (начато, ещё не выучено)
        weak: by.weak || 0,            // Слабые
        fresh: by.new || 0,            // Новые
        phrases: 0,                    // фразы не оцениваем из пула — только из реальной сессии
        grammar: 0,                    // грамматику не оцениваем из пула — только из реальной сессии
    }, [sessComp, by.repeat, by.in_progress, by.weak, by.new]);
    // Сколько реально будет в следующей сессии (для крупной цифры на кнопке). До прогрева — оценка из stats.
    const learnable = sessComp ? sessComp.total
        : (by.repeat || 0) + (by.in_progress || 0) + (by.weak || 0) + (by.new || 0);

    // Авто-добор: у юзера ВООБЩЕ нет слов в учёбе (total=0) и ворота не закрыты — система сама
    // подсыпает новые из Базы (сборка сессии на бэке делает suggest_words). Один раз за монтирование.
    useEffect(() => {
        if (loading || !stats || autoFillTried.current) return;
        if (total === 0 && !gateOpen) {
            autoFillTried.current = true;
            api.learningSession(20)
                .then((r) => { if ((r?.words || []).length) refresh(); })
                .catch(() => { });
        }
    }, [loading, stats, total, gateOpen, refresh]);

    const streak = stats?.streak || 0;
    // Главный CTA — системная сессия: режим/состав выбирает система (openSession без слов).
    const runReview = () => openSession();
    const isEmpty = total === 0 || learnable === 0;

    // Прогресс до следующего уровня CEFR — по ВСЕМУ активному словарю (выучено+повтор+архив) против
    // суммарного порога след. уровня (кумулятивны), а не по словам одного CEFR-тега.
    const curLevel = stats?.currentLevel || "A1";
    const nextLevel = CEFR[CEFR.indexOf(curLevel) + 1] || null;
    const masteredAll = (by.mastered || 0) + (by.repeat || 0) + (by.archived || 0);
    const nextTarget = nextLevel ? (stats?.byLevel?.[nextLevel]?.target || 0) : 0;
    const toNext = nextLevel ? Math.max(0, nextTarget - masteredAll) : 0;
    const masteryFrac = (nextLevel && nextTarget) ? Math.min(1, masteredAll / nextTarget) : 1;
    const ringNum = masteredAll;
    const ringDen = nextLevel ? nextTarget : masteredAll;

    // Фокус на темах: ~треть новых слов будет из выбранных тем (бэк-смещение в suggest_words).
    const focusTopics = focusTopicsSel || [];
    const toggleFocus = async (key) => {
        if (focusSaving) return;
        const next = focusTopics.includes(key) ? focusTopics.filter((x) => x !== key) : [...focusTopics, key];
        setFocusSaving(true);
        useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, focusTopics: next } : s.user }));  // оптимистично
        try { await api.setFocusTopics(next); } catch { /* /me перечитает позже */ }
        setFocusSaving(false);
    };

    return {
        stats, gate, loading, error, lbOpen, setLbOpen, focusSaving, sessionLoading,
        gateOpen, gatePack, gateThreshold, gateLeft, by, total, placed,
        composition, learnable, streak, isEmpty, sessReady,
        listenShow, listenReady, listenPending, listenPack, listenLeft, runListen,
        curLevel, nextLevel, masteredAll, nextTarget, toNext, masteryFrac, ringNum, ringDen,
        focusTopics, toggleFocus, runReview,
    };
}
