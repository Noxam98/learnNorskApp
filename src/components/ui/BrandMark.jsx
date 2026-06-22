import { useId } from "react";

// Логотип Lære Norsk: норвежский флаг в центре + спутники-флаги (UA·LT·PL).
// clipPath-id уникальны на экземпляр (useId) — несколько лого на странице не конфликтуют.
/**
 * @param {{ size?: number, radius?: number, style?: import('react').CSSProperties }} props
 */
export const BrandMark = ({ size = 36, radius = 10, style }) => {
    const uid = useId().replace(/:/g, "");
    const NO = `no-${uid}`, UA = `ua-${uid}`, LT = `lt-${uid}`, PL = `pl-${uid}`;
    return (
        <span className="brand__mark" style={{ width: size, height: size, borderRadius: radius, ...style }}>
            <svg viewBox="0 0 36 36" fill="none">
                <defs>
                    <clipPath id={NO}><circle cx="18" cy="18" r="7.3" /></clipPath>
                    <clipPath id={UA}><circle cx="18" cy="5" r="4.6" /></clipPath>
                    <clipPath id={LT}><circle cx="29.26" cy="24.5" r="4.6" /></clipPath>
                    <clipPath id={PL}><circle cx="6.74" cy="24.5" r="4.6" /></clipPath>
                </defs>
                <rect width="36" height="36" rx="10" fill="#15414A" />
                <g clipPath={`url(#${UA})`}><rect x="13" y="0" width="10" height="5" fill="#0057B7" /><rect x="13" y="5" width="10" height="5" fill="#FFD700" /></g>
                <circle cx="18" cy="5" r="4.6" fill="none" stroke="#fff" strokeWidth="0.7" opacity=".92" />
                <g clipPath={`url(#${LT})`}><rect x="24" y="19.9" width="11" height="3.07" fill="#FDB913" /><rect x="24" y="22.97" width="11" height="3.07" fill="#006A44" /><rect x="24" y="26.03" width="11" height="3.07" fill="#C1272D" /></g>
                <circle cx="29.26" cy="24.5" r="4.6" fill="none" stroke="#fff" strokeWidth="0.7" opacity=".92" />
                <g clipPath={`url(#${PL})`}><rect x="1.5" y="19.9" width="11" height="4.6" fill="#fff" /><rect x="1.5" y="24.5" width="11" height="4.6" fill="#DC143C" /></g>
                <circle cx="6.74" cy="24.5" r="4.6" fill="none" stroke="#fff" strokeWidth="0.7" opacity=".92" />
                <g clipPath={`url(#${NO})`}><rect x="10.7" y="10.7" width="14.6" height="14.6" fill="#BA0C2F" /><rect x="10.7" y="16.2" width="14.6" height="3.6" fill="#fff" /><rect x="13.2" y="10.7" width="3.6" height="14.6" fill="#fff" /><rect x="10.7" y="17.1" width="14.6" height="1.8" fill="#00205B" /><rect x="14.1" y="10.7" width="1.8" height="14.6" fill="#00205B" /></g>
                <circle cx="18" cy="18" r="7.3" fill="none" stroke="#fff" strokeWidth="0.9" />
            </svg>
        </span>
    );
};

export const BrandName = () => (
    <span className="brand__name">Lære<b>·</b>Norsk</span>
);

export default BrandMark;
