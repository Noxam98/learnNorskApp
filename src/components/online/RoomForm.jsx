// Окно создания/редактирования онлайн-комнаты (RoomForm) и его презентационные контролы
// (Field/Seg/ModeSeg/RSlider/RToggle/Reveal). Без сокетов — вынесено из OnlinePage.jsx.
import { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown.jsx";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DEFAULT_SETTINGS = { game: "quiz", answer: "type", dir: "no2int", source: "pool", level: "", topic: "", count: 7, qtime: 15, maxPlayers: 4, private: false };

// ---------- Контролы окна создания комнаты (адаптация дизайн-макета room-modal) ----------
const Field = ({ label, hint, dep, children }) => (
    <div className={"rf" + (dep ? " rf--dep" : "")}>
        <div className="rf__lbl">{dep && <span className="rf__link" aria-hidden="true">↳</span>}<span className="rf__lbltxt">{label}</span>{hint && <span className="rf__hint">{hint}</span>}</div>
        {children}
    </div>
);

const Seg = ({ value, options, onChange }) => (
    <div className="rmseg" role="radiogroup">
        {options.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
                className={"rmseg__btn" + (o.value === value ? " is-on" : "")} onClick={() => onChange(o.value)}>
                {o.icon && <span className="rmseg__i" aria-hidden="true">{o.icon}</span>}<span className="rmseg__t">{o.label}</span>
            </button>
        ))}
    </div>
);

const ModeSeg = ({ value, onChange, cards }) => (
    <div className="rmmode" role="radiogroup">
        {cards.map((c) => (
            <button key={c.value} type="button" role="radio" aria-checked={c.value === value}
                className={"rmmode__card" + (c.value === value ? " is-on" : "")} onClick={() => onChange(c.value)}>
                <span className="rmmode__emoji" aria-hidden="true">{c.emoji}</span>
                <span className="rmmode__body"><b>{c.label}</b><span>{c.desc}</span></span>
                <span className="rmmode__tick" aria-hidden="true">✓</span>
            </button>
        ))}
    </div>
);

const RSlider = ({ value, min, max, step = 1, unit, onChange }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="rslider">
            <input type="range" min={min} max={max} step={step} value={value} style={{ "--pct": pct + "%" }} onChange={(e) => onChange(Number(e.target.value))} />
            <span className="rslider__val">{value}{unit ? <i>{unit}</i> : null}</span>
        </div>
    );
};

const RToggle = ({ value, onChange, label, desc }) => (
    <button type="button" className="rtoggle" role="switch" aria-checked={value} onClick={() => onChange(!value)}>
        <span className="rtoggle__txt"><b>{label}</b><span>{desc}</span></span>
        <span className={"rtoggle__sw" + (value ? " is-on" : "")}><span className="rtoggle__knob" /></span>
    </button>
);

const Reveal = ({ open, children }) => (
    <div className={"reveal" + (open ? " is-open" : "")} aria-hidden={!open}><div className="reveal__in">{children}</div></div>
);


