// Префетч учебной сессии: программу следующей сессии греем фоном, чтобы старт был мгновенным.
// ВАЖНО: следующую сессию собираем ТОЛЬКО когда прошлые ответы уже записаны (после завершения
// сессии), иначе бэк отдаст те же слова на том же шаге рампы (прогресс не виден). Поэтому take()
// сам НЕ планирует следующий префетч — это делает экран итога после записи ответов.
// ready/loading — для анимации кнопок старта (главный CTA, review-cta, «Ещё сессия»).
import { create } from "zustand";
import api from "../components/tools/api.js";
import { useSystemStore } from "./systemStore.jsx";

const SIZE = 20;

// Прогреть дистракторы «выборов» этой сессии — чтобы первый же вопрос открылся мгновенно.
function warmDistractors(r) {
    try {
        const lang = useSystemStore.getState().currentLanguage;
        const list = Array.isArray(r) ? r : (r?.elements || r?.items || r?.words || []);
        list.forEach((e) => {
            if (e?.mode === "choice") {
                api.prefetchPoolDistractors(e.pool_id ?? e.id, { n: 3, mode: e.direction || "int2no", lang });
            }
        });
    } catch { /* не критично */ }
}

export const useSessionStore = create((set, get) => ({
    ready: false,      // следующая сессия загружена и ждёт
    loading: false,    // идёт фоновая загрузка следующей сессии
    _promise: null,    // промис загрузки (pending/resolved)

    // Начать фоновую загрузку следующей сессии (если ещё не греется и не готова).
    prefetch: (size = SIZE) => {
        const st = get();
        if (st._promise) return st._promise; // уже готова/в полёте — не дублируем
        set({ loading: true, ready: false });
        const p = api.learningSession(size)
            .then((r) => { if (get()._promise === p) set({ ready: true, loading: false }); warmDistractors(r); return r; })
            .catch((e) => { if (get()._promise === p) set({ _promise: null, ready: false, loading: false }); throw e; });
        set({ _promise: p });
        return p;
    },

    // Забрать готовую (или начатую сейчас) сессию. Следующую НЕ планируем — её закажет экран итога.
    take: (size = SIZE) => {
        let p = get()._promise;
        if (!p) p = get().prefetch(size);
        set({ _promise: null, ready: false, loading: false });
        return p;
    },
}));
