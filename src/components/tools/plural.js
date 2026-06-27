// Правильная форма слова «слово» для счётчика на всех языках интерфейса.
const wordsNoun = (n, lang) => {
    const a = Math.abs(n) % 100, b = a % 10;
    switch (lang) {
        case "ru":  return (b === 1 && a !== 11) ? "слово" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "слова" : "слов";
        case "ukr": return (b === 1 && a !== 11) ? "слово" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "слова" : "слів";
        case "pl":  return (b === 1 && a !== 11) ? "słowo" : (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) ? "słowa" : "słów";
        case "lt":  return (b === 1 && a !== 11) ? "žodis" : (b >= 2 && b <= 9 && !(a >= 11 && a <= 19)) ? "žodžiai" : "žodžių";
        case "lv":  return (b === 1 && a !== 11) ? "vārds" : "vārdi";
        case "ar":  return a === 1 ? "كلمة" : a === 2 ? "كلمتان" : (a >= 3 && a <= 10) ? "كلمات" : "كلمة";
        default:    return n === 1 ? "word" : "words";
    }
};

// «N слов / 1 слово / 3 слова»
export const wordCount = (n, lang) => `${n} ${wordsNoun(n, lang)}`;

export default wordCount;
