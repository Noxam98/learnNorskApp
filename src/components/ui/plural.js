// Склонение существительных/прилагательных по числу для UI.
// ru/ukr/pl/lt — 3 формы [одно (1, 21…), мало (2–4), много (5–20, 0…)]; en — 2 формы [one, other].
// Индекс по правилам CLDR (упрощённо, достаточно для счётчиков 0…999).
export function pluralIndex(lang, n) {
    n = Math.abs(Math.trunc(n || 0));
    const m10 = n % 10, m100 = n % 100;
    switch (lang) {
        case "en":
            return n === 1 ? 0 : 1;
        case "pl":
            if (n === 1) return 0;
            if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
            return 2;
        case "lt":
            if (m10 === 1 && m100 !== 11) return 0;
            if (m10 >= 2 && m10 <= 9 && (m100 < 11 || m100 > 19)) return 1;
            return 2;
        case "lv": // [одно (1, 21…), много] — латышский по числам сводим к 2 формам
            return (m10 === 1 && m100 !== 11) ? 0 : 1;
        case "ar": // арабский упрощённо сводим к 2 формам [ед., мн.]
            return n === 1 ? 0 : 1;
        default: // ru, ukr (одинаковые правила)
            if (m10 === 1 && m100 !== 11) return 0;
            if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
            return 2;
    }
}

// Формы по ключу: [одно, мало, много] (для en — [one, other]).
const FORMS = {
    word: { ru: ["слово", "слова", "слов"], ukr: ["слово", "слова", "слів"], en: ["word", "words"], pl: ["słowo", "słowa", "słów"], lt: ["žodis", "žodžiai", "žodžių"], lv: ["vārds", "vārdi"], ar: ["كلمة", "كلمات"] },
    card: { ru: ["карточка", "карточки", "карточек"], ukr: ["картка", "картки", "карток"], en: ["card", "cards"], pl: ["karta", "karty", "kart"], lt: ["kortelė", "kortelės", "kortelių"], lv: ["kartiņa", "kartiņas"], ar: ["بطاقة", "بطاقات"] },
    day:  { ru: ["день", "дня", "дней"], ukr: ["день", "дні", "днів"], en: ["day", "days"], pl: ["dzień", "dni", "dni"], lt: ["diena", "dienos", "dienų"], lv: ["diena", "dienas"], ar: ["يوم", "أيام"] },
    weak: { ru: ["слабое", "слабых", "слабых"], ukr: ["слабке", "слабких", "слабких"], en: ["weak", "weak"], pl: ["słabe", "słabe", "słabych"], lt: ["silpnas", "silpni", "silpnų"], lv: ["vājš", "vāji"], ar: ["ضعيفة", "ضعيفة"] },
    fresh: { ru: ["новое", "новых", "новых"], ukr: ["нове", "нових", "нових"], en: ["new", "new"], pl: ["nowe", "nowe", "nowych"], lt: ["naujas", "nauji", "naujų"], lv: ["jauns", "jauni"], ar: ["جديدة", "جديدة"] },
    started: { ru: ["начатое", "начатых", "начатых"], ukr: ["розпочате", "розпочатих", "розпочатих"], en: ["started", "started"], pl: ["rozpoczęte", "rozpoczęte", "rozpoczętych"], lt: ["pradėtas", "pradėti", "pradėtų"], lv: ["iesākts", "iesākti"], ar: ["مبدوءة", "مبدوءة"] },
    phrase: { ru: ["фраза", "фразы", "фраз"], ukr: ["фраза", "фрази", "фраз"], en: ["phrase", "phrases"], pl: ["fraza", "frazy", "fraz"], lt: ["frazė", "frazės", "frazių"], lv: ["frāze", "frāzes"], ar: ["عبارة", "عبارات"] },
    // грамм-чип в составе сессии — это СЧЁТ упражнений: «4 упражнения», «5 упражнений»
    // (мн. число по числу, а не неизменяемое «грамматика»).
    grammar: { ru: ["упражнение", "упражнения", "упражнений"], ukr: ["вправа", "вправи", "вправ"], en: ["exercise", "exercises"], pl: ["ćwiczenie", "ćwiczenia", "ćwiczeń"], lt: ["pratimas", "pratimai", "pratimų"], lv: ["vingrinājums", "vingrinājumi"], ar: ["تمرين", "تمارين"] },
};

// Вернуть правильную форму слова `key` для числа n на языке lang.
export function pl(lang, n, key) {
    const m = FORMS[key];
    const arr = (m && (m[lang] || m.en)) || [];
    return arr[pluralIndex(lang, n)] ?? arr[arr.length - 1] ?? "";
}
