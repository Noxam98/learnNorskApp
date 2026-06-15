// footer.jsx
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";

const Footer = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];

    return (
        <footer className="foot">
            <div className="shell foot__row">
                <div className="foot__brand">
                    <span>© 2026 Lære Norsk</span>
                </div>
                <div className="foot__cta">
                    <span className="foot__ask">{t.foundBugOrIdeas}</span>
                    <div className="foot__links">
                        <a href="https://t.me/progtt" target="_blank" rel="noreferrer">Telegram</a>
                        <a href="mailto:meliqq98@gmail.com">e-mail</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
