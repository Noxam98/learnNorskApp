// Логотип Lære Norsk (фьорд + ember-точка). size — сторона в px.
export const BrandMark = ({ size = 36, radius = 10, style }) => (
    <span className="brand__mark" style={{ width: size, height: size, borderRadius: radius, ...style }}>
        <svg viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#195059" />
            <path d="M6 26 L13.5 13 L18 20.5 L22 14 L30 26 Z" fill="#EAF1EE" />
            <circle cx="25.5" cy="11" r="3.1" fill="#CE4A21" />
        </svg>
    </span>
);

export const BrandName = () => (
    <span className="brand__name">Lære<b>·</b>Norsk</span>
);

export default BrandMark;
