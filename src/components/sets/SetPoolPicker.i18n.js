// Строки экрана добора слов в набор (переиспользует Базу, см. PoolBrowser).
import { langGuard } from "../../interface/i18nGuard.js";

export const P = langGuard({
    ru:  { title: "Слова из базы", hint: "Тап — добавить или убрать из набора. Удержание — карточка слова.", inSetChip: "Набор", onlyNew: "Нет в наборе", onlyIn: "Уже в наборе", done: "Готово", inSet: "в наборе" },
    en:  { title: "Words from the base", hint: "Tap to add or remove from the set. Hold for the word card.", inSetChip: "Set", onlyNew: "Not in set", onlyIn: "Already in set", done: "Done", inSet: "in set" },
    ukr: { title: "Слова з бази", hint: "Тап — додати або прибрати з набору. Утримання — картка слова.", inSetChip: "Набір", onlyNew: "Немає в наборі", onlyIn: "Уже в наборі", done: "Готово", inSet: "у наборі" },
    pl:  { title: "Słowa z bazy", hint: "Dotknij, aby dodać lub usunąć z zestawu. Przytrzymaj — karta słowa.", inSetChip: "Zestaw", onlyNew: "Brak w zestawie", onlyIn: "Już w zestawie", done: "Gotowe", inSet: "w zestawie" },
    lt:  { title: "Žodžiai iš bazės", hint: "Bakstelėk, kad pridėtum ar pašalintum iš rinkinio. Palaikyk — žodžio kortelė.", inSetChip: "Rinkinys", onlyNew: "Nėra rinkinyje", onlyIn: "Jau rinkinyje", done: "Gatava", inSet: "rinkinyje" },
    lv:  { title: "Vārdi no bāzes", hint: "Pieskaries, lai pievienotu vai noņemtu no kopas. Turi — vārda kartīte.", inSetChip: "Kopa", onlyNew: "Nav kopā", onlyIn: "Jau kopā", done: "Gatavs", inSet: "kopā" },
    ar:  { title: "كلمات من القاعدة", hint: "انقر للإضافة أو الإزالة من المجموعة. اضغط مطولًا لبطاقة الكلمة.", inSetChip: "المجموعة", onlyNew: "ليست في المجموعة", onlyIn: "في المجموعة", done: "تم", inSet: "في المجموعة" },
}, "SetPoolPicker.P");
