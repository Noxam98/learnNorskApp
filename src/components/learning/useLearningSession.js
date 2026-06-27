// Контроллер сессии «Учёбы»: машина состояний (load → play → summary/empty), сбор системной
// программы с бэка, прогон по элементам, кормление SRS (/learning/answer), счётчики итога и
// «ещё сессия». Вся логика — здесь; LearningSession.jsx — только экраны. Вынесено из LearningSession.jsx.
import { useEffect, useState } from "react";
import { useSessionStore } from "../../store/sessionStore.jsx";
import api from "../tools/api.js";

// Направление перевода для легаси-набора (единое на сессию: родной → норвежский).
export const LEGACY_DIR = "int2no";

// привести слово к форме, понятной играм: id = pool_id; translate.no — гарантированно есть.
/**
 * @param {any} w слово из БД/сессии
 * @param {import('../../types.js').UiLang} lang
 * @returns {import('../../types.js').GameWord}
 */
const toGameWord = (w, lang) => {
    const pid = w?.pool_id ?? w?.id;
    return {
        ...w, id: pid, pool_id: pid,
        translate: {
            ...(w?.translate || {}),
            no: w?.translate?.no?.length ? w.translate.no : [w?.no].filter(Boolean),
            [lang]: w?.translate?.[lang]?.length ? w.translate[lang] : (w?.translate?.[lang] || []),
        },
    };
};
export const toGameWords = (list, lang) => (list || [])
    .filter((w) => w && (w.pool_id ?? w.id) != null)
    .map((w) => toGameWord(w, lang));

// Элементы системной программы → [{ mode, dir, step, repeat, gw }] (игра монтируется на одном слове).
/**
 * @param {import('../../types.js').SessionElement[]} list
 * @param {import('../../types.js').UiLang} lang
 * @returns {import('../../types.js').NormElement[]}
 */
const toElements = (list, lang) => (list || [])
    .filter((e) => e && (e.pool_id ?? e.id) != null)
    .map((e) => ({
        mode: e.mode || "choice",
        dir: e.direction || LEGACY_DIR,
        step: e.step || null,        // клетка рампы (для оттенка прогресса по стадии)
        repeat: !!e.repeat,          // повтор (уже учил) — для пометки в игре
        gw: toGameWord(e, lang),
    }));

