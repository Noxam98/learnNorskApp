// Единый реестр типов сортировки: дефолтное направление + метки из t.sortLabels.
// Используется универсальным <SortControl> во всех местах с сортировкой (Пул/Словарь/Учёба),
// чтобы метки и поведение были одинаковыми. Набор ключей каждый экран передаёт свой (что применимо).
export const SORT_DEFAULT_ORDER = {
    alpha: "asc",     // А-Я
    level: "asc",     // A1→C2
    freq: "desc",     // частота использования: частые сначала
    added: "desc",    // новые сначала
    pos: "asc",       // часть речи
    strength: "asc",  // слабые сначала
    due: "asc",       // ближайшие к повторению сначала
};

// t — объект перевода (с t.sortLabels); keys — какие сорты показать на этом экране.
export const sortOptions = (t, keys) => {
    const L = (t && t.sortLabels) || {};
    return keys.map((k) => ({ value: k, label: L[k] || k, defaultOrder: SORT_DEFAULT_ORDER[k] || "asc" }));
};
