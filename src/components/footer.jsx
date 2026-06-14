// footer.jsx
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { BrandMark } from "./ui/BrandMark.jsx";

const Footer = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];

    return (
        <footer className="foot">
            <div className="shell foot__row">
                <div className="foot__brand">
                    <BrandMark size={28} radius={8} />
                    <span>© 2026 Lære Norsk · {t.foundBugOrIdeas}</span>
                </div>
                <div className="foot__links">
                    <a href="https://t.me/progtt" target="_blank" rel="noreferrer">Telegram</a>
                    <a href="mailto:meliqq98@gmail.com">e-mail</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
