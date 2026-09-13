// Строки центра уведомлений (колокольчик в шапке) и предложений набора.
import { langGuard } from "../../interface/i18nGuard.js";

export const N = langGuard({
    ru: {
        title: "Уведомления", empty: "Пока пусто", emptyHint: "Здесь будут предложения наборов и другие события",
        shareTitle: "{who} предлагает набор", shareSub: "«{set}» · {n}",
        accept: "Принять", decline: "Отклонить", accepted: "Принято", declined: "Отклонено",
        acceptedToast: "Набор «{set}» добавлен", close: "Закрыть", bell: "Уведомления",
    },
    en: {
        title: "Notifications", empty: "Nothing yet", emptyHint: "Set offers and other events will show up here",
        shareTitle: "{who} shares a set", shareSub: "“{set}” · {n}",
        accept: "Accept", decline: "Decline", accepted: "Accepted", declined: "Declined",
        acceptedToast: "Set “{set}” added", close: "Close", bell: "Notifications",
    },
    ukr: {
        title: "Сповіщення", empty: "Поки порожньо", emptyHint: "Тут будуть пропозиції наборів та інші події",
        shareTitle: "{who} пропонує набір", shareSub: "«{set}» · {n}",
        accept: "Прийняти", decline: "Відхилити", accepted: "Прийнято", declined: "Відхилено",
        acceptedToast: "Набір «{set}» додано", close: "Закрити", bell: "Сповіщення",
    },
    pl: {
        title: "Powiadomienia", empty: "Na razie pusto", emptyHint: "Tu pojawią się propozycje zestawów i inne zdarzenia",
        shareTitle: "{who} udostępnia zestaw", shareSub: "„{set}” · {n}",
        accept: "Przyjmij", decline: "Odrzuć", accepted: "Przyjęto", declined: "Odrzucono",
        acceptedToast: "Zestaw „{set}” dodany", close: "Zamknij", bell: "Powiadomienia",
    },
    lt: {
        title: "Pranešimai", empty: "Kol kas tuščia", emptyHint: "Čia bus rinkinių pasiūlymai ir kiti įvykiai",
        shareTitle: "{who} siūlo rinkinį", shareSub: "„{set}“ · {n}",
        accept: "Priimti", decline: "Atmesti", accepted: "Priimta", declined: "Atmesta",
        acceptedToast: "Rinkinys „{set}“ pridėtas", close: "Uždaryti", bell: "Pranešimai",
    },
    lv: {
        title: "Paziņojumi", empty: "Pagaidām tukšs", emptyHint: "Šeit būs kopu piedāvājumi un citi notikumi",
        shareTitle: "{who} piedāvā kopu", shareSub: "«{set}» · {n}",
        accept: "Pieņemt", decline: "Noraidīt", accepted: "Pieņemts", declined: "Noraidīts",
        acceptedToast: "Kopa «{set}» pievienota", close: "Aizvērt", bell: "Paziņojumi",
    },
    ar: {
        title: "الإشعارات", empty: "لا شيء بعد", emptyHint: "ستظهر هنا عروض المجموعات وأحداث أخرى",
        shareTitle: "{who} يشارك مجموعة", shareSub: "«{set}» · {n}",
        accept: "قبول", decline: "رفض", accepted: "مقبول", declined: "مرفوض",
        acceptedToast: "تمت إضافة المجموعة «{set}»", close: "إغلاق", bell: "الإشعارات",
    },
}, "Notifications.N");

// Строки модалки «Поделиться набором» (поиск человека + отправка).
export const S = langGuard({
    ru: {
        title: "Поделиться набором", ph: "Имя или логин…", hint: "Получатель увидит предложение и создаст свою копию набора",
        short: "Введите минимум 2 символа", empty: "Никого не нашли", send: "Отправить", sending: "Отправляю…",
        sent: "Отправлено", errSelf: "Это вы", errEmpty: "В наборе нет слов", errMany: "Слишком много предложений этому человеку",
        errGeneric: "Не удалось отправить", cancel: "Отмена",
    },
    en: {
        title: "Share the set", ph: "Name or login…", hint: "They'll get an offer and make their own copy of the set",
        short: "Type at least 2 characters", empty: "Nobody found", send: "Send", sending: "Sending…",
        sent: "Sent", errSelf: "That's you", errEmpty: "The set has no words", errMany: "Too many offers to this person",
        errGeneric: "Couldn't send", cancel: "Cancel",
    },
    ukr: {
        title: "Поділитися набором", ph: "Ім'я або логін…", hint: "Отримувач побачить пропозицію та створить власну копію набору",
        short: "Введіть щонайменше 2 символи", empty: "Нікого не знайдено", send: "Надіслати", sending: "Надсилаю…",
        sent: "Надіслано", errSelf: "Це ви", errEmpty: "У наборі немає слів", errMany: "Забагато пропозицій цій людині",
        errGeneric: "Не вдалося надіслати", cancel: "Скасувати",
    },
    pl: {
        title: "Udostępnij zestaw", ph: "Imię lub login…", hint: "Odbiorca zobaczy propozycję i utworzy własną kopię zestawu",
        short: "Wpisz co najmniej 2 znaki", empty: "Nikogo nie znaleziono", send: "Wyślij", sending: "Wysyłam…",
        sent: "Wysłano", errSelf: "To ty", errEmpty: "Zestaw nie ma słów", errMany: "Zbyt wiele propozycji dla tej osoby",
        errGeneric: "Nie udało się wysłać", cancel: "Anuluj",
    },
    lt: {
        title: "Dalintis rinkiniu", ph: "Vardas arba prisijungimas…", hint: "Gavėjas matys pasiūlymą ir susikurs savo rinkinio kopiją",
        short: "Įveskite bent 2 simbolius", empty: "Nieko nerasta", send: "Siųsti", sending: "Siunčiu…",
        sent: "Išsiųsta", errSelf: "Tai jūs", errEmpty: "Rinkinyje nėra žodžių", errMany: "Per daug pasiūlymų šiam žmogui",
        errGeneric: "Nepavyko išsiųsti", cancel: "Atšaukti",
    },
    lv: {
        title: "Dalīties ar kopu", ph: "Vārds vai lietotājvārds…", hint: "Saņēmējs redzēs piedāvājumu un izveidos savu kopijas kopu",
        short: "Ievadiet vismaz 2 rakstzīmes", empty: "Neviens nav atrasts", send: "Nosūtīt", sending: "Sūtu…",
        sent: "Nosūtīts", errSelf: "Tas esat jūs", errEmpty: "Kopā nav vārdu", errMany: "Pārāk daudz piedāvājumu šai personai",
        errGeneric: "Neizdevās nosūtīt", cancel: "Atcelt",
    },
    ar: {
        title: "مشاركة المجموعة", ph: "الاسم أو اسم الدخول…", hint: "سيرى المستلم العرض وينشئ نسخته الخاصة من المجموعة",
        short: "اكتب حرفين على الأقل", empty: "لم يُعثر على أحد", send: "إرسال", sending: "جارٍ الإرسال…",
        sent: "أُرسل", errSelf: "هذا أنت", errEmpty: "المجموعة بلا كلمات", errMany: "عروض كثيرة جدًا لهذا الشخص",
        errGeneric: "تعذّر الإرسال", cancel: "إلغاء",
    },
}, "Notifications.S");
