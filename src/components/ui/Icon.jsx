// Иконка из общего SVG-спрайта (src/styles/icons.js инжектит спрайт в DOM).
// Использование: <Icon n="type" />, <Icon n="check" sm />, <Icon n="user" lg />
export const Icon = ({ n, sm, lg, className = "", ...rest }) => {
    const size = sm ? " ic-sm" : lg ? " ic-lg" : "";
    return (
        <svg className={`ic${size} ${className}`.trim()} {...rest}>
            <use href={`#i-${n}`} />
        </svg>
    );
};

export default Icon;
