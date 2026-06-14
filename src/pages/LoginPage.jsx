import React, { useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSystemStore } from "../store/systemStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { BrandMark, BrandName } from "../components/ui/BrandMark.jsx";
import { Icon } from "../components/ui/Icon.jsx";

const LoginPage = () => {
    const { login, isLoading, authorizationError, isAuthenticated } = useAuth();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) navigate('/mypage');
    }, [isAuthenticated]);

    const onSubmit = async (e) => {
        e.preventDefault();
        await login(username, password);
    };

    return (
        <div className="auth">
            <aside className="auth__brand">
                <Link className="brand" to="/words" style={{ color: "#fff" }}>
                    <BrandMark /> <BrandName />
                </Link>
                <div className="auth__pitch">
                    <h2>{t.pitchLoginTitle}</h2>
                    <p>{t.pitchLogin}</p>
                    <div className="auth__deco">
                        <div className="minicard"><span className="minicard__pos" style={{ background: "var(--pos-noun)" }} /><span className="minicard__w">venn</span><span className="minicard__t">друг</span></div>
                        <div className="minicard"><span className="minicard__pos" style={{ background: "var(--pos-adj)" }} /><span className="minicard__w">koselig</span><span className="minicard__t">уютный</span></div>
                        <div className="minicard"><span className="minicard__pos" style={{ background: "var(--pos-verb)" }} /><span className="minicard__w">å snakke</span><span className="minicard__t">говорить</span></div>
                    </div>
                </div>
                <div className="auth__foot">© 2026 Lære Norsk · t.me/progtt</div>
            </aside>

            <main className="auth__form">
                <div className="auth__inner">
                    <div className="auth__mobilebrand"><BrandMark /> <BrandName /></div>

                    <span className="eyebrow">{t.welcomeBack}</span>
                    <h1 className="auth__title">{t.authorization}</h1>
                    <p className="auth__lead">{t.loginLead}</p>

                    <form className="auth__fields" onSubmit={onSubmit}>
                        <div className="field">
                            <label className="label" htmlFor="u">{t.username}</label>
                            <div className="input-icon">
                                <Icon n="user" sm />
                                <input className="input" id="u" type="text" value={username}
                                    onChange={(e) => setUsername(e.target.value)} placeholder={t.username} />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label" htmlFor="p">{t.password}</label>
                            <div className="input-icon">
                                <Icon n="lock" sm />
                                <input className={`input${authorizationError ? " is-error" : ""}`} id="p" type="password" value={password}
                                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                            </div>
                            {authorizationError && (
                                <span className="alert"><Icon n="x" sm /> {authorizationError}</span>
                            )}
                        </div>

                        <button className="btn btn--accent btn--lg btn--block auth__submit" disabled={isLoading}>
                            {isLoading ? `${t.authorization}…` : t.login} <Icon n="arrow-right" sm />
                        </button>
                    </form>

                    <p className="auth__switch">{t.noAccountQ} <Link to="/registration">{t.register}</Link></p>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
