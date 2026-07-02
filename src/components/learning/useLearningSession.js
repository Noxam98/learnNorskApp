// Контроллер сессии «Учёбы»: машина состояний (load → play → summary/empty), сбор системной
// программы с бэка, прогон по элементам, кормление SRS (/learning/answer), счётчики итога и
// «ещё сессия». Вся логика — здесь; LearningSession.jsx — только экраны. Вынесено из LearningSession.jsx.
import { useEffect, useState } from "react";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { isGrammar } from "../gameComponents/gameShared.jsx";
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
        listen: !!e.listen,          // аудио-узнавание (из /learning/listen) → ChoiceGame на слух
        gw: toGameWord(e, lang),
    }));

export function useLearningSession({ words = [], system = false, setId = null, listen = false, lang = "ru", newPerSession = 6, onClose }) {
    // Системный путь — когда явно сказано system или набор не передан.
    const isSystem = system || !words?.length;
    // Слуховая сессия: источник — /learning/listen (аудио-узнавание выученных слов), а не дневная.
    const isListen = !!listen;
    // Норма новых слов за сессию (настройка профиля): СКОЛЬКО карточек нужно ПРИНЯТЬ (тык в карточку).
    // Кнопки («уже знаю»/«не актуально»/«ошибка») карточку не засчитывают — взамен догружаем новую.
    const target = Math.min(10, Math.max(1, newPerSession || 6));

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
    const [cyclePhase, setCyclePhase] = useState("words"); // фаза цикла ЭТОЙ сессии (words|forms)
    const [batchDone, setBatchDone] = useState(false);     // партия форм сдана этой сессией (баннер итога)
    const [gate, setGate] = useState(null);   // состояние ворот экзамена (для итога системной сессии)
    const [busy, setBusy] = useState(false);
    // «Живая» сессия: добор карточек до нормы принятых (target).
    const [acceptedNew, setAcceptedNew] = useState(0);   // принято карточек (тык-в-карточку) за сессию
    const [poolDry, setPoolDry] = useState(false);       // пул новых исчерпан / ворота закрыты → больше не добираем
    const [loadingNext, setLoadingNext] = useState(false); // ждём догрузку следующей карточки (только когда текущая — последняя)

    // Подтянуть системную программу с бэка.
    const loadProgram = async () => {
        try {
            // слуховая сессия (listen) — тянем партию аудио-узнавания напрямую; дрилл по набору
            // (setId) — сессию набора; иначе берём заранее прогретую общую (мгновенно, если готова),
            // а следующую закажет экран итога.
            const r = isListen ? await api.getListenSession(20, lang)
                : setId ? await api.setSession(setId, 20, lang)
                : await useSessionStore.getState().take(20);
            const list = Array.isArray(r) ? r : (r?.elements || r?.items || r?.words || []);
            const els = toElements(list, lang);
            setCyclePhase(r?.composition?.phase || "words");
            setBatchDone(false);
            if (els.length) {
                // Варианты «выбора» приходят inline в элементах сессии. Догружаем дистракторы ТОЛЬКО
                // для тех choice, где их вдруг нет (страховка) — и ждём их, чтобы внутри сессии ничего
                // не тормозило. Обычно тут пусто → лоадер не задерживается.
                await Promise.all(els
                    .filter((e) => e.mode === "choice" && !(e.gw?.options?.length || e.gw?.distractors?.length))
                    .map((e) => api.getPoolDistractors(e.gw?.pool_id, { n: 3, mode: e.dir, lang }).catch(() => null)));
                setElements(els); setIdx(0); setRes({ correct: 0, total: 0 }); setCards(0); setHist([]); setGraduated(0); setProtectedNow(0); setProtectedTypo(0); setAfter(null);
                setAcceptedNew(0); setPoolDry(false); setLoadingNext(false);
                setPhase("play");
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
    // Трек ФОРМ (form_track): ответ уходит с form/cell/stage → бэк пишет в form_srs (отдельный
    // SRS-слой рампы форм card→choose→produce), base-рампу слова не трогает.
    const onResult = (w, ok, gmode, direction) => {
        api.learningAnswer({
            pool_id: w?.pool_id ?? w?.id,
            correct: ok,
            mode: gmode,
            direction,
            ...(w?.form_track ? { form: true, cell: w.step, stage: w.stage } : {}),
        }).catch(() => { /* офлайн — не критично */ });
    };

    // Карточка-интро (study): фиксируем «слово показано». Бэк за study обновляет окно силы и
    // счётчики (но НЕ клетки рампы) — поэтому слово перестаёт быть «совсем новым» и рампа на
    // следующем заходе ведёт его к упражнениям (выбор → сборка → ввод).
    // Карточка ФОРМЫ (form_track): показ двигает ступень card→choose в form_srs.
    const recordIntro = (w) => {
        api.learningAnswer({
            pool_id: w?.pool_id ?? w?.id, correct: true, mode: "study", direction: null,
            ...(w?.form_track ? { form: true, cell: w.step, stage: "card" } : {}),
        }).catch(() => { /* офлайн — не критично */ });
    };

    // Показать итог + подтянуть статистику.
    const showSummary = async () => {
        setPhase("summary");
        try { setAfter(await api.learningStats()); } catch { /* */ }
        if (isSystem) { try { setGate(await api.learningGate()); } catch { /* */ } }
        // следующую сессию греем ПОСЛЕ статов — к этому моменту ответы записаны, и бэк отдаст
        // свежий состав (со сдвинутыми по рампе словами), а не те же «выборы». В дрилле по набору
        // и в слуховой сессии общую дневную не греем (там «Ещё» перечитывает свой источник напрямую).
        // Заодно ловим ЗАКРЫТИЕ ПАРТИИ ФОРМ: эта сессия была фазой форм, следующая — уже слова.
        if (!setId && !isListen) {
            useSessionStore.getState().prefetch(20)
                .then((nxt) => { if (cyclePhase === "forms" && (nxt?.composition?.phase || "words") === "words") setBatchDone(true); })
                .catch(() => { /* офлайн */ });
        }
    };

    // Финиш одной игры. isStudy=true — это была карточка-интро (НЕ ответ): считаем отдельно.
    // Системный путь: переходим к следующему элементу либо к итогу. Легаси: сразу итог.
    const onGameFinish = (stats, isStudy = false, gmode = null) => {
        const got = stats || { total: 0, correct: 0 };
        // Грамм-упражнение (choice_gender / input_indefpl): mode совпадает с обычными играми
        // ("input"/"choice"), но это ОТДЕЛЬНЫЙ тир — бэк его в «выучено»/CEFR не считает. Поэтому
        // исключаем из «выпущено за сессию»/«защищено» (иначе input_indefpl ложно завышал бы их
        // и зелёную прибавку прогресса к след. уровню). Флаг grammar/target несёт элемент (на gw).
        const isGrammarEl = isGrammar(elements[idx]?.gw);
        // тык-в-карточку = ПРИНЯЛ слово в учёбу → засчитываем в норму (target). Кнопки не сюда.
        if (isStudy) { setCards((c) => c + (got.total || 1)); setAcceptedNew((a) => a + (got.total || 1)); }
        else setRes((p) => ({ correct: p.correct + (got.correct || 0), total: p.total + (got.total || 0) }));
        // «выпущено за сессию»: ввод (штатная клава) с ПЕРВОЙ попытки = слово прошло рампу и больше не придёт
        if (!isStudy && !isGrammarEl && gmode === "input" && (got.correct || 0) > 0) setGraduated((g) => g + (got.correct || 0));
        // «защищено за сессию»: повтор-слово, прошедшее финальную стадию (ввод) — закрепилось.
        // Если ввод приняли С ОПЕЧАТКОЙ (got.typo) — отдельный счётчик (отдельный пункт итога).
        if (!isStudy && !isGrammarEl && gmode === "input" && (got.correct || 0) > 0 && elements[idx]?.repeat) {
            if (got.typo) setProtectedTypo((p) => p + 1);
            else setProtectedNow((p) => p + (got.correct || 0));
        }
        // запоминаем исход элемента для полосы прогресса сессии; ЗОЛОТО — слово прошло всю рампу
        // впервые (финальный ввод, не повтор, не грамм-тир) — «здесь родилось выученное слово»
        const gold = !isStudy && !isGrammarEl && gmode === "input" && (got.correct || 0) > 0 && !elements[idx]?.repeat;
        setHist((h) => [...h, isStudy ? "card" : gold ? "mst" : ((got.correct || 0) > 0 ? "ok" : "err")]);
        if (isSystem) {
            if (idx + 1 < elements.length) setIdx((n) => n + 1);
            else showSummary();
        } else {
            showSummary();
        }
    };

    // ── «Живая» сессия: карточки, убранные кнопкой, не в зачёт нормы → догружаем замену ──────────
    const cardsAfter = (els, i) => els.slice(i + 1).filter((e) => e.step === "card").length;  // карточек ПОСЛЕ текущей
    const queuedCardPids = (els) => els.filter((e) => e.step === "card").map((e) => e.gw?.pool_id ?? e.gw?.id).filter((x) => x != null);
    // Догрузить deficit новых карточек в КОНЕЦ очереди. Возвращает число реально добавленных.
    const topUp = async (deficit) => {
        if (deficit <= 0 || poolDry) return 0;
        let r;
        try { r = await api.learningNextCards(deficit, queuedCardPids(elements)); }
        catch { return 0; }
        if (r?.blocked) { setPoolDry(true); return 0; }
        const fresh = toElements(r?.cards || [], lang);
        if (!fresh.length) { setPoolDry(true); return 0; }   // пул новых исчерпан → больше не дёргаем
        setElements((els) => [...els, ...fresh]);
        return fresh.length;
    };
    // Общий путь кнопок «убрать» карточку (know/skip/report): действие в фоне, карточка не в зачёт,
    // при дефиците нормы — добор. mark — отметка полосы прогресса ("ok" у «уже знаю», иначе "skip").
    const dismissAndNext = async (doAction, mark) => {
        const el = elements[idx];
        const gw = el?.gw;
        if (!gw) return;
        doAction(gw.pool_id ?? gw.id).catch(() => { /* офлайн — не критично */ });
        setHist((h) => [...h, mark]);
        if (!isSystem) { showSummary(); return; }                 // легаси-путь — как раньше
        // добор — только в ОБЫЧНОЙ сессии (не в дрилле набора: там очередь = слова набора, чужие
        // из общего пула подмешивать нельзя) и только для карточек-знакомств (упражнения → deficit=0).
        const deficit = (!setId && el.step === "card") ? (target - acceptedNew - cardsAfter(elements, idx)) : 0;
        if (idx + 1 < elements.length) {
            setIdx((n) => n + 1);                                 // следующий элемент уже готов — мгновенно
            if (deficit > 0) topUp(deficit);                      // фоном дольёт карточки в конец
        } else if (deficit > 0 && !poolDry) {
            setLoadingNext(true);                                 // текущая — последняя: ждём замену
            const added = await topUp(deficit);
            setLoadingNext(false);
            if (added > 0) setIdx((n) => n + 1);
            else showSummary();
        } else {
            showSummary();
        }
    };

    // «Не учить» → «Ошибка в слове»: жалоба (мусор/некорректно) → убрать у себя + на модерацию.
    const reportCurrent = () => dismissAndNext((pid) => api.learningReport(pid), "skip");
    // «Не учить» → «Не актуально»: убрать слово ТОЛЬКО из своей Учёбы (без модерации).
    const skipCurrent = () => dismissAndNext((pid) => api.learningSkip(pid), "skip");
    // «Уже знаю»: слово сразу в Выучено (mastered). Карточка не в зачёт нормы.
    const knowCurrent = () => dismissAndNext((pid) => api.learningStatus(pid, "known"), "ok");

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
        isSystem, isListen, phase, round, isDesktop, elements, idx, legacyGw,
        res, cards, hist, graduated, protectedNow, protectedTypo, after, gate, busy, loadingNext,
        batchDone,
        onResult, recordIntro, onGameFinish, reportCurrent, skipCurrent, knowCurrent, again,
    };
}
