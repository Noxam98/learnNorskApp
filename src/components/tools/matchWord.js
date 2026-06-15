// Переиспользуемый поиск по слову: норвежский + все переводы, без регистра/диакритики.
// æ/ø/å НЕ сворачиваем (это самостоятельные буквы) — как и поиск на бэкенде.
export const fold = (s) =>
    (s == null ? "" : String(s)).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// word: форма пула ({word, translate}) или личного словаря ({translate:{no:[...]}}).
export const matchWord = (word, query) => {
    const q = fold(query).trim();
    if (!q) return true;
    const no = word?.translate?.no?.[0] || word?.word || "";
    if (fold(no).includes(q)) return true;
    const tr = word?.translate || {};
    return Object.values(tr).some((arr) => (arr || []).some((v) => fold(v).includes(q)));
};

export default matchWord;
