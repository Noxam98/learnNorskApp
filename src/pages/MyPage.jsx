import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore, VIBE_MS } from "../store/systemStore.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useAuthStore } from "../store/AuthStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Dropdown } from "../components/ui/Dropdown.jsx";
import GoogleSignInButton from "../components/ui/GoogleSignInButton.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { BtnSpinner } from "../components/ui/Spinner.jsx";
import api from "../components/tools/api.js";
import { enablePush, disablePush } from "../components/tools/push.js";
import { wordCount } from "../components/tools/plural.js";

const GOOGLE_ON = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Локальные подписи (статистика теперь из «Учёбы», а не из личных словарей).
const MASTERED_LBL = { ru: "Выучено", ukr: "Вивчено", en: "Mastered", pl: "Opanowane", lt: "Išmokta" };
const LEVEL_LBL = { ru: "Уровень", ukr: "Рівень", en: "Level", pl: "Poziom", lt: "Lygis" };
const OPEN_STUDY = { ru: "Открыть Учёбу", ukr: "Відкрити Навчання", en: "Open Learning", pl: "Otwórz Naukę", lt: "Atverti mokymąsi" };
const ADMIN_LBL = { ru: "Админ", ukr: "Адмін", en: "Admin", pl: "Admin", lt: "Administratorius" };
const MOD_LBL = { ru: "Модерация", ukr: "Модерація", en: "Moderation", pl: "Moderacja", lt: "Moderacija" };
const STATS_LBL = { ru: "Статистика", ukr: "Статистика", en: "Stats", pl: "Statystyki", lt: "Statistika" };
const STATUS_ORDER = ["new", "in_progress", "repeat", "mastered"];
const STATUS_LBL = {
    new: { ru: "Новые", ukr: "Нові", en: "New", pl: "Nowe", lt: "Nauji" },
    in_progress: { ru: "В процессе", ukr: "У процесі", en: "In progress", pl: "W trakcie", lt: "Eigoje" },
    repeat: { ru: "Повторение", ukr: "Повторення", en: "Review", pl: "Powtórka", lt: "Kartojimas" },
    mastered: { ru: "Выучено", ukr: "Вивчено", en: "Mastered", pl: "Opanowane", lt: "Išmokta" },
};

