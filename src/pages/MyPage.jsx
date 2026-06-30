import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { AH, NPS, LPK, GRM, GRM_POS } from "./MyPage.i18n.js";
import { LANGUAGES } from "../interface/languages.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import { useSystemStore, VIBE_MS } from "../store/systemStore.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useAuthStore } from "../store/AuthStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Dropdown } from "../components/ui/Dropdown.jsx";
import GoogleSignInButton from "../components/ui/GoogleSignInButton.jsx";
import NameEditModal from "../components/profile/NameEditModal.jsx";
import PasswordModal from "../components/profile/PasswordModal.jsx";
import api from "../components/tools/api.js";
import { enablePush, disablePush } from "../components/tools/push.js";
import { wordCount } from "../components/tools/plural.js";

const GOOGLE_ON = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;


// Локальные подписи (статистика теперь из «Учёбы», а не из личных словарей).
const STATUS_ORDER = ["new", "in_progress", "repeat", "mastered"];
const STATUS_LBL = {
    new: { ru: "Новые", ukr: "Нові", en: "New", pl: "Nowe", lt: "Nauji", lv: "Jauni", ar: "جديدة" },
    in_progress: { ru: "В процессе", ukr: "У процесі", en: "In progress", pl: "W trakcie", lt: "Eigoje", lv: "Procesā", ar: "قيد التقدّم" },
    repeat: { ru: "Повторение", ukr: "Повторення", en: "Review", pl: "Powtórka", lt: "Kartojimas", lv: "Atkārtojums", ar: "مراجعة" },
    mastered: { ru: "Выучено", ukr: "Вивчено", en: "Mastered", pl: "Opanowane", lt: "Išmokta", lv: "Apgūts", ar: "متقَنة" },
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

    // Имя и пароль — самодостаточные модалки (NameEditModal/PasswordModal), здесь лишь флаги открытия.
    const [nameOpen, setNameOpen] = useState(false);
    const [pwOpen, setPwOpen] = useState(false);
    const theme = useSystemStore((state) => state.theme);
    const showArticles = useSystemStore((state) => state.showArticles);
    const showVerbAa = useSystemStore((state) => state.showVerbAa);
    const soundOn = useSystemStore((state) => state.soundOn);
    const autoAdvance = useSystemStore((state) => state.autoAdvance);
    const vibration = useSystemStore((state) => state.vibration);
    const vibrationStrength = useSystemStore((state) => state.vibrationStrength);
    const pushEnabled = useSystemStore((state) => state.pushEnabled);
    const autoHideNav = useSystemStore((state) => state.autoHideNav);
    const kbdAssist = useSystemStore((state) => state.kbdAssist);
    const kbdAssistZones = useSystemStore((state) => state.kbdAssistZones);
    const ah = AH[currentLanguage] || AH.en;
    const nps = NPS[currentLanguage] || NPS.en;
    const lpk = LPK[currentLanguage] || LPK.en;
    const grm = GRM[currentLanguage] || GRM.en;
    const grmPos = GRM_POS[currentLanguage] || GRM_POS.en;
    // Порция новых слов за сессию (gamePrefs.newPerSession, дефолт 6; слайдер 4–10).
    const newPerSession = Math.min(10, Math.max(4, user?.gamePrefs?.newPerSession || 6));
    const setNewPerSession = (v) => {
        useAuthStore.setState((s) => (s.user ? { user: { ...s.user, gamePrefs: { ...(s.user.gamePrefs || {}), newPerSession: v } } } : s));
        api.setGamePrefs({ newPerSession: v }).catch(() => { /* офлайн — не критично */ });
    };
    // Аудиозадания (gamePrefs.audio, дефолт ВКЛ.): аудио-узнавание вынесено в отдельную слуховую партию.
    // Выкл → choice_no2int возвращается в дневную сессию текстом (без слуховой партии).
    const audioOn = user?.gamePrefs?.audio !== false;
    const toggleAudio = () => {
        const next = !audioOn;
        useAuthStore.setState((s) => (s.user ? { user: { ...s.user, gamePrefs: { ...(s.user.gamePrefs || {}), audio: next } } } : s));
        api.setGamePrefs({ audio: next }).catch(() => { /* офлайн — не критично */ });
    };
    // Порог слуховой партии (gamePrefs.listenPack, дефолт 10; слайдер 5–20) — активен только при audioOn.
    const listenPack = Math.min(20, Math.max(5, user?.gamePrefs?.listenPack || 10));
    const setListenPack = (v) => {
        useAuthStore.setState((s) => (s.user ? { user: { ...s.user, gamePrefs: { ...(s.user.gamePrefs || {}), listenPack: v } } } : s));
        api.setGamePrefs({ listenPack: v }).catch(() => { /* офлайн — не критично */ });
    };
    // Грамм-упражнения в сессии (gamePrefs.grammar, дефолт ВКЛ.). Сохраняем тем же путём (set_user_game_prefs).
    const grammarOn = user?.gamePrefs?.grammar !== false;
    const toggleGrammar = () => {
        const next = !grammarOn;
        useAuthStore.setState((s) => (s.user ? { user: { ...s.user, gamePrefs: { ...(s.user.gamePrefs || {}), grammar: next } } } : s));
        api.setGamePrefs({ grammar: next }).catch(() => { /* офлайн — не критично */ });
    };
    // Пер-POS тумблеры грамматики (gamePrefs.grammarPos): какой части речи давать упражнения. Нет → все вкл.
    const grammarPos = user?.gamePrefs?.grammarPos || {};
    const posOn = (k) => grammarPos[k] !== false;
    const toggleGrammarPos = (k) => {
        const next = { ...grammarPos, [k]: !posOn(k) };
        useAuthStore.setState((s) => (s.user ? { user: { ...s.user, gamePrefs: { ...(s.user.gamePrefs || {}), grammarPos: next } } } : s));
        api.setGamePrefs({ grammarPos: next }).catch(() => { /* офлайн — не критично */ });
    };
    const isPhone = useIsMobile();
    const [pushBusy, setPushBusy] = useState(false);
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
                    <div className="phead__sub">{user?.name ? `@${username} · ` : ""}{wordCount(total, currentLanguage)} · {t.levelLbl} {currentLevel}</div>
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
                    <div className="scard__l">{t.masteredLbl}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--pos-adj-bg)", color: "var(--pos-adj)" }}><Icon n="check" /></div>
                    <div className="scard__n">{accuracy == null ? "—" : accuracy + "%"}</div>
                    <div className="scard__l">{t.accuracy}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--ember-50)", color: "var(--ember-600)" }}><Icon n="graduation" /></div>
                    <div className="scard__n">{currentLevel}</div>
                    <div className="scard__l">{t.levelLbl}</div>
                </div>
            </div>

            {isAdmin && (
                <div className="panel" style={{ marginBottom: "var(--sp-5)" }}>
                    <div className="panel__head"><span className="panel__title">{t.adminLbl}</span></div>
                    <div className="panel__body" style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
                        <button className="btn btn--outline" onClick={() => navigate("/moderation")}>
                            <Icon n="check-circle" sm /> {t.modLbl}
                            {pendingCount > 0 && <span className="fchip__n" style={{ marginLeft: 6 }}>{pendingCount}</span>}
                        </button>
                        <button className="btn btn--outline" onClick={() => navigate("/stats")}>
                            <Icon n="chart" sm /> {t.statsLbl}
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
                            <Icon n="graduation" sm /> {t.openStudy}
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
                                options={LANGUAGES.map((l) => ({ value: l.code, label: l.name, emoji: l.flag }))} />
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
                            <button className="btn btn--ghost" onClick={() => setNameOpen(true)}>{t.edit}</button>
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
                        {isPhone && (
                            <div className="setrow">
                                <span className="setrow__ic"><Icon n="grip" sm /></span>
                                <span className="setrow__meta"><span className="setrow__t">{ah.t}</span><span className="setrow__d">{ah.d}</span></span>
                                <span className={`toggle${autoHideNav ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setAutoHideNav(!autoHideNav)} />
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
                        {/* Аудиозадания: аудио-узнавание вынесено в отдельную слуховую партию. Вкл (дефолт) —
                            слова подтверждаются на слух партией по N; выкл — choice_no2int идёт в дневную текстом. */}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="volume" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.listenTasks}</span><span className="setrow__d">{t.listenTasksDesc}</span></span>
                            <span className={`toggle${audioOn ? " is-on" : ""}`} onClick={toggleAudio} />
                        </div>
                        {/* Порог слуховой партии — слайдер 5–20, виден/активен только при включённых аудиозаданиях */}
                        {audioOn && (
                            <div className="setrow">
                                <span className="setrow__ic"><Icon n="headphones" sm /></span>
                                <span className="setrow__meta">
                                    <span className="setrow__t">{lpk.t.replace("{n}", listenPack)}</span>
                                    <span className="setrow__d">{lpk.d.replace("{n}", listenPack)}</span>
                                </span>
                                <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flex: "none" }}>
                                    <input type="range" min="5" max="20" value={listenPack}
                                        onChange={(e) => setListenPack(Number(e.target.value))} style={{ width: 120 }} />
                                    <b style={{ minWidth: 16, textAlign: "center", fontSize: "var(--fs-15)" }}>{listenPack}</b>
                                </span>
                            </div>
                        )}
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
                        {/* Порция новых слов за сессию (порционное знакомство) — слайдер 4–10 */}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="layers" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{nps.t}</span><span className="setrow__d">{nps.d}</span></span>
                            <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flex: "none" }}>
                                <input type="range" min="4" max="10" value={newPerSession}
                                    onChange={(e) => setNewPerSession(Number(e.target.value))} style={{ width: 120 }} />
                                <b style={{ minWidth: 16, textAlign: "center", fontSize: "var(--fs-15)" }}>{newPerSession}</b>
                            </span>
                        </div>
                        {/* Грамматика (род/формы): overlay-упражнения к выученным словам. Дефолт вкл.
                            Доступный тумблер: настоящая кнопка role="switch" — фокус/Enter/Space + озвучка скринридером. */}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="graduation" sm /></span>
                            <span className="setrow__meta" id="grm-label"><span className="setrow__t">{grm.t}</span><span className="setrow__d">{grm.d}</span></span>
                            <button type="button" className={`toggle${grammarOn ? " is-on" : ""}`} role="switch"
                                aria-checked={grammarOn} aria-labelledby="grm-label" onClick={toggleGrammar} />
                        </div>
                        {grammarOn && (
                            <div className="grm-pos">
                                {["noun", "verb", "adjective", "pronoun"].map((k) => (
                                    <button key={k} type="button" role="switch" aria-checked={posOn(k)}
                                        className={`grm-pos__chip${posOn(k) ? " is-on" : ""}`}
                                        onClick={() => toggleGrammarPos(k)}>{grmPos[k]}</button>
                                ))}
                            </div>
                        )}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="alert" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.notifications}</span><span className="setrow__d">{t.notificationsDesc}</span></span>
                            <span className={`toggle${pushEnabled ? " is-on" : ""}`} style={pushBusy ? { opacity: 0.5, pointerEvents: "none" } : undefined} onClick={togglePush} />
                        </div>
                        {/* Помощь при наборе (анти-опечатка): расширение зоны тапа ожидаемой буквы — для всех юзеров */}
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="target" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.kbdAssist}</span><span className="setrow__d">{t.kbdAssistDesc}</span></span>
                            <span className={`toggle${kbdAssist ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setKbdAssist(!kbdAssist)} />
                        </div>
                        {/* Только админ: отладочная подсветка зоны (текст не i18n — служебный тумблер) */}
                        {isAdmin && (
                            <div className="setrow">
                                <span className="setrow__ic"><Icon n="square" sm /></span>
                                <span className="setrow__meta"><span className="setrow__t">Подсветка зоны след. буквы</span><span className="setrow__d">Отладка: показывать на клавиатуре фактическую зону тапа следующей буквы</span></span>
                                <span className={`toggle${kbdAssistZones ? " is-on" : ""}`} onClick={() => useSystemStore.getState().setKbdAssistZones(!kbdAssistZones)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <NameEditModal open={nameOpen} initial={user?.name} t={t}
                onClose={() => setNameOpen(false)} onSaved={refreshMe} />

            <PasswordModal open={pwOpen} hasPassword={user?.hasPassword} t={t}
                onClose={() => setPwOpen(false)} onSaved={refreshMe} />
        </main>
    );
};

export default MyPage;
