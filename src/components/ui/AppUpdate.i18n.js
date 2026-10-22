// Строки модалки «Новая версия приложения» (самообновление APK, см. ApkUpdateModal).
import { langGuard } from "../../interface/i18nGuard.js";

export const U = langGuard({
    ru: {
        title: "Новая версия приложения", body: "Доступна версия {v}. Обновление скачается, и откроется установщик Android.",
        update: "Обновить", later: "Позже", downloading: "Скачиваю… {p}%", installing: "Подтверди установку в окне Android",
        perm: "Разреши приложению устанавливать обновления: в настройках включи «Разрешить из этого источника», вернись и нажми «Обновить».",
        openSettings: "Открыть настройки", error: "Не удалось скачать обновление. Проверь интернет и попробуй ещё раз.", retry: "Повторить",
    },
    en: {
        title: "New app version", body: "Version {v} is available. The update will download and the Android installer will open.",
        update: "Update", later: "Later", downloading: "Downloading… {p}%", installing: "Confirm the installation in the Android dialog",
        perm: "Allow the app to install updates: turn on “Allow from this source” in settings, come back and tap “Update”.",
        openSettings: "Open settings", error: "Couldn't download the update. Check your connection and try again.", retry: "Retry",
    },
    ukr: {
        title: "Нова версія застосунку", body: "Доступна версія {v}. Оновлення завантажиться, і відкриється інсталятор Android.",
        update: "Оновити", later: "Пізніше", downloading: "Завантажую… {p}%", installing: "Підтвердь встановлення у вікні Android",
        perm: "Дозволь застосунку встановлювати оновлення: у налаштуваннях увімкни «Дозволити з цього джерела», повернися й натисни «Оновити».",
        openSettings: "Відкрити налаштування", error: "Не вдалося завантажити оновлення. Перевір інтернет і спробуй ще раз.", retry: "Повторити",
    },
    pl: {
        title: "Nowa wersja aplikacji", body: "Dostępna jest wersja {v}. Aktualizacja zostanie pobrana i otworzy się instalator Androida.",
        update: "Aktualizuj", later: "Później", downloading: "Pobieranie… {p}%", installing: "Potwierdź instalację w oknie Androida",
        perm: "Pozwól aplikacji instalować aktualizacje: w ustawieniach włącz „Zezwalaj z tego źródła”, wróć i stuknij „Aktualizuj”.",
        openSettings: "Otwórz ustawienia", error: "Nie udało się pobrać aktualizacji. Sprawdź internet i spróbuj ponownie.", retry: "Ponów",
    },
    lt: {
        title: "Nauja programėlės versija", body: "Yra versija {v}. Atnaujinimas bus atsiųstas ir atsidarys Android diegimo programa.",
        update: "Atnaujinti", later: "Vėliau", downloading: "Atsisiunčiama… {p}%", installing: "Patvirtink diegimą Android lange",
        perm: "Leisk programėlei diegti atnaujinimus: nustatymuose įjunk „Leisti iš šio šaltinio“, grįžk ir paspausk „Atnaujinti“.",
        openSettings: "Atidaryti nustatymus", error: "Nepavyko atsisiųsti atnaujinimo. Patikrink internetą ir bandyk dar kartą.", retry: "Kartoti",
    },
    lv: {
        title: "Jauna lietotnes versija", body: "Pieejama versija {v}. Atjauninājums tiks lejupielādēts, un atvērsies Android instalētājs.",
        update: "Atjaunināt", later: "Vēlāk", downloading: "Lejupielādē… {p}%", installing: "Apstiprini instalēšanu Android logā",
        perm: "Atļauj lietotnei instalēt atjauninājumus: iestatījumos ieslēdz «Atļaut no šī avota», atgriezies un pieskaries «Atjaunināt».",
        openSettings: "Atvērt iestatījumus", error: "Neizdevās lejupielādēt atjauninājumu. Pārbaudi internetu un mēģini vēlreiz.", retry: "Mēģināt vēlreiz",
    },
    ar: {
        title: "إصدار جديد من التطبيق", body: "الإصدار {v} متاح. سيُنزَّل التحديث ثم يفتح مُثبّت أندرويد.",
        update: "تحديث", later: "لاحقًا", downloading: "جارٍ التنزيل… {p}%", installing: "أكّد التثبيت في نافذة أندرويد",
        perm: "اسمح للتطبيق بتثبيت التحديثات: فعّل «السماح من هذا المصدر» في الإعدادات، ثم عُد واضغط «تحديث».",
        openSettings: "فتح الإعدادات", error: "تعذّر تنزيل التحديث. تحقّق من الاتصال وحاول مجددًا.", retry: "إعادة المحاولة",
    },
}, "AppUpdate.U");
