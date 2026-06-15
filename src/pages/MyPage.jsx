import { useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useWordsStore } from "../store/wordStore.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { Icon } from "../components/ui/Icon.jsx";
import { wordCount, dictCount } from "../components/tools/plural.js";

const MyPage = () => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const navigate = useNavigate();
    const { logout, user, setTheme } = useAuth();
    const theme = useSystemStore((state) => state.theme);
    const dictList = useWordsStore((state) => state.dictList);

    const [tts, setTts] = useState(true);
    const [darkGame, setDarkGame] = useState(true);

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
    const avatar = username.charAt(0).toUpperCase();

    const logOut = () => { logout(); navigate("/authorization"); };

    return (
        <main className="shell prof-main">
            <div className="phead">
                <div className="pavatar">{avatar}</div>
                <div className="phead__meta">
                    <div className="phead__name">{username}</div>
                    <div className="phead__sub">Lære Norsk · {dictCount(stats.dicts, currentLanguage)} · {wordCount(stats.total, currentLanguage)}</div>
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
                            <select className="mini-select" value={currentLanguage} onChange={(e) => useSystemStore.getState().setCurrentLanguage(e.target.value)}>
                                <option value="ukr">Українська</option>
                                <option value="ru">Русский</option>
                                <option value="en">English</option>
                                <option value="pl">Polski</option>
                                <option value="lt">Lietuvių</option>
                            </select>
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n={theme === "dark" ? "moon" : "sun"} sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.darkTheme}</span><span className="setrow__d">{t.darkThemeDesc}</span></span>
                            <span className={`toggle${theme === "dark" ? " is-on" : ""}`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="volume" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.tts}</span><span className="setrow__d">{t.ttsDesc}</span></span>
                            <span className={`toggle${tts ? " is-on" : ""}`} onClick={() => setTts((p) => !p)} />
                        </div>
                        <div className="setrow">
                            <span className="setrow__ic"><Icon n="settings" sm /></span>
                            <span className="setrow__meta"><span className="setrow__t">{t.darkGame}</span><span className="setrow__d">{t.darkGameDesc}</span></span>
                            <span className={`toggle${darkGame ? " is-on" : ""}`} onClick={() => setDarkGame((p) => !p)} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default MyPage;