const MyPage = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const navigate = useNavigate();
    const { logout, user, setTheme, refreshMe } = useAuth();

    // Привязка/отвязка Google в настройках. Конфликты (409/«нет пароля») — точечным тостом.
    const onLinkGoogle = useCallback((credential) => {
        api.linkGoogle(credential).then(refreshMe).catch((e) => {
            const msg = String(e?.message || "");
            useSystemStore.getState().showToast(msg.includes("already linked") ? t.googleAlreadyLinked : t.unexpectedError);
        });
    }, [refreshMe, t]);
    const onUnlinkGoogle = () => {
        api.unlinkGoogle().then(refreshMe).catch((e) => {
            const msg = String(e?.message || "");
            useSystemStore.getState().showToast(msg.includes("password") ? t.setPasswordFirst : t.unexpectedError);
        });
    };

    // Отображаемое имя (персонализация).
    const [nameOpen, setNameOpen] = useState(false);
    const [nameValue, setNameValue] = useState("");
    const [nameSaving, setNameSaving] = useState(false);
    const openName = () => { setNameValue(user?.name || ""); setNameOpen(true); };
    const closeName = () => { if (!nameSaving) setNameOpen(false); };
    const saveName = async () => {
        setNameSaving(true);
        try { await api.setName(nameValue.trim()); await refreshMe(); setNameOpen(false); }
        catch { /* тост покажет api.js */ }
        setNameSaving(false);
    };

    // Задать/сменить пароль (в т.ч. первый пароль для Google-аккаунта).
    const [pwOpen, setPwOpen] = useState(false);
    const [pwValue, setPwValue] = useState("");
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState("");
    const closePw = () => { if (!pwSaving) { setPwOpen(false); setPwValue(""); setPwError(""); } };
    const savePw = async () => {
        if (pwValue.length < 6) { setPwError(t.passwordLengthError); return; }
        setPwSaving(true); setPwError("");
        try {
            await api.setPassword(pwValue);
            await refreshMe();
            setPwOpen(false); setPwValue("");
        } catch { setPwError(t.unexpectedError); }
        setPwSaving(false);
    };
    const theme = useSystemStore((state) => state.theme);
    const showArticles = useSystemStore((state) => state.showArticles);
    const showVerbAa = useSystemStore((state) => state.showVerbAa);
    const soundOn = useSystemStore((state) => state.soundOn);
    const autoAdvance = useSystemStore((state) => state.autoAdvance);
    const vibration = useSystemStore((state) => state.vibration);
    const vibrationStrength = useSystemStore((state) => state.vibrationStrength);
    const pushEnabled = useSystemStore((state) => state.pushEnabled);
    const listenOffLocal = useSystemStore((state) => state.listenOffLocal);
    const [pushBusy, setPushBusy] = useState(false);
    const [listenScope, setListenScope] = useState(/** @type {null|boolean} */(null)); // !=null → открыта модалка «тут/везде», значение = целевое «выключено»
    const [lstats, setLstats] = useState(null);
    useEffect(() => {
        let on = true;
        api.learningStats().then((s) => { if (on) setLstats(s || null); }).catch(() => {});
        return () => { on = false; };
    }, []);
    // Админ: счётчик слов на модерации (для бейджа). Профиль доступен и с телефона (таб-бар).
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        if (!isAdmin) return;
        let on = true;
        api.adminPending().then((r) => { if (on) setPendingCount(r?.count || 0); }).catch(() => {});
        return () => { on = false; };
    }, [isAdmin]);

    // Пуш-напоминания: тумблер спрашивает разрешение и подписывает (вкл) или отписывает (выкл).
    const togglePush = async () => {
        if (pushBusy) return;
        setPushBusy(true);
        try {
            if (pushEnabled) {
                await disablePush();
                useSystemStore.getState().setPushEnabled(false);
            } else {
                await enablePush();
                useSystemStore.getState().setPushEnabled(true);
            }
        } catch (e) {
            const why = String(e?.message || e);
            useSystemStore.getState().showToast(
                why === "denied" ? (t.pushDenied || "Разрешение на уведомления отклонено")
                : why === "unsupported" ? (t.pushUnsupported || "Браузер не поддерживает пуши (на iPhone — добавь приложение на главный экран)")
                : (t.unexpectedError || "Не вышло включить уведомления")
            );
        } finally {
            setPushBusy(false);
        }
    };

    // Участие в рейтинге: тумблер хранит инверсию (gamePrefs.leaderboardOptOut). Вкл = участвую.
    const lbOptOut = !!user?.gamePrefs?.leaderboardOptOut;
    const toggleLeaderboard = () => {
        const next = !lbOptOut;
        useAuthStore.setState((s) => ({ user: { ...s.user, gamePrefs: { ...(s.user?.gamePrefs || {}), leaderboardOptOut: next } } }));
        api.setGamePrefs({ leaderboardOptOut: next }).catch(() => { /* офлайн — не критично */ });
    };

    // Задания «на слух»: эффективно выключено = локальное переопределение (если задано) поверх аккаунта.
    const acctListenOff = !!user?.gamePrefs?.listenOff;
    const listenDisabled = listenOffLocal != null ? listenOffLocal : acctListenOff;
    // Клик по тумблеру открывает выбор «тут/везде»; целевое «выключено» = инверсия текущего.
    const applyListen = (scope) => {
        const off = !!listenScope;   // целевое значение «выключено»
        if (scope === "device") {
            useSystemStore.getState().setListenOffLocal(off);
        } else {
            useSystemStore.getState().setListenOffLocal(null);   // снимаем локальное — рулит аккаунт
            useAuthStore.setState((s) => ({ user: { ...s.user, gamePrefs: { ...(s.user?.gamePrefs || {}), listenOff: off } } }));
            api.setGamePrefs({ listenOff: off }).catch(() => { /* офлайн */ });
        }
        setListenScope(null);
    };


    // Статистика «Учёбы» (единый набор слов, SRS) — вместо личных словарей.
    const byStatus = lstats?.byStatus || {};
    const total = lstats?.total || 0;
    const masteredTotal = (byStatus.mastered || 0) + (byStatus.repeat || 0) + (byStatus.archived || 0);
    const accuracy = lstats?.accuracy; // % | null
    const currentLevel = lstats?.currentLevel || "—";

    const username = user?.username || "guest";
    const displayName = (user?.name || "").trim() || username;
    const avatar = displayName.charAt(0).toUpperCase();

    const logOut = () => { logout(); navigate("/authorization"); };

    return (
        <main className="shell prof-main">
            <div className="phead">
                <div className="pavatar">{avatar}</div>
                <div className="phead__meta">
                    <div className="phead__name">{displayName}</div>
                    <div className="phead__sub">{user?.name ? `@${username} · ` : ""}{wordCount(total, currentLanguage)} · {LEVEL_LBL[currentLanguage] || LEVEL_LBL.en} {currentLevel}</div>
                </div>
                <button className="btn btn--outline" onClick={logOut}><Icon n="logout" sm /> {t.logout}</button>
            </div>

            <div className="stats">
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--fjord-50)", color: "var(--fjord-600)" }}><Icon n="type" /></div>
                    <div className="scard__n">{total}</div>
                    <div className="scard__l">{t.wordsTotal}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--success-bg)", color: "var(--success)" }}><Icon n="target" /></div>
                    <div className="scard__n">{masteredTotal}</div>
                    <div className="scard__l">{MASTERED_LBL[currentLanguage] || MASTERED_LBL.en}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--pos-adj-bg)", color: "var(--pos-adj)" }}><Icon n="check" /></div>
                    <div className="scard__n">{accuracy == null ? "—" : accuracy + "%"}</div>
                    <div className="scard__l">{t.accuracy}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--ember-50)", color: "var(--ember-600)" }}><Icon n="graduation" /></div>
                    <div className="scard__n">{currentLevel}</div>
                    <div className="scard__l">{LEVEL_LBL[currentLanguage] || LEVEL_LBL.en}</div>
                </div>
            </div>

            {isAdmin && (
                <div className="panel" style={{ marginBottom: "var(--sp-5)" }}>
                    <div className="panel__head"><span className="panel__title">{ADMIN_LBL[currentLanguage] || ADMIN_LBL.en}</span></div>
                    <div className="panel__body" style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
                        <button className="btn btn--outline" onClick={() => navigate("/moderation")}>
                            <Icon n="check-circle" sm /> {MOD_LBL[currentLanguage] || MOD_LBL.en}
                            {pendingCount > 0 && <span className="fchip__n" style={{ marginLeft: 6 }}>{pendingCount}</span>}
                        </button>
                        <button className="btn btn--outline" onClick={() => navigate("/stats")}>
                            <Icon n="chart" sm /> {STATS_LBL[currentLanguage] || STATS_LBL.en}
                        </button>
                    </div>
                </div>
            )}

            <div className="pgrid">
                <div className="panel">
                    <div className="panel__head">
                        <span className="panel__title">{t.navBar.study || "Учёба"}</span>
                        <span className="muted-3" style={{ fontSize: "var(--fs-13)" }}>{wordCount(total, currentLanguage)}</span>
                    </div>
                    <div className="panel__body">
                        {STATUS_ORDER.map((k, i) => {
                            const n = byStatus[k] || 0;
                            const pct = total ? Math.round((n / total) * 100) : 0;
                            const colors = ["var(--ink-3)", "var(--fjord-600)", "var(--ember-600)", "var(--success)"];
                            return (
                                <div className="drow" key={k}>
                                    <div className="drow__top"><span className="drow__name">{STATUS_LBL[k][currentLanguage] || STATUS_LBL[k].en}</span><span className="drow__val">{n}</span></div>
                                    <div className="bar"><span style={{ width: `${pct}%`, background: colors[i % colors.length] }} /></div>
                                </div>
                            );
                        })}
                        <button className="btn btn--outline" style={{ marginTop: "var(--sp-3)" }} onClick={() => navigate("/learning")}>
                            <Icon n="graduation" sm /> {OPEN_STUDY[currentLanguage] || OPEN_STUDY.en}
                        </button>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel__head"><span className="panel__title">{t.settings}</span></div>
                    <div className="panel__body">
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="globe" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.interfaceLang}</span><span className="setrow__d">{t.interfaceLangDesc}</span></span>
                            <Dropdown value={currentLanguage}
                                onChange={(v) => { useSystemStore.getState().setCurrentLanguage(v); if (api.accessToken) api.setGamePrefs({ lang: v }).catch(() => {}); }}
                                options={[
                                    { value: "ukr", label: "Українська", emoji: "🇺🇦" },
                                    { value: "ru", label: "Русский", emoji: "🇷🇺" },
                                    { value: "en", label: "English", emoji: "🇬🇧" },
                                    { value: "pl", label: "Polski", emoji: "🇵🇱" },
                                    { value: "lt", label: "Lietuvių", emoji: "🇱🇹" },
                                ]} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n={theme === "dark" ? "moon" : "sun"} sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.darkTheme}</span><span className="setrow__d">{t.darkThemeDesc}</span></span>
                            <span className={`toggle${theme === "dark" ? " is-on" : ""}`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="user" sm /></span>
                            <span className="setrow__meta">
                                <span className="setrow__t">{t.displayName}</span>
                                <span className="setrow__d">{(user?.name || "").trim() || t.notSet}</span>
                            </span>
                            <button className="btn btn--ghost" onClick={openName}>{t.edit}</button>
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="lock" sm /></span>
                            <span className="setrow__meta">
                                <span className="setrow__t">{t.password}</span>
                                <span className="setrow__d">{user?.hasPassword ? t.passwordSet : t.passwordNotSet}</span>
                            </span>
                            <button className="btn btn--ghost" onClick={() => setPwOpen(true)}>
                                {user?.hasPassword ? t.changePassword : t.setPassword}
                            </button>
                        </div>
                        {GOOGLE_ON && (
                            <div className="setrow">
                                <span className="setrow__ic"><Icon n="user" sm /></span>
                                <span className="setrow__meta">
                                    <span className="setrow__t">{t.googleAccount}</span>
                                    <span className="setrow__d">{user?.googleLinked ? (user.email || t.googleLinked) : t.googleAccountDesc}</span>
                                </span>
                                {user?.googleLinked
                                    ? <button className="btn btn--ghost" onClick={onUnlinkGoogle}>{t.unlink}</button>
                                    : <GoogleSignInButton onCredential={onLinkGoogle} text="continue_with" />}
                            </div>
                        )}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="type" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.showArticles}</span><span className="setrow__d">{t.showArticlesDesc}</span></span>
                            <span className={`toggle${showArticles ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setShowArticles(!showArticles)} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="type" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.showVerbAa}</span><span className="setrow__d">{t.showVerbAaDesc}</span></span>
                            <span className={`toggle${showVerbAa ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setShowVerbAa(!showVerbAa)} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="volume" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.gameSounds}</span><span className="setrow__d">{t.gameSoundsDesc}</span></span>
                            <span className={`toggle${soundOn ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setSoundOn(!soundOn)} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="fast-forward" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.autoAdvance}</span><span className="setrow__d">{t.autoAdvanceDesc}</span></span>
                            <span className={`toggle${autoAdvance ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setAutoAdvance(!autoAdvance)} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="award" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.leaderboardSetting}</span><span className="setrow__d">{t.leaderboardSettingDesc}</span></span>
                            <span className={`toggle${!lbOptOut ? " is-on" : ""}`} onClick={toggleLeaderboard} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="volume" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.listenTasks}</span><span className="setrow__d">{t.listenTasksDesc}</span></span>
                            <span className={`toggle${!listenDisabled ? " is-on" : ""}`} onClick={() => setListenScope(!listenDisabled)} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="zap" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.vibration}</span><span className="setrow__d">{t.vibrationDesc}</span></span>
                            <span className={`toggle${vibration ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setVibration(!vibration)} />
                        </div>
                        {vibration && (
                            <div className="setrow">
                                <span className="setrow__ic"><Icon n="zap" sm /></span>
                                <span className="setrow__meta"><span className="setrow__t">{t.vibrationStrength}</span><span className="setrow__d">{t.vibrationStrengthDesc}</span></span>
                                <Dropdown value={vibrationStrength}
                                    onChange={(v) => { useSystemStore.getState().setVibrationStrength(v); try { navigator.vibrate?.(VIBE_MS[v]); } catch { /* нет вибро — ок */ } }}
                                    options={[
                                        { value: "low", label: t.vibeLow },
                                        { value: "mid", label: t.vibeMid },
                                        { value: "high", label: t.vibeHigh },
                                    ]} />
                            </div>
                        )}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="alert" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.notifications}</span><span className="setrow__d">{t.notificationsDesc}</span></span>
                            <span className={`toggle${pushEnabled ? " is-on" : ""}`} style={pushBusy ? { opacity: 0.5, pointerEvents: "none" } : undefined} onClick={togglePush} />
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                open={nameOpen}
                onClose={closeName}
                title={t.displayName}
                footer={<>
                    <button className="btn btn--ghost" disabled={nameSaving} onClick={closeName}>{t.cancel}</button>
                    <button className="btn btn--accent" disabled={nameSaving} onClick={saveName}>
                        {nameSaving ? <BtnSpinner /> : t.save}
                    </button>
                </>}
            >
                <div className="field">
                    <div className="input-icon">
                        <Icon n="user" sm />
                        <input className="input" type="text" autoFocus value={nameValue} maxLength={40}
                            placeholder={t.displayNamePlaceholder}
                            onChange={(e) => setNameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveName(); }} />
                    </div>
                </div>
            </Modal>

            <Modal
                open={pwOpen}
                onClose={closePw}
                title={user?.hasPassword ? t.changePassword : t.setPassword}
                footer={<>
                    <button className="btn btn--ghost" disabled={pwSaving} onClick={closePw}>{t.cancel}</button>
                    <button className="btn btn--accent" disabled={pwSaving || pwValue.length < 6} onClick={savePw}>
                        {pwSaving ? <BtnSpinner /> : t.save}
                    </button>
                </>}
            >
                <div className="field">
                    <div className="input-icon">
                        <Icon n="lock" sm />
                        <input className={`input${pwError ? " is-error" : ""}`} type="password" autoFocus value={pwValue}
                            placeholder={t.newPasswordPlaceholder}
                            onChange={(e) => { setPwValue(e.target.value); setPwError(""); }}
                            onKeyDown={(e) => { if (e.key === "Enter") savePw(); }} />
                    </div>
                    {pwError && <span className="alert"><Icon n="x" sm /> {pwError}</span>}
                </div>
            </Modal>

            {/* Выбор охвата для «Заданий на слух»: только это устройство или весь аккаунт (по-простому) */}
            <Modal
                open={listenScope !== null}
                onClose={() => setListenScope(null)}
                title={listenScope ? t.listenScopeOff : t.listenScopeOn}
            >
                {listenScope && <div className="scopechoice__warn"><Icon n="headphones" sm /> {t.listenOffWarn}</div>}
                <div className="scopechoice">
                    <button type="button" className="scopechoice__b" onClick={() => applyListen("device")}>
                        <span className="scopechoice__t"><Icon n="user" sm /> {t.scopeDevice}</span>
                        <span className="scopechoice__d">{t.scopeDeviceDesc}</span>
                    </button>
                    <button type="button" className="scopechoice__b" onClick={() => applyListen("account")}>
                        <span className="scopechoice__t"><Icon n="globe" sm /> {t.scopeAccount}</span>
                        <span className="scopechoice__d">{t.scopeAccountDesc}</span>
                    </button>
                </div>
            </Modal>
        </main>
    );
};

export default MyPage;
