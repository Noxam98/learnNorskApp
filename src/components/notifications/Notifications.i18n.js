// Строки центра уведомлений (колокольчик в шапке): лента всех типов + предложения набора.
import { langGuard } from "../../interface/i18nGuard.js";

export const N = langGuard({
    ru: {
        title: "Уведомления", empty: "Пока пусто", emptyHint: "Здесь будут заявки в друзья, приглашения в игру и наборы",
        shareTitle: "{who} предлагает набор", shareSub: "«{set}» · {n}",
        accept: "Принять", decline: "Отклонить", accepted: "Принято", declined: "Отклонено",
        acceptedToast: "Набор «{set}» добавлен", close: "Закрыть", bell: "Уведомления", bellTab: "Входящие",
        tabFeed: "Лента", tabFriends: "Друзья", friendReq: "{who} хочет добавить вас в друзья", friendAcc: "{who} теперь ваш друг",
        roomTitle: "{who} зовёт в игру", roomSub: "Комната «{room}»", join: "Войти", roomGone: "Комната уже закрыта",
        cloned: "{who} взял(а) ваш набор «{set}»", someone: "Кто-то", cancelled: "Отозвано",
    },
    en: {
        title: "Notifications", empty: "Nothing yet", emptyHint: "Friend requests, game invites and sets will show up here",
        shareTitle: "{who} shares a set", shareSub: "“{set}” · {n}",
        accept: "Accept", decline: "Decline", accepted: "Accepted", declined: "Declined",
        acceptedToast: "Set “{set}” added", close: "Close", bell: "Notifications", bellTab: "Inbox",
        tabFeed: "Feed", tabFriends: "Friends", friendReq: "{who} wants to be your friend", friendAcc: "{who} is now your friend",
        roomTitle: "{who} invites you to play", roomSub: "Room “{room}”", join: "Join", roomGone: "The room is closed",
        cloned: "{who} took your set “{set}”", someone: "Someone", cancelled: "Cancelled",
    },
    ukr: {
        title: "Сповіщення", empty: "Поки порожньо", emptyHint: "Тут будуть заявки в друзі, запрошення в гру та набори",
        shareTitle: "{who} пропонує набір", shareSub: "«{set}» · {n}",
        accept: "Прийняти", decline: "Відхилити", accepted: "Прийнято", declined: "Відхилено",
        acceptedToast: "Набір «{set}» додано", close: "Закрити", bell: "Сповіщення", bellTab: "Вхідні",
        tabFeed: "Стрічка", tabFriends: "Друзі", friendReq: "{who} хоче додати вас у друзі", friendAcc: "{who} тепер ваш друг",
        roomTitle: "{who} кличе в гру", roomSub: "Кімната «{room}»", join: "Увійти", roomGone: "Кімнату вже закрито",
        cloned: "{who} взяв(ла) ваш набір «{set}»", someone: "Хтось", cancelled: "Відкликано",
    },
    pl: {
        title: "Powiadomienia", empty: "Na razie pusto", emptyHint: "Tu pojawią się zaproszenia do znajomych, do gry i zestawy",
        shareTitle: "{who} udostępnia zestaw", shareSub: "„{set}” · {n}",
        accept: "Przyjmij", decline: "Odrzuć", accepted: "Przyjęto", declined: "Odrzucono",
        acceptedToast: "Zestaw „{set}” dodany", close: "Zamknij", bell: "Powiadomienia", bellTab: "Skrzynka",
        tabFeed: "Aktualności", tabFriends: "Znajomi", friendReq: "{who} chce dodać cię do znajomych", friendAcc: "{who} jest teraz twoim znajomym",
        roomTitle: "{who} zaprasza do gry", roomSub: "Pokój „{room}”", join: "Wejdź", roomGone: "Pokój jest już zamknięty",
        cloned: "{who} wziął(ęła) twój zestaw „{set}”", someone: "Ktoś", cancelled: "Cofnięto",
    },
    lt: {
        title: "Pranešimai", empty: "Kol kas tuščia", emptyHint: "Čia bus kvietimai į draugus, į žaidimą ir rinkiniai",
        shareTitle: "{who} siūlo rinkinį", shareSub: "„{set}“ · {n}",
        accept: "Priimti", decline: "Atmesti", accepted: "Priimta", declined: "Atmesta",
        acceptedToast: "Rinkinys „{set}“ pridėtas", close: "Uždaryti", bell: "Pranešimai", bellTab: "Gauta",
        tabFeed: "Srautas", tabFriends: "Draugai", friendReq: "{who} nori tapti jūsų draugu", friendAcc: "{who} dabar jūsų draugas",
        roomTitle: "{who} kviečia žaisti", roomSub: "Kambarys „{room}“", join: "Prisijungti", roomGone: "Kambarys jau uždarytas",
        cloned: "{who} pasiėmė jūsų rinkinį „{set}“", someone: "Kažkas", cancelled: "Atšaukta",
    },
    lv: {
        title: "Paziņojumi", empty: "Pagaidām tukšs", emptyHint: "Šeit būs draudzības uzaicinājumi, spēļu ielūgumi un kopas",
        shareTitle: "{who} piedāvā kopu", shareSub: "«{set}» · {n}",
        accept: "Pieņemt", decline: "Noraidīt", accepted: "Pieņemts", declined: "Noraidīts",
        acceptedToast: "Kopa «{set}» pievienota", close: "Aizvērt", bell: "Paziņojumi", bellTab: "Ienākošie",
        tabFeed: "Plūsma", tabFriends: "Draugi", friendReq: "{who} vēlas kļūt par jūsu draugu", friendAcc: "{who} tagad ir jūsu draugs",
        roomTitle: "{who} aicina spēlēt", roomSub: "Istaba «{room}»", join: "Pievienoties", roomGone: "Istaba jau ir slēgta",
        cloned: "{who} paņēma jūsu kopu «{set}»", someone: "Kāds", cancelled: "Atsaukts",
    },
    ar: {
        title: "الإشعارات", empty: "لا شيء بعد", emptyHint: "ستظهر هنا طلبات الصداقة ودعوات اللعب والمجموعات",
        shareTitle: "{who} يشارك مجموعة", shareSub: "«{set}» · {n}",
        accept: "قبول", decline: "رفض", accepted: "مقبول", declined: "مرفوض",
        acceptedToast: "تمت إضافة المجموعة «{set}»", close: "إغلاق", bell: "الإشعارات", bellTab: "الوارد",
        tabFeed: "الموجز", tabFriends: "الأصدقاء", friendReq: "{who} يريد إضافتك صديقًا", friendAcc: "{who} أصبح صديقك",
        roomTitle: "{who} يدعوك للعب", roomSub: "الغرفة «{room}»", join: "انضمام", roomGone: "أُغلقت الغرفة",
        cloned: "{who} أخذ مجموعتك «{set}»", someone: "شخص ما", cancelled: "أُلغي",
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
