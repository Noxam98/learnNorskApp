// Празднование перехода на новый уровень CEFR. Конфетти + карточка, закрывается тапом.
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Icon } from "../ui/Icon.jsx";

const T = {
    ru: { eyebrow: "Новый уровень", title: "Поздравляю!", desc: "Теперь вы изучаете уровень {lv} 🎉 Дальше — слова посложнее.", cta: "Продолжить" },
    en: { eyebrow: "New level", title: "Congratulations!", desc: "You're now studying level {lv} 🎉 Next — harder words ahead.", cta: "Continue" },
    ukr: { eyebrow: "Новий рівень", title: "Вітаємо!", desc: "Тепер ви вивчаєте рівень {lv} 🎉 Далі — складніші слова.", cta: "Продовжити" },
    pl: { eyebrow: "Nowy poziom", title: "Gratulacje!", desc: "Uczysz się teraz poziomu {lv} 🎉 Dalej — trudniejsze słowa.", cta: "Dalej" },
    lt: { eyebrow: "Naujas lygis", title: "Sveikiname!", desc: "Dabar mokaisi {lv} lygį 🎉 Toliau — sunkesni žodžiai.", cta: "Tęsti" },
};

export default function LevelUpToast({ lang = "ru", to = "A2", onClose }) {
    const t = T[lang] || T.ru;
    useEffect(() => {
        try {
            confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 }, zIndex: 99999 });
            const tm = setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.3 }, zIndex: 99999 }), 250);
            return () => clearTimeout(tm);
        } catch { /* */ }
    }, []);
    return (
        <div className="study-root" onClick={() => onClose?.()}
            style={{ position: "fixed", inset: 0, zIndex: 97, display: "grid", placeItems: "center", padding: "var(--sp-5)", background: "rgba(10,16,15,.55)", backdropFilter: "blur(3px)" }}>
            <div className="plc-hero" style={{ maxWidth: 420, textAlign: "center", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                <span className="plc-hero__halo" /><span className="plc-hero__halo2" />
                <div className="plc-cefr" style={{ width: 96, height: 96, borderRadius: 24 }}>
                    <span className="plc-cefr__lvl" style={{ fontSize: "var(--fs-44)" }}>{to}</span>
                </div>
                <span className="plc-hero__eyebrow" style={{ justifyContent: "center" }}><Icon n="sparkles" sm /> {t.eyebrow}</span>
                <div className="plc-hero__title" style={{ fontSize: "var(--fs-28)" }}>{t.title.replace("{lv}", to)}</div>
                <p className="plc-hero__desc" style={{ maxWidth: "none" }}>{t.desc.replace(/\{lv\}/g, to)}</p>
                <div className="plc-actions" style={{ alignItems: "center" }}>
                    <button className="plc-hero__btn" onClick={() => onClose?.()}><Icon n="check" /> {t.cta}</button>
                </div>
            </div>
        </div>
    );
}
