// Реестр интерфейсных переводов, собранный из по-языковых файлов translations/<lang>.js.
// Внешний API неизменён: `import { interfaceTranslate }`. Порядок языков сохранён
// (ru — референс паритета). Полноту/паритет ключей проверяет i18n.test.js + dev-страж.
import { checkInterfaceTranslate } from "./i18nGuard.js";
import { ru } from "./translations/ru.js";
import { en } from "./translations/en.js";
import { ukr } from "./translations/ukr.js";
import { pl } from "./translations/pl.js";
import { lt } from "./translations/lt.js";
import { lv } from "./translations/lv.js";
import { ar } from "./translations/ar.js";

export const interfaceTranslate = { ru, en, ukr, pl, lt, lv, ar };

checkInterfaceTranslate(interfaceTranslate);
