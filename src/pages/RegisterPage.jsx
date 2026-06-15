import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useSystemStore } from "../store/systemStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { BrandMark, BrandName } from "../components/ui/BrandMark.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { BtnSpinner } from "../components/ui/Spinner.jsx";
import LanguageChooser from "../components/languageChooser.jsx";
import { SAMPLES, POS_DOT } from "../interface/samples.js";

const RegisterPage = () => {
    const { register, login, isLoading, registrationError } = useAuth();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        const result = await register(username, password);
        if (result && result.message === "User created successfully") {
            await login(username, password);
            navigate("/mypage");
        }
    };

    return (
        <div className="auth" style={{ position: "relative" }}>
            <div className="auth__lang"><LanguageChooser className="" /></div>
            <aside className="auth__brand">
                <Link className="brand" to="/words" style={{ color: "#fff" }}>
                    <BrandMark /> <BrandName />
                </Link>
                <div className="auth__pitch">
                    <h2>{t.pitchRegTitle}</h2>
                    <p>{t.pitchReg}</p>
                    <div className="auth__deco">
                        {[SAMPLES[4], SAMPLES[3]].map((s) => (
                            <div className="minicard" key={s.no}>
                                <span className="minicard__pos" style={{ background: POS_DOT[s.pos] }} />
                                <span className="minicard__w">{s.no}</span>
                                <span className="minicard__t">{s.tr[currentLanguage]}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="auth__foot">© 2026 Lære Norsk · t.me/progtt</div>
            </aside>

            <main className="auth__form">
                <div className="auth__inner">
                    <div className="auth__mobilebrand"><BrandMark /> <BrandName /></div>

                    <span className="eyebrow">{t.createAccount}</span>
                    <h1 className="auth__title">{t.registration}</h1>
                    <p className="auth__lead">{t.regLead}</p>

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
                                <input className={`input${registrationError ? " is-error" : ""}`} id="p" type="password" value={password}
                                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                            </div>
                            {registrationError
                                ? <span className="alert"><Icon n="x" sm /> {registrationError}</span>
                                : <span className="input-hint"><Icon n="check" sm style={{ verticalAlign: "-3px", color: "var(--success)" }} /> {t.passwordLengthError}</span>}
                        </div>

                        <button className="btn btn--accent btn--lg btn--block auth__submit" disabled={isLoading}>
                            {isLoading
                                ? <><BtnSpinner /> {t.registration}…</>
                                : <>{t.register} <Icon n="arrow-right" sm /></>}
                        </button>
                    </form>

                    <p className="auth__switch">{t.haveAccount} <Link to="/authorization">{t.login}</Link></p>
                </div>
            </main>
        </div>
    );
};

export default RegisterPage;
