// Лоадеры Lære Norsk (React-порт брендового дизайна, стили — styles/loader.css).
// Состав:
//   <BrandLoader size label dark />  — «орбита флагов» по центру области (инициализация секции)
//   <BrandOrbit size dark />         — только орбита, без подписи/обёртки (инлайн)
//   <Dots />                         — точки-фьорд (загрузка из БД после дебаунса)
//   <BtnSpinner />                   — кнопочный спиннер 1em (наследует currentColor)
//   <SkeletonWordlist count />       — скелетон списка слов (повторяет вёрстку карточек)
//   <Skeleton className />           — произвольный skeleton-блок
//   <CountdownRing duration />       — кольцо обратного отсчёта дебаунса
// Совместимость: Spinner ≈ BtnSpinner, PageLoader ≈ BrandLoader.
import { Fragment } from "react";

// --- Брендовый лоадер «орбита флагов» ---
export const BrandOrbit = ({ size, dark, className = "", ...rest }) => {
    const cls = ["ln-loader", size && `ln-loader--${size}`, dark && "is-dark", className]
        .filter(Boolean).join(" ");
    return (
        <span className={cls} role="status" aria-label="Загрузка" {...rest}>
            <span className="ln-loader__track" />
            <span className="ln-loader__ring">
                <span className="ln-orbit"><span className="ln-flag ln-flag--ua" /></span>
                <span className="ln-orbit"><span className="ln-flag ln-flag--lt" /></span>
                <span className="ln-orbit"><span className="ln-flag ln-flag--pl" /></span>
            </span>
            <span className="ln-no"><span className="ln-no-arm"><span className="ln-no-flag" /></span></span>
        </span>
    );
};

export const BrandLoader = ({ size = "md", label, dark }) => (
    <div className={`ln-loading${dark ? " ln-on-dark" : ""}`}>
        <BrandOrbit size={size} dark={dark} />
        {label && <span className="ln-loading__label">{label}</span>}
    </div>
);

// --- Точки и кнопочный спиннер ---
export const Dots = ({ className = "", ...rest }) => (
    <span className={`ln-dots ${className}`.trim()} role="status" aria-label="Загрузка" {...rest}>
        <i /><i /><i />
    </span>
);

export const BtnSpinner = ({ className = "", ...rest }) => (
    <span className={`ln-spin ${className}`.trim()} role="status" aria-label="Загрузка" {...rest} />
);

// --- Skeleton-блоки ---
export const Skeleton = ({ className = "" }) => <span className={`skel ${className}`.trim()} />;

const SkWcard = () => (
    <div className="sk-wcard">
        <span className="sk-wcard__check skel" />
        <span className="sk-wcard__body">
            <span className="sk-wcard__w skel" />
            <span className="sk-wcard__chip skel" />
            <span className="sk-wcard__tr skel" />
        </span>
    </div>
);

export const SkeletonWordlist = ({ count = 9 }) => (
    <div className="sk-wordlist" aria-busy="true">
        {Array.from({ length: count }, (_, i) => <SkWcard key={i} />)}
    </div>
);

// --- Кольцо обратного отсчёта дебаунса ---
// «Добегает» по кругу за `duration` мс; рестарт — через key (ремонтируем на каждый ввод).
export const CountdownRing = ({ duration = 550, size = 16, className = "" }) => {
    const stroke = 2;
    const r = (size - stroke) / 2;
    const c = +(2 * Math.PI * r).toFixed(2);
    const half = size / 2;
    return (
        <svg className={`cring ${className}`.trim()} width={size} height={size}
            viewBox={`0 0 ${size} ${size}`} role="status" aria-label="loading">
            <circle className="cring__track" cx={half} cy={half} r={r} strokeWidth={stroke} />
            <circle className="cring__run" cx={half} cy={half} r={r} strokeWidth={stroke}
                style={{ strokeDasharray: c, "--cring-len": c, "--cring-dur": `${duration}ms` }} />
        </svg>
    );
};

// --- Совместимость со старыми именами ---
export const Spinner = (props) => <BtnSpinner {...props} />;
export const PageLoader = ({ text }) => <BrandLoader label={text} />;

export default Spinner;
