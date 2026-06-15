// Правильная форма слова «слово» для счётчика на всех языках интерфейса.
export const wordsNoun = (n, lang) => {
    const a = Math.abs(n) % 100, b = a % 10;
    switch (lang) {
        case "ru":  return (b === 1 && a !== 11) ? "слово" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "слова" : "слов";
        case "ukr": return (b === 1 && a !== 11) ? "слово" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "слова" : "слів";
        case "pl":  return (b === 1 && a !== 11) ? "słowo" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "słowa" : "słów";
        case "lt":  return (b === 1 && a !== 11) ? "žodis" : (b >= 2 && b <= 9 && !(a >= 11 && a <= 19)) ? "žodžiai" : "žodžių";
        default:    return n === 1 ? "word" : "words";
    }
};

// «N слов / 1 слово / 3 слова»
export const wordCount = (n, lang) => `${n} ${wordsNoun(n, lang)}`;

// Форма слова «словарь» для счётчика.
export const dictsNoun = (n, lang) => {
    const a = Math.abs(n) % 100, b = a % 10;
    switch (lang) {
        case "ru":  return (b === 1 && a !== 11) ? "словарь" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "словаря" : "словарей";
        case "ukr": return (b === 1 && a !== 11) ? "словник" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "словники" : "словників";
        case "pl":  return (b === 1 && a !== 11) ? "słownik" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "słowniki" : "słowników";
        case "lt":  return (b === 1 && a !== 11) ? "žodynas" : (b >= 2 && b <= 9 && !(a >= 11 && a <= 19)) ? "žodynai" : "žodynų";
        default:    return n === 1 ? "dictionary" : "dictionaries";
    }
};
export const dictCount = (n, lang) => `${n} ${dictsNoun(n, lang)}`;

export default wordCount;
