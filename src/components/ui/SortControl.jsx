// Универсальный контрол сортировки: иконка + выпадающий список типов + кнопка направления (↑/↓).
// Единый для всех экранов (Пул/Словарь/Учёба). При выборе типа подставляется его дефолтное
// направление; кнопка ↑/↓ переключает направление. Всё наружу одним onChange(sort, order).
import { Icon } from "./Icon.jsx";
import { Dropdown } from "./Dropdown.jsx";

// options: [{ value, label, defaultOrder }] (см. sortOptions.js)
export const SortControl = ({ value, order = "asc", options = [], onChange }) => {
    const pick = (s) => {
        const opt = options.find((o) => o.value === s);
        onChange?.(s, opt?.defaultOrder || "asc");
    };
    const toggle = () => onChange?.(value, order === "asc" ? "desc" : "asc");
    return (
        <div className="sortctl">
            <Icon n="sort" sm />
            <Dropdown value={value} onChange={pick} options={options} />
            <button className="iconbtn" title={order === "asc" ? "↑" : "↓"} aria-label="order" onClick={toggle}>
                <Icon n={order === "asc" ? "arrow-up" : "arrow-down"} sm />
            </button>
        </div>
    );
};

export default SortControl;