export function useLearningSession({ words = [], system = false, setId = null, lang = "ru", onClose }) {
    // Системный путь — когда явно сказано system или набор не передан.
    const isSystem = system || !words?.length;

    const [phase, setPhase] = useState(isSystem ? "load" : "play"); // load | play | summary | empty
    const [round, setRound] = useState(0);   // ключ перезапуска всей сессии
    const [isDesktop] = useState(() => { try { return matchMedia("(hover: hover) and (pointer: fine) and (min-width: 641px)").matches; } catch { return false; } });

    // Системная программа: список элементов + указатель.
    const [elements, setElements] = useState([]);
    const [idx, setIdx] = useState(0);

    // Легаси-набор: один режим на весь массив.
    const [legacyGw] = useState(() => toGameWords(words, lang));

    // Прогресс сессии: упражнения (ответы) и карточки считаем РАЗДЕЛЬНО.
    const [res, setRes] = useState({ correct: 0, total: 0 }); // только упражнения
    const [cards, setCards] = useState(0);                    // показано карточек-интро
    const [hist, setHist] = useState([]);                     // итог по каждому пройденному элементу: "ok"|"err"|"card"
    const [graduated, setGraduated] = useState(0);            // слов «выпущено» за сессию: ввод (штатная клава) с 1-й попытки → больше не придут
    const [protectedNow, setProtectedNow] = useState(0);      // «защищено» за сессию: повтор-слова, прошедшие финальную стадию (ввод) чисто
    const [protectedTypo, setProtectedTypo] = useState(0);    // из них принятых С ОПЕЧАТКОЙ (отдельный пункт итога)
    const [after, setAfter] = useState(null); // свежая статистика после сессии
    const [gate, setGate] = useState(null);   // состояние ворот экзамена (для итога системной сессии)
    const [busy, setBusy] = useState(false);

    // Подтянуть системную программу с бэка.
    const loadProgram = async () => {
        try {
            // дрилл по набору (setId) — тянем сессию набора напрямую; иначе берём заранее
            // прогретую общую сессию (мгновенно, если готова); следующую закажет экран итога
            const r = setId ? await api.setSession(setId, 20, lang) : await useSessionStore.getState().take(20);
            const list = Array.isArray(r) ? r : (r?.elements || r?.items || r?.words || []);
            const els = toElements(list, lang);
            if (els.length) {
                // Варианты «выбора» приходят inline в элементах сессии. Догружаем дистракторы ТОЛЬКО
                // для тех choice, где их вдруг нет (страховка) — и ждём их, чтобы внутри сессии ничего
                // не тормозило. Обычно тут пусто → лоадер не задерживается.
                await Promise.all(els
                    .filter((e) => e.mode === "choice" && !(e.gw?.options?.length || e.gw?.distractors?.length))
                    .map((e) => api.getPoolDistractors(e.gw?.pool_id, { n: 3, mode: e.dir, lang }).catch(() => null)));
                setElements(els); setIdx(0); setRes({ correct: 0, total: 0 }); setCards(0); setHist([]); setGraduated(0); setProtectedNow(0); setProtectedTypo(0); setAfter(null); setPhase("play");
            }
            else { setPhase("empty"); }
        } catch {
            setPhase("empty");
        }
    };

    useEffect(() => {
        if (isSystem && phase === "load") loadProgram();
    }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

    // Ответ → SRS. Направление берём у текущего элемента (системный) либо общее (легаси).
    const onResult = (w, ok, gmode, direction) => {
        api.learningAnswer({
            pool_id: w?.pool_id ?? w?.id,
            correct: ok,
            mode: gmode,
            direction,
        }).catch(() => { /* офлайн — не критично */ });
    };

    // Карточка-интро (study): фиксируем «слово показано». Бэк за study обновляет окно силы и
    // счётчики (но НЕ клетки рампы) — поэтому слово перестаёт быть «совсем новым» и рампа на
    // следующем заходе ведёт его к упражнениям (выбор → сборка → ввод).
    const recordIntro = (w) => {
        api.learningAnswer({ pool_id: w?.pool_id ?? w?.id, correct: true, mode: "study", direction: null })
            .catch(() => { /* офлайн — не критично */ });
    };

    // Показать итог + подтянуть статистику.
    const showSummary = async () => {
        setPhase("summary");
        try { setAfter(await api.learningStats()); } catch { /* */ }
        if (isSystem) { try { setGate(await api.learningGate()); } catch { /* */ } }
        // следующую сессию греем ПОСЛЕ статов — к этому моменту ответы записаны, и бэк отдаст
        // свежий состав (со сдвинутыми по рампе словами), а не те же «выборы». В дрилле по набору
        // общую сессию не греем (там «Ещё» перечитывает сессию набора напрямую в loadProgram).
        if (!setId) useSessionStore.getState().prefetch(20);
    };

    // Финиш одной игры. isStudy=true — это была карточка-интро (НЕ ответ): считаем отдельно.
    // Системный путь: переходим к следующему элементу либо к итогу. Легаси: сразу итог.
    const onGameFinish = (stats, isStudy = false, gmode = null) => {
        const got = stats || { total: 0, correct: 0 };
        if (isStudy) setCards((c) => c + (got.total || 1));
        else setRes((p) => ({ correct: p.correct + (got.correct || 0), total: p.total + (got.total || 0) }));
        // «выпущено за сессию»: ввод (штатная клава) с ПЕРВОЙ попытки = слово прошло рампу и больше не придёт
        if (!isStudy && gmode === "input" && (got.correct || 0) > 0) setGraduated((g) => g + (got.correct || 0));
        // «защищено за сессию»: повтор-слово, прошедшее финальную стадию (ввод) — закрепилось.
        // Если ввод приняли С ОПЕЧАТКОЙ (got.typo) — отдельный счётчик (отдельный пункт итога).
        if (!isStudy && gmode === "input" && (got.correct || 0) > 0 && elements[idx]?.repeat) {
            if (got.typo) setProtectedTypo((p) => p + 1);
            else setProtectedNow((p) => p + (got.correct || 0));
        }
        // запоминаем исход элемента для полосы прогресса сессии
        setHist((h) => [...h, isStudy ? "card" : ((got.correct || 0) > 0 ? "ok" : "err")]);
        if (isSystem) {
            if (idx + 1 < elements.length) setIdx((n) => n + 1);
            else showSummary();
        } else {
            showSummary();
        }
    };

    // «Не учить» из игры: жалоба на текущее слово (мусор) → убрать у себя + админу, и пропустить элемент.
    const reportCurrent = async () => {
        const gw = elements[idx]?.gw;
        if (!gw) return;
        const pid = gw.pool_id ?? gw.id;
        try { await api.learningReport(pid); } catch { /* офлайн — не критично */ }
        // без тоста — просто убираем слово и идём дальше
        setHist((h) => [...h, "skip"]);
        if (idx + 1 < elements.length) setIdx((n) => n + 1);
        else showSummary();
    };

    // «Уже знаю» из карточки: слово сразу в Выучено (mastered), без тоста, и идём дальше.
    const knowCurrent = async () => {
        const gw = elements[idx]?.gw;
        if (!gw) return;
        try { await api.learningStatus(gw.pool_id ?? gw.id, "known"); } catch { /* офлайн — не критично */ }
        setHist((h) => [...h, "ok"]);
        if (idx + 1 < elements.length) setIdx((n) => n + 1);
        else showSummary();
    };

    // Запустить ещё одну сессию заново.
    const again = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (isSystem) {
                setElements([]); setIdx(0); setRes({ correct: 0, total: 0 }); setAfter(null);
                setPhase("load"); setRound((n) => n + 1);
            } else {
                // Легаси «ещё» — добираем актуальные «к повторению».
                const r = await api.learningDue(20).catch(() => null);
                const next = toGameWords(r?.words || [], lang);
                if (next.length) { setRes({ correct: 0, total: 0 }); setAfter(null); setRound((n) => n + 1); setPhase("play"); }
                else { setAfter((a) => ({ ...(a || {}), _empty: true })); }
            }
        } finally { setBusy(false); }
    };

    // Десктоп: Enter на экране результата → «Ещё сессия» (если кнопка доступна — не ворота экзамена / есть что учить)
    useEffect(() => {
        if (phase !== "summary") return;
        const examGate = isSystem && !!gate?.open;
        const sLeft = (after?.due ?? 0) + (after?.byStatus?.new || 0) + (after?.byStatus?.weak || 0);
        const noneLeft = sLeft <= 0 || after?._empty;
        if (!((isSystem && !examGate) || (!isSystem && !noneLeft))) return;
        const onKey = (e) => { if (e.code === "Enter" || e.code === "NumpadEnter") { e.preventDefault(); again(); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase, after, gate, isSystem]); // eslint-disable-line

    // Esc в любой игре — выйти из учёбы (общий обработчик на сессию)
    useEffect(() => {
        if (phase !== "play") return;
        const onKey = (e) => { if (e.code === "Escape") { e.preventDefault(); onClose?.(true); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase]); // eslint-disable-line

    return {
        isSystem, phase, round, isDesktop, elements, idx, legacyGw,
        res, cards, hist, graduated, protectedNow, protectedTypo, after, gate, busy,
        onResult, recordIntro, onGameFinish, reportCurrent, knowCurrent, again,
    };
}
