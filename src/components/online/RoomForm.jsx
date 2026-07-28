// Окно создания/редактирования онлайн-комнаты (RoomForm) и его презентационные контролы
// (Field/Seg/ModeSeg/RSlider/RToggle/Reveal). Без сокетов — вынесено из OnlinePage.jsx.
import { useState, useEffect } from "react";
import api from "../tools/api.js";
import { Dropdown } from "../ui/Dropdown.jsx";
import { Icon } from "../ui/Icon.jsx";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";
import OnlineWordPicker from "./OnlineWordPicker.jsx";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DEFAULT_SETTINGS = {
    game: "quiz", answer: "type", dir: "no2int",
    source: "pool", dictId: null, dictName: "", poolIds: [], level: "", topic: "",
    count: 7, qtime: 15, maxPlayers: 4, private: false,
};

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

const SourceCards = ({ value, onChange, cards }) => (
    <div className="rmsource" role="radiogroup">
        {cards.map((card) => (
            <button key={card.value} type="button" role="radio" aria-checked={card.value === value}
                className={"rmsource__card" + (card.value === value ? " is-on" : "")}
                onClick={() => onChange(card.value)}>
                <span className="rmsource__icon"><Icon n={card.icon} /></span>
                <span className="rmsource__body"><b>{card.label}</b><span>{card.desc}</span></span>
                <span className="rmsource__tick" aria-hidden="true"><Icon n="check" sm /></span>
            </button>
        ))}
    </div>
);

