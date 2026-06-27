import { Icon } from "./Icon.jsx";
import { Dots, CountdownRing } from "./Spinner.jsx";

// Переиспользуемый поиск: инпут + индикатор фаз (кольцо отсчёта дебаунса → точки).
// phase: "idle" | "counting" | "searching". count — необязательный счётчик справа.
export const SearchBox = ({ value, onChange, placeholder, phase = "idle",
    debounceMs = 550, count, onKeyDown, onFocus, style }) => (
    <div className="composer" style={{ position: "relative", ...style }}>
        <span className="composer__spark"><Icon n="search" /></span>
        <input type="text" value={value} placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} onFocus={onFocus} />
        <span className="composer__hint" style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)" }}>
            {phase === "counting"
                ? <CountdownRing key={value} duration={debounceMs} />
                : phase === "searching"
                    ? <Dots />
                    : null}
            {count != null && count}
        </span>
    </div>
);

export default SearchBox;
