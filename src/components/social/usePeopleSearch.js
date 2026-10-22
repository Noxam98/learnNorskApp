// Поиск людей по имени/логину с дебаунсом — общий для «Поделиться набором», «Найти друзей» и
// «Позвать в комнату». Ответы нумеруем: поздний ответ на старый запрос не перетирает свежий.
import { useEffect, useRef, useState } from "react";
import api from "../tools/api.js";

const DEBOUNCE_MS = 350;
export const MIN_Q = 2;

/**
 * @param {string} q
 * @param {boolean} [enabled] выкл → результаты чистятся (закрытая модалка)
 */
export function usePeopleSearch(q, enabled = true) {
    const [users, setUsers] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(false);
    const reqRef = useRef(0);
    const term = (q || "").trim();

    useEffect(() => {
        if (!enabled || term.length < MIN_Q) { reqRef.current++; setUsers([]); setLoading(false); return; }
        setLoading(true);
        const id = ++reqRef.current;
        const tm = setTimeout(() => {
            api.searchUsers(term)
                .then((r) => { if (id === reqRef.current) setUsers(r?.users || []); })
                .catch(() => { if (id === reqRef.current) setUsers([]); })
                .finally(() => { if (id === reqRef.current) setLoading(false); });
        }, DEBOUNCE_MS);
        return () => clearTimeout(tm);
    }, [term, enabled]);

    return {
        users, setUsers, loading,
        short: term.length > 0 && term.length < MIN_Q,   // ввели, но мало для поиска
        searched: term.length >= MIN_Q,                  // запрос активен (пустой ответ = «никого»)
    };
}