const RSlider = ({ value, min, max, step = 1, unit, onChange }) => {
    const pct = max === min ? 100 : ((value - min) / (max - min)) * 100;
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


export const RoomForm = ({ open, onClose, theme, lang = "ru", t, to, initial, initialName = "", title, confirmLabel, onConfirm }) => {
    const [name, setName] = useState(initialName);
    const [s, setS] = useState({ ...DEFAULT_SETTINGS, ...(initial || {}) });
    const [sets, setSets] = useState([]);
    const [setsLoading, setSetsLoading] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedWords, setSelectedWords] = useState({});
    const topics = t.topics || {};
    useEffect(() => {
        if (open) {
            const init = { ...DEFAULT_SETTINGS, ...(initial || {}) };
            if (!["pool", "dict", "selected"].includes(init.source)) init.source = "pool";
            init.poolIds = Array.isArray(init.poolIds) ? init.poolIds : [];
            if (init.source === "selected") init.count = init.poolIds.length;
            setS(init);
            setName(initialName);
            setSelectedWords({});
            setSetsLoading(true);
            api.setsList().then((list) => {
                const next = list || [];
                setSets(next);
                setS((prev) => {
                    if (prev.source !== "dict") return prev;
                    const item = next.find((x) => x.id === prev.dictId);
                    const max = Math.min(20, item?.count || 0);
                    if (!item || max < 3) return prev;
                    return { ...prev, dictName: item.name, count: Math.min(Math.max(prev.count, 3), max) };
                });
            }).catch(() => setSets([])).finally(() => setSetsLoading(false));
        }
    }, [open]); // eslint-disable-line
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            if (pickerOpen) setPickerOpen(false);
            else onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, pickerOpen]); // eslint-disable-line
    useHistoryClose(open, onClose); // системная «Назад»/свайп закрывает окно комнаты, а не уводит со страницы
    if (!open) return null;
    const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
    const setSource = (source) => setS((p) => ({ ...p, source }));
    const topicVal = s.topic || "";   // бэкенд может вернуть null
    const activeSet = sets.find((item) => item.id === s.dictId) || null;
    const setCapacity = activeSet ? Math.min(20, activeSet.count || 0) : 0;
    const sourceInvalid = s.source === "selected"
        ? (s.poolIds?.length || 0) < 3
        : s.source === "dict" && (!activeSet || setCapacity < 3);
    const invalid = sourceInvalid;

    const levelOpts = [{ value: "", label: to.anyLevel || "Любой" }, ...LEVELS.map((l) => ({ value: l, label: l }))];
    const themeOpts = [{ value: "", label: to.anyTopic || "Любая" },
        ...Object.keys(topics).map((k) => ({ value: k, label: topics[k] }))];
    const setOpts = sets.map((item) => ({
        value: item.id,
        label: item.name,
        sub: `${item.count} ${to.wordsShort || "сл."}`,
    }));
    const selectSet = (id) => {
        const item = sets.find((x) => x.id === id);
        const max = Math.min(20, item?.count || 0);
        setS((prev) => ({
            ...prev,
            dictId: id,
            dictName: item?.name || "",
            count: max >= 3 ? Math.min(Math.max(prev.count, 3), max) : prev.count,
        }));
    };

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
                                <SourceCards value={s.source} onChange={setSource} cards={[
                                    { value: "pool", icon: "grid", label: to.sourcePool || "По теме", desc: to.sourcePoolDesc || "Случайные слова из Базы" },
                                    { value: "dict", icon: "layers", label: to.sourceDict || "Мой набор", desc: to.sourceDictDesc || "Из личной коллекции" },
                                    { value: "selected", icon: "check-square", label: to.sourceSelected || "Выбрать слова", desc: to.sourceSelectedDesc || "Точный состав партии" },
                                ]} />
                            </Field>
                            <Reveal open={s.source === "pool"}>
                                <div className="rf rf--dep">
                                    <div className="rf__lbl"><span className="rf__link" aria-hidden="true">↳</span><span className="rf__lbltxt">{to.level || "Уровень"} · {to.topic || "Тема"}</span></div>
                                    <div className="rcols">
                                        <Dropdown value={s.level || ""} options={levelOpts} onChange={(v) => set("level", v)} />
                                        <Dropdown value={topicVal} options={themeOpts} onChange={(v) => set("topic", v)} />
                                    </div>
                                </div>
                            </Reveal>
                            <Reveal open={s.source === "dict"}>
                                <div className="rf rf--dep">
                                    <div className="rf__lbl"><span className="rf__link" aria-hidden="true">↳</span><span className="rf__lbltxt">{to.personalSet || "Личный набор"}</span></div>
                                    {setsLoading ? (
                                        <div className="rf__empty">{to.loadingSets || "Загружаем наборы…"}</div>
                                    ) : setOpts.length ? (
                                        <>
                                            <Dropdown value={s.dictId} options={setOpts} onChange={selectSet} placeholder={to.selectSet || "Выберите набор"} />
                                            {activeSet && setCapacity < 3 && <div className="rf__error">{to.setTooSmall || "В наборе нужно минимум 3 слова"}</div>}
                                        </>
                                    ) : (
                                        <div className="rf__empty">{to.noSets || "У вас пока нет личных наборов"}</div>
                                    )}
                                </div>
                            </Reveal>
                            <Reveal open={s.source === "selected"}>
                                <div className="rf rf--dep">
                                    <div className="selectionbox">
                                        <span className="selectionbox__count">
                                            {(to.selectedCount || "Выбрано: {n} из 20").replace("{n}", String(s.poolIds?.length || 0))}
                                        </span>
                                        <button type="button" className="rmbtn rmbtn--outline" onClick={() => setPickerOpen(true)}>
                                            <Icon n={s.poolIds?.length ? "edit" : "plus"} sm />
                                            {s.poolIds?.length ? (to.editSelection || "Изменить") : (to.chooseWords || "Выбрать слова")}
                                        </button>
                                    </div>
                                    {(s.poolIds?.length || 0) < 3 && <div className="rf__error">{to.selectionMin || "Выберите минимум 3 слова"}</div>}
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    {/* Группа 3 — параметры партии */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secParty || "Параметры партии"}</div>
                        <div className="grp">
                            <Reveal open={s.source !== "selected"}>
                                <Field label={to.words || "Слов"}>
                                    <RSlider value={s.count} min={3} max={s.source === "dict" && setCapacity >= 3 ? setCapacity : 20}
                                        onChange={(v) => set("count", v)} />
                                </Field>
                            </Reveal>
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
            <OnlineWordPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
                theme={theme} lang={lang} t={t} to={to}
                selected={s.poolIds || []} known={selectedWords}
                onConfirm={(poolIds, words) => {
                    setS((prev) => ({ ...prev, poolIds, count: poolIds.length }));
                    setSelectedWords(words);
                    setPickerOpen(false);
                }} />
        </div>
    );
};
