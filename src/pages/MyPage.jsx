import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useWordsStore } from "../store/wordStore.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { Icon } from "../components/ui/Icon.jsx";
import { Dropdown } from "../components/ui/Dropdown.jsx";
import GoogleSignInButton from "../components/ui/GoogleSignInButton.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { BtnSpinner } from "../components/ui/Spinner.jsx";
import api from "../components/tools/api.js";
import { wordCount, dictCount } from "../components/tools/plural.js";

const GOOGLE_ON = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
    const dictList = useWordsStore((state) => state.dictList);


    const stats = useMemo(() => {
        const allWords = dictList.flatMap((d) => d.words);
        const correct = allWords.reduce((a, w) => a + (w.gameData?.correctFirstTry || 0), 0);
        const wrong = allWords.reduce((a, w) => a + (w.gameData?.incorrectFirstTry || 0), 0);
        const attempts = correct + wrong;
        const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
        const mastered = allWords.filter(
            (w) => (w.gameData?.correctFirstTry || 0) > 0 && (w.gameData?.correctFirstTry || 0) > (w.gameData?.incorrectFirstTry || 0)
        ).length;
        const maxWords = Math.max(1, ...dictList.map((d) => d.words.length));
        return { total: allWords.length, dicts: dictList.length, attempts, accuracy, mastered, maxWords };
    }, [dictList]);

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
                    <div className="phead__sub">{user?.name ? `@${username} · ` : ""}{dictCount(stats.dicts, currentLanguage)} · {wordCount(stats.total, currentLanguage)}</div>
                </div>
                <button className="btn btn--outline" onClick={logOut}><Icon n="logout" sm /> {t.logout}</button>
            </div>

            <div className="stats">
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--fjord-50)", color: "var(--fjord-600)" }}><Icon n="type" /></div>
                    <div className="scard__n">{stats.total}</div>
                    <div className="scard__l">{t.wordsTotal}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--ember-50)", color: "var(--ember-600)" }}><Icon n="layers" /></div>
                    <div className="scard__n">{stats.dicts}</div>
                    <div className="scard__l">{t.dictsLabel}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--success-bg)", color: "var(--success)" }}><Icon n="target" /></div>
                    <div className="scard__n">{stats.chosen}</div>
                    <div className="scard__l">{t.chosenForGame}</div>
                </div>
                <div className="scard">
                    <div className="scard__ic" style={{ background: "var(--pos-adj-bg)", color: "var(--pos-adj)" }}><Icon n="sparkles" /></div>
                    <div className="scard__n">{stats.withDesc}</div>
                    <div className="scard__l">{t.withDescription}</div>
                </div>
            </div>

            <div className="pgrid">
                <div className="panel">
                    <div className="panel__head">
                        <span className="panel__title">{t.dictionaries}</span>
                        <span className="muted-3" style={{ fontSize: "var(--fs-13)" }}>{t.word.toLowerCase()}</span>
                    </div>
                    <div className="panel__body">
                        {dictList.map((d, i) => {
                            const name = d.dictName === "default" ? t.defaultDict : d.dictName;
                            const pct = Math.round((d.words.length / stats.maxWords) * 100);
                            const colors = ["var(--fjord-600)", "var(--ember-600)", "var(--pos-adj)"];
                            return (
                                <div className="drow" key={d.dictName}>
                                    <div className="drow__top"><span className="drow__name">{name}</span><span className="drow__val">{d.words.length}</span></div>
                                    <div className="bar"><span style={{ width: `${pct}%`, background: colors[i % colors.length] }} /></div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="panel">
                    <div className="panel__head"><span className="panel__title">{t.settings}</span></div>
                    <div className="panel__body">
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="globe" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.interfaceLang}</span><span className="setrow__d">{t.interfaceLangDesc}</span></span>
                            <Dropdown value={currentLanguage}
                                onChange={(v) => useSystemStore.getState().setCurrentLanguage(v)}
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
        </main>
    );
};

export default MyPage;
