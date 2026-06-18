import { useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import api from "../components/tools/api.js";

// Подразделы — отдельные роуты (/game, /online), чтобы URL отражал вкладку и был
// шарабельным. Общий переключатель сверху; активная вкладка определяется адресом.
// Последний режим сохраняется в БД (gameMode) → /games редиректит на него.
const PATH = { solo: "/game", online: "/online" };

export const GamesLayout = ({ children }) => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[lang];
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const mode = pathname === "/online" ? "online" : "solo";

    // Запоминаем последний открытый режим (и при клике, и при заходе по прямой ссылке).
    useEffect(() => {
        useAuthStore.setState((s) => (s.user ? { user: { ...s.user, gameMode: mode } } : {}));
        api.setGameMode(mode).catch(() => {});
    }, [mode]);

    const seg = (m, icon, label) => (
        <button key={m} onClick={() => { if (mode !== m) navigate(PATH[m]); }}
            style={{
                flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: "var(--fs-14)",
                background: mode === m ? "var(--ember-600)" : "transparent",
                color: mode === m ? "#fff" : "var(--ink-2)",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,.18)" : "none",
                transition: "background .15s, color .15s",
            }}>
            <Icon n={icon} sm /> {label}
        </button>
    );

    return (
        <>
            <div className="shell" style={{ paddingTop: "var(--sp-4)" }}>
                <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, padding: 4, maxWidth: 360, margin: "0 auto" }}>
                    {seg("solo", "play", t.hubSolo || "Тренировка")}
                    {seg("online", "gamepad", t.hubOnline || "Онлайн")}
                </div>
            </div>
            {children}
        </>
    );
};

// /games → открыть последний выбранный режим (или соло по умолчанию).
export const GamesRedirect = () => {
    const mode = useAuthStore((s) => s.user?.gameMode);
    return <Navigate to={mode === "online" ? "/online" : "/game"} replace />;
};
