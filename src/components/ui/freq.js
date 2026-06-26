// Градации частотности слова (Zipf-банды с бэка) → подпись по языкам + цвет-класс.
// Банды: very_common > common > frequent > occasional > rare > very_rare.
import { langGuard } from "../../interface/i18nGuard.js";

const LABELS = langGuard({
    ru:  { very_common: "очень часто", common: "часто", frequent: "нередко", occasional: "иногда", rare: "редко", very_rare: "очень редко" },
    en:  { very_common: "very common", common: "common", frequent: "frequent", occasional: "occasional", rare: "rare", very_rare: "very rare" },
    ukr: { very_common: "дуже часто", common: "часто", frequent: "доволі часто", occasional: "інколи", rare: "рідко", very_rare: "дуже рідко" },
    pl:  { very_common: "bardzo często", common: "często", frequent: "dość często", occasional: "czasem", rare: "rzadko", very_rare: "bardzo rzadko" },
    lt:  { very_common: "labai dažnai", common: "dažnai", frequent: "gana dažnai", occasional: "kartais", rare: "retai", very_rare: "labai retai" },
    lv:  { very_common: "ļoti bieži", common: "bieži", frequent: "diezgan bieži", occasional: "reizēm", rare: "reti", very_rare: "ļoti reti" },
}, "freq.LABELS");

// Подпись бэнда на языке интерфейса.
export function freqLabel(band, lang = "ru") {
    if (!band) return "";
    return (LABELS[lang] || LABELS.ru)[band] || "";
}

// Класс-модификатор для цвета чипа (зелёный = частое → серый = редкое).
export function freqCls(band) {
    return band ? `freq--${band.replace("_", "-")}` : "";
}

// Сколько «делений» закрасить (1..5) — для мини-индикатора.
export const FREQ_DOTS = { very_common: 5, common: 4, frequent: 3, occasional: 2, rare: 1, very_rare: 1 };
