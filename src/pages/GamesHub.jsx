import { useState } from "react";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import api from "../components/tools/api.js";
import { GamePage } from "./GamePage.jsx";
import { OnlinePage } from "./OnlinePage.jsx";

// Хаб «Игры»: сегмент-переключатель Тренировка ↔ Онлайн (один клик). Активный подраздел
// рендерится тут же. Последний выбор сохраняется в БД (gameMode) → открывается при заходе.
export const GamesHub = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[lang];
    const saved = useAuthStore((s) => s.user?.gameMode);
    const [mode, setMode] = useState(saved === "online" ? "online" : "solo");

    const choose = (m) => {
        if (m === mode) return;
        setMode(m);
        useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, gameMode: m } : s.user }));
        api.setGameMode(m).catch(() => {});
    };

    const seg = (m, icon, label) => (
        <button key={m} onClick={() => choose(m)}
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
            {mode === "solo" ? <GamePage /> : <OnlinePage />}
        </>
    );
};

export default GamesHub;