export const RoomForm = ({ open, onClose, theme, t, to, initial, initialName = "", title, confirmLabel, onConfirm }) => {
    const [name, setName] = useState(initialName);
    const [s, setS] = useState({ ...DEFAULT_SETTINGS, ...(initial || {}) });
    const topics = t.topics || {};
    // своя тема: s.topic держит финальное значение (свободный текст), customMode — только UI
    const [customMode, setCustomMode] = useState(false);
    useEffect(() => {
        if (open) {
            const init = { ...DEFAULT_SETTINGS, ...(initial || {}) };
            setS(init); setName(initialName);
            setCustomMode(!!init.topic && !topics[init.topic]);
        }
    }, [open]); // eslint-disable-line
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]); // eslint-disable-line
    useHistoryClose(open, onClose); // системная «Назад»/свайп закрывает окно комнаты, а не уводит со страницы
    if (!open) return null;
    const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
    const setSource = (v) => setS((p) => {
        const next = { ...p, source: v };
        if (v !== "ai" && customMode) { setCustomMode(false); next.topic = ""; }
        return next;
    });

    const isAI = s.source === "ai";
    const topicVal = s.topic || "";   // бэкенд может вернуть null
    const invalid = customMode && isAI && !topicVal.trim();

    const levelOpts = [{ value: "", label: to.anyLevel || "Любой" }, ...LEVELS.map((l) => ({ value: l, label: l }))];
    const themeOpts = [{ value: "", label: to.anyTopic || "Любая" },
        ...Object.keys(topics).map((k) => ({ value: k, label: topics[k] })),
        ...(isAI ? [{ value: "__custom__", label: (to.customTopic || "Своя тема").replace("✏️ ", ""), emoji: "✏️" }] : [])];

    return (
        <div className="roomwrap" data-theme={theme} style={{ zIndex: 100 }}>
            <div className="scrim" onClick={onClose} />
            <div className="modal" role="dialog" aria-modal="true">
                <div className="modal__head">
                    <h2 className="modal__title">{title || to.create || "Создать комнату"}</h2>
                    <button className="modal__x" aria-label={t.cancel} onClick={onClose}>✕</button>
                </div>
                <div className="modal__body">
                    {/* Группа 1 — что играем */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secWhat || "Что играем"}</div>
                        <div className="grp">
                            <Field label={to.roomName || "Название"}>
                                <input className="rtext" maxLength={40} placeholder={to.roomName || "Название"} value={name} onChange={(e) => setName(e.target.value)} />
                                <span className="rtext__count">{name.length}/40</span>
                            </Field>
                            <Field label={to.gameType || "Режим игры"}>
                                <ModeSeg value={s.game} onChange={(v) => set("game", v)} cards={[
                                    { value: "quiz", emoji: "🎯", label: to.games?.quiz || "Викторина", desc: to.quizDesc || "" },
                                    { value: "race", emoji: "🦊", label: to.games?.race || "Гонка слов", desc: to.raceDesc || "" },
                                ]} />
                            </Field>
                            <Reveal open={s.game === "race"}>
                                <Field label={to.answerMode || "Ответ"} dep>
                                    <Seg value={s.answer} onChange={(v) => set("answer", v)} options={[
                                        { value: "type", label: to.answerType || "Печать", icon: "⌨" },
                                        { value: "choice", label: to.answerChoice || "Выбор", icon: "☰" },
                                    ]} />
                                </Field>
                            </Reveal>
                            <Field label={to.direction || "Направление"}>
                                <Seg value={s.dir} onChange={(v) => set("dir", v)} options={[
                                    { value: "no2int", label: to.dirNo2Int || "Норв. → перевод", icon: "🇳🇴" },
                                    { value: "int2no", label: to.dirInt2No || "Перевод → норв.", icon: "🔤" },
                                ]} />
                            </Field>
                        </div>
                    </section>

                    {/* Группа 2 — откуда слова */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secWords || "Откуда слова"}</div>
                        <div className="grp">
                            <Field label={to.wordSource || "Источник слов"}>
                                <Seg value={s.source} onChange={setSource} options={[
                                    { value: "pool", label: to.sourcePool || "Пул", icon: "🌐" },
                                    { value: "ai", label: to.sourceAi || "AI", icon: "✨" },
                                ]} />
                            </Field>
                            <Reveal open>
                                <div className="rf rf--dep">
                                    <div className="rf__lbl"><span className="rf__link" aria-hidden="true">↳</span><span className="rf__lbltxt">{to.level || "Уровень"} · {to.topic || "Тема"}</span></div>
                                    <div className="rcols">
                                        <Dropdown value={s.level || ""} options={levelOpts} onChange={(v) => set("level", v)} />
                                        <Dropdown value={customMode ? "__custom__" : topicVal} options={themeOpts} onChange={(v) => {
                                            if (v === "__custom__") { setCustomMode(true); set("topic", ""); }
                                            else { setCustomMode(false); set("topic", v); }
                                        }} />
                                    </div>
                                    <Reveal open={customMode && isAI}>
                                        <div className="rcustom">
                                            <input className={"rtext" + (invalid ? " is-invalid" : "")} maxLength={60} placeholder={to.customTopicPh || ""}
                                                value={topicVal} onChange={(e) => set("topic", e.target.value)} />
                                            <span className="rtext__count">{topicVal.length}/60</span>
                                            <div className="rcustom__hint">✨ {to.aiHint || ""}</div>
                                        </div>
                                    </Reveal>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    {/* Группа 3 — параметры партии */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secParty || "Параметры партии"}</div>
                        <div className="grp">
                            <Field label={to.words || "Слов"}><RSlider value={s.count} min={3} max={20} onChange={(v) => set("count", v)} /></Field>
                            <Reveal open={s.game !== "race"}>
                                <Field label={to.questionTime || "Время на вопрос"} dep><RSlider value={s.qtime} min={5} max={30} unit={to.secUnit || "с"} onChange={(v) => set("qtime", v)} /></Field>
                            </Reveal>
                            <Field label={to.maxPlayers || "Макс. игроков"}><RSlider value={s.maxPlayers} min={2} max={8} onChange={(v) => set("maxPlayers", v)} /></Field>
                            <RToggle value={s.private} onChange={(v) => set("private", v)} label={to.private || "Приватная"} desc={to.privateDesc || "Не показывать в списке"} />
                        </div>
                    </section>
                </div>
                <div className="modal__foot">
                    <button className="rmbtn rmbtn--ghost" onClick={onClose}>{t.cancel}</button>
                    <button className="rmbtn rmbtn--primary" disabled={invalid} onClick={() => !invalid && onConfirm(name, s)}>{confirmLabel || to.create || "Создать"}</button>
                </div>
            </div>
        </div>
    );
};
