// Онбординг нативных возможностей (задача A7): рассказывает про две вещи, о которых
// пользователю иначе узнать неоткуда —
//   • PROCESS_TEXT (A3): выделил слово в любом приложении → пункт «Norsk» → слово в наборе;
//   • «Поделиться» картинкой (A4): скриншот уходит в приложение → слова с картинки.
//
// Механика показа — ровно как у WhatsNew (не изобретаем свою): компонент живёт в App,
// сам решает, показываться ли, «уже видел» — флаг в localStorage, а вернуться к нему можно
// из Профиля через module-опенер openNativeIntro().
//
// В вебе не рендерится вообще: обеих фич там нет, и рассказывать о них бессмысленно.
import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { isNative } from "../../native/platform.js";
import { NI } from "./NativeIntro.i18n.js";

export { NI };

const SEEN_KEY = "ln_native_intro_seen";
const seen = () => { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ } };

// Module-опенер: Профиль открывает окно без пробрасывания пропсов (как openWhatsNew).
let _open = null;
export const openNativeIntro = () => { _open?.(); };

// Блок сценария: иконка + заголовок + нумерованные шаги (+ необязательная сноска).
const Scenario = ({ ic, title, steps, note }) => (
    <section style={{ marginTop: "var(--sp-4)" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", margin: 0, fontSize: "var(--fs-15)", fontWeight: 700 }}>
            <Icon n={ic} sm /> {title}
        </h3>
        <ol style={{ margin: "var(--sp-2) 0 0", paddingInlineStart: "var(--sp-5)", display: "grid", gap: "var(--sp-1)" }}>
            {steps.map((s) => <li key={s} style={{ fontSize: "var(--fs-14)" }}>{s}</li>)}
        </ol>
        {note && <p className="muted" style={{ margin: "var(--sp-2) 0 0", fontSize: "var(--fs-13)" }}>{note}</p>}
    </section>
);

export default function NativeIntro() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = NI[lang] || NI.en;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isNative()) return;          // веб: ни авто-показа, ни опенера из Профиля
        _open = () => setOpen(true);
        if (!seen()) setOpen(true);       // первый запуск APK — показываем один раз
        return () => { _open = null; };
    }, []);

    // Закрытие = «видел» (и когда открыли вручную из Профиля — флаг просто остаётся выставленным).
    const close = () => { markSeen(); setOpen(false); };

    if (!isNative()) return null;
    return (
        <Modal open={open} onClose={close} title={t.title} maxWidth={440}
            footer={<button className="btn btn--primary" onClick={close}>{t.close}</button>}>
            <p className="muted" style={{ margin: 0, fontSize: "var(--fs-14)" }}>{t.sub}</p>

            <Scenario ic="type" title={t.selTitle} steps={[t.sel1, t.sel2, t.sel3]} note={t.selNote} />
            <Scenario ic="image" title={t.shotTitle} steps={[t.shot1, t.shot2, t.shot3]} />

            {/* Честная строчка про ограничение: приложения со своим меню выделения пункт «Norsk»
                не покажут — это архитектура Android, а не поломка. Обещаний тут нет. */}
            <div style={{
                marginTop: "var(--sp-4)", padding: "var(--sp-3)", borderRadius: "var(--r-lg)",
                background: "var(--surface-3)", fontSize: "var(--fs-13)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontWeight: 700 }}>
                    <Icon n="info" sm /> {t.limitTitle}
                </div>
                <p className="muted" style={{ margin: "var(--sp-1) 0 0" }}>{t.limit}</p>
            </div>
        </Modal>
    );
}
