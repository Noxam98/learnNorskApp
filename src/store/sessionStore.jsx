// Префетч учебной сессии: программу следующей сессии греем фоном, чтобы старт был мгновенным.
// Сессия приходит УКОМПЛЕКТОВАННОЙ: варианты «выбора» (options) бэк кладёт прямо в элементы —
// отдельных запросов за дистракторами во время сессии нет.
// ВАЖНО: следующую сессию собираем ТОЛЬКО когда прошлые ответы уже записаны (после завершения
// сессии), иначе бэк отдаст те же слова на том же шаге рампы (прогресс не виден). Поэтому take()
// сам НЕ планирует следующий префетч — это делает экран итога после записи ответов.
// ready/loading — для анимации кнопок старта (главный CTA, review-cta, «Ещё сессия»).
import { create } from "zustand";
import api from "../components/tools/api.js";
import { useSystemStore } from "./systemStore.jsx";

const SIZE = 20;
const lang = () => useSystemStore.getState().currentLanguage;

export const useSessionStore = create((set, get) => ({
    ready: false,      // следующая сессия загружена и ждёт
    loading: false,    // идёт фоновая загрузка следующей сессии
    _promise: null,    // промис загрузки (pending/resolved)
    next: null,        // готовая программа следующей сессии {words, composition} — для ЧЕСТНОЙ кнопки старта
    builtAt: 0,        // когда сессия была собрана (срок годности превью Smart Review)

    // Начать фоновую загрузку следующей сессии (если ещё не греется и не готова).
    prefetch: (size = SIZE) => {
        const st = get();
        if (st._promise) return st._promise; // уже готова/в полёте — не дублируем
        set({ loading: true, ready: false });
        const p = api.learningSession(size, lang())
            .then((r) => { if (get()._promise === p) set({ ready: true, loading: false, next: r, builtAt: Date.now() }); return r; })
            .catch((e) => { if (get()._promise === p) set({ _promise: null, ready: false, loading: false, next: null }); throw e; });
        set({ _promise: p });
        return p;
    },

    // Срок годности прогретой сессии: за часы простоя фаза цикла/повторы уезжают, и превью
    // Smart Review показывало бы (и take() отдавал бы) протухший слепок. Старше maxAgeMs →
    // пересобираем фоном (зовёт экран «Сегодня» при монтировании и возврате во вкладку).
    refreshIfStale: (maxAgeMs = 10 * 60 * 1000, size = SIZE) => {
        const st = get();
        if (st.loading || !st.next) return;                    // греется / нечего освежать
        if (Date.now() - st.builtAt <= maxAgeMs) return;       // ещё свежая
        set({ _promise: null, next: null, ready: false });
        get().prefetch(size);
    },

    // Забрать готовую (или начатую сейчас) сессию. Следующую НЕ планируем — её закажет экран итога.
    take: (size = SIZE) => {
        let p = get()._promise;
        if (!p) p = get().prefetch(size);
        set({ _promise: null, ready: false, loading: false, next: null });
        return p;
    },
}));
