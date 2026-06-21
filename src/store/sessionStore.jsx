// Префетч учебной сессии: программу следующей сессии греем фоном, чтобы старт был мгновенным.
// Один «слот» = одна заранее загруженная сессия. take() забирает её и сразу греет следующую.
// ready/loading — для анимации кнопок старта (их несколько: главный CTA, review-cta, «Ещё сессия»).
import { create } from "zustand";
import api from "../components/tools/api.js";

const SIZE = 20;

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
            .then((r) => { if (get()._promise === p) set({ ready: true, loading: false }); return r; })
            .catch((e) => { if (get()._promise === p) set({ _promise: null, ready: false, loading: false }); throw e; });
        set({ _promise: p });
        return p;
    },

    // Забрать готовую (или начатую сейчас) сессию и СРАЗУ начать греть следующую.
    take: (size = SIZE) => {
        let p = get()._promise;
        if (!p) p = get().prefetch(size);
        set({ _promise: null, ready: false, loading: false });
        setTimeout(() => get().prefetch(size), 0); // следующую — фоном, не блокируя
        return p;
    },
}));
