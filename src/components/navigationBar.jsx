import { Link, useLocation } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation";
import { useSystemStore } from "../store/systemStore.jsx";
import LanguageChooser from "./languageChooser.jsx";
import { BrandMark, BrandName } from "./ui/BrandMark.jsx";
import { Icon } from "./ui/Icon.jsx";

export const NavigationBar = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const { pathname } = useLocation();

    return (
        <header className="nav">
            <div className="shell nav__row">
                <Link className="brand" to="/words">
                    <BrandMark />
                    <BrandName />
                </Link>
                <nav className="nav__links">
                    <Link className={`nav__link${pathname === "/words" ? " is-active" : ""}`} to="/words">
                        <Icon n="book" sm /> {t.navBar.words}
                    </Link>
                    <Link className={`nav__link${pathname === "/game" ? " is-active" : ""}`} to="/game">
                        <Icon n="play" sm /> {t.navBar.game}
                    </Link>
                </nav>
                <div className="nav__spacer" />
                <LanguageChooser />
                <Link
                    className={`nav__link${pathname === "/mypage" ? " is-active" : ""}`}
                    to="/mypage"
                    aria-label="Профиль"
                >
                    <Icon n="user" />
                </Link>
            </div>
        </header>
    );
};
