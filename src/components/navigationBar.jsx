import { Link, useLocation } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuth } from "../hooks/useAuth.js";
import LanguageChooser from "./languageChooser.jsx";
import { BrandMark, BrandName } from "./ui/BrandMark.jsx";
import { Icon } from "./ui/Icon.jsx";

export const NavigationBar = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const { pathname } = useLocation();
    const { user, setTheme } = useAuth();
    const theme = useSystemStore((s) => s.theme);
    const initial = (user?.username?.[0] || "").toUpperCase();

    const tabs = [
        { to: "/learning", icon: "graduation", label: t.navBar.study || "Учёба", on: pathname === "/learning" },
        { to: "/pool", icon: "library", label: t.navBar.base, on: pathname === "/pool" },
        { to: "/online", icon: "globe", label: t.navBar.online || "Онлайн", on: ["/online", "/games"].includes(pathname) },
        { to: "/mypage", icon: "user", label: t.navBar.profile || "Профиль", on: pathname === "/mypage" },
    ];

    return (
        <>
        <header className="nav">
            <div className="shell nav__row">
                <Link className="brand" to="/learning">
                    <BrandMark />
                    <BrandName />
                </Link>
                <nav className="nav__links">
                    <Link className={`nav__link${pathname === "/learning" ? " is-active" : ""}`} to="/learning">
                        <Icon n="graduation" sm /> <span>{t.navBar.study || "Учёба"}</span>
                    </Link>
                    <Link className={`nav__link${["/games", "/online"].includes(pathname) ? " is-active" : ""}`} to="/online">
                        <Icon n="globe" sm /> <span>{t.navBar.online || "Онлайн"}</span>
                    </Link>
                    <Link className={`nav__link${pathname === "/pool" ? " is-active" : ""}`} to="/pool">
                        <Icon n="library" sm /> <span>{t.navBar.base}</span>
                    </Link>
                </nav>
                <div className="nav__spacer" />
                {user?.isAdmin && (
                    <Link className="nav__theme hide-mobile" to="/stats" aria-label="stats" title="Статистика">
                        <Icon n="chart" sm />
                    </Link>
                )}
                <button className="nav__theme hide-mobile" aria-label="theme"
                    title={theme === "dark" ? "Light" : "Dark"}
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    <Icon n={theme === "dark" ? "sun" : "moon"} sm />
                </button>
                <span className="hide-mobile"><LanguageChooser /></span>
                <Link
                    className={`nav__avatar${pathname === "/mypage" ? " is-active" : ""}`}
                    to="/mypage"
                    aria-label={t.navBar.profile || "Профиль"}
                    title={user?.username || (t.navBar.profile || "Профиль")}
                >
                    {initial || <Icon n="user" sm />}
                </Link>
            </div>
        </header>

        {/* Нижний таб-бар — только на мобилках (CSS) */}
        <nav className="tabbar" aria-label="nav">
            {tabs.map((x) => (
                <Link key={x.to} to={x.to} className={`tabbar__item${x.on ? " is-active" : ""}`}>
                    <Icon n={x.icon} sm /> <span>{x.label}</span>
                </Link>
            ))}
        </nav>
        </>
    );
};
