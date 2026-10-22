// Строки социального слоя: друзья (вкладка панели «Входящие»), мини-профиль, каталог наборов,
// приглашение в онлайн-комнату. Ключи — в паритете по всем языкам (localI18n.test).
import { langGuard } from "../../interface/i18nGuard.js";

// Друзья + поиск людей (вкладка «Друзья» в панели уведомлений).
export const F = langGuard({
    ru: {
        title: "Друзья", find: "Найти друзей", ph: "Имя или логин…", short: "Введите минимум 2 символа",
        empty: "Никого не нашли", none: "Пока нет друзей", noneHint: "Найди знакомых по имени — и соревнуйтесь в рейтинге друзей",
        add: "В друзья", pending: "Заявка отправлена", accept: "Принять", isFriend: "В друзьях", cancel: "Отозвать",
        waiting: "Ждут ответа", today: "сегодня", week: "за неделю", sentToast: "Заявка отправлена", friendsToast: "Теперь вы друзья",
        errDeclined: "Человек недавно отклонил заявку — попробуй позже", errLimit: "Слишком много друзей", errGeneric: "Не получилось",
    },
    en: {
        title: "Friends", find: "Find friends", ph: "Name or login…", short: "Type at least 2 characters",
        empty: "Nobody found", none: "No friends yet", noneHint: "Find people you know by name — and compete on the friends leaderboard",
        add: "Add friend", pending: "Request sent", accept: "Accept", isFriend: "Friends", cancel: "Cancel",
        waiting: "Awaiting reply", today: "today", week: "this week", sentToast: "Request sent", friendsToast: "You're friends now",
        errDeclined: "They recently declined your request — try later", errLimit: "Too many friends", errGeneric: "Something went wrong",
    },
    ukr: {
        title: "Друзі", find: "Знайти друзів", ph: "Ім'я або логін…", short: "Введіть щонайменше 2 символи",
        empty: "Нікого не знайдено", none: "Поки немає друзів", noneHint: "Знайди знайомих за ім'ям — і змагайтеся в рейтингу друзів",
        add: "У друзі", pending: "Заявку надіслано", accept: "Прийняти", isFriend: "У друзях", cancel: "Відкликати",
        waiting: "Чекають відповіді", today: "сьогодні", week: "за тиждень", sentToast: "Заявку надіслано", friendsToast: "Тепер ви друзі",
        errDeclined: "Людина нещодавно відхилила заявку — спробуй пізніше", errLimit: "Забагато друзів", errGeneric: "Не вдалося",
    },
    pl: {
        title: "Znajomi", find: "Znajdź znajomych", ph: "Imię lub login…", short: "Wpisz co najmniej 2 znaki",
        empty: "Nikogo nie znaleziono", none: "Brak znajomych", noneHint: "Znajdź znajomych po imieniu — i rywalizujcie w rankingu znajomych",
        add: "Dodaj", pending: "Zaproszenie wysłane", accept: "Przyjmij", isFriend: "Znajomi", cancel: "Cofnij",
        waiting: "Czekają na odpowiedź", today: "dziś", week: "w tym tygodniu", sentToast: "Zaproszenie wysłane", friendsToast: "Jesteście znajomymi",
        errDeclined: "Ta osoba niedawno odrzuciła zaproszenie — spróbuj później", errLimit: "Zbyt wielu znajomych", errGeneric: "Nie udało się",
    },
    lt: {
        title: "Draugai", find: "Rasti draugų", ph: "Vardas arba prisijungimas…", short: "Įveskite bent 2 simbolius",
        empty: "Nieko nerasta", none: "Kol kas draugų nėra", noneHint: "Rask pažįstamus pagal vardą — ir varžykitės draugų reitinge",
        add: "Į draugus", pending: "Kvietimas išsiųstas", accept: "Priimti", isFriend: "Draugai", cancel: "Atšaukti",
        waiting: "Laukia atsakymo", today: "šiandien", week: "per savaitę", sentToast: "Kvietimas išsiųstas", friendsToast: "Dabar jūs draugai",
        errDeclined: "Žmogus neseniai atmetė kvietimą — pabandyk vėliau", errLimit: "Per daug draugų", errGeneric: "Nepavyko",
    },
    lv: {
        title: "Draugi", find: "Atrast draugus", ph: "Vārds vai lietotājvārds…", short: "Ievadiet vismaz 2 rakstzīmes",
        empty: "Neviens nav atrasts", none: "Pagaidām nav draugu", noneHint: "Atrodi paziņas pēc vārda — un sacentieties draugu reitingā",
        add: "Pievienot", pending: "Uzaicinājums nosūtīts", accept: "Pieņemt", isFriend: "Draugi", cancel: "Atsaukt",
        waiting: "Gaida atbildi", today: "šodien", week: "šonedēļ", sentToast: "Uzaicinājums nosūtīts", friendsToast: "Tagad jūs esat draugi",
        errDeclined: "Cilvēks nesen noraidīja uzaicinājumu — mēģini vēlāk", errLimit: "Pārāk daudz draugu", errGeneric: "Neizdevās",
    },
    ar: {
        title: "الأصدقاء", find: "ابحث عن أصدقاء", ph: "الاسم أو اسم الدخول…", short: "اكتب حرفين على الأقل",
        empty: "لم يُعثر على أحد", none: "لا أصدقاء بعد", noneHint: "ابحث عن معارفك بالاسم — وتنافسوا في لوحة الأصدقاء",
        add: "إضافة صديق", pending: "أُرسل الطلب", accept: "قبول", isFriend: "أصدقاء", cancel: "إلغاء",
        waiting: "بانتظار الرد", today: "اليوم", week: "هذا الأسبوع", sentToast: "أُرسل الطلب", friendsToast: "أصبحتما صديقين",
        errDeclined: "رفض هذا الشخص طلبك مؤخرًا — حاول لاحقًا", errLimit: "أصدقاء كثيرون جدًا", errGeneric: "تعذّر ذلك",
    },
}, "Social.F");

// Мини-профиль человека.
export const P = langGuard({
    ru: {
        anon: "Аноним", level: "Уровень", mastered: "Выучено", streak: "Серия", week: "Очки недели", activity: "Активность",
        hidden: "Человек скрыл свою статистику", sets: "Опубликованные наборы", you: "Это вы", remove: "Убрать из друзей",
        loading: "Загрузка…", notFound: "Профиль не найден",
    },
    en: {
        anon: "Anonymous", level: "Level", mastered: "Mastered", streak: "Streak", week: "Weekly points", activity: "Activity",
        hidden: "This person hides their stats", sets: "Published sets", you: "That's you", remove: "Remove friend",
        loading: "Loading…", notFound: "Profile not found",
    },
    ukr: {
        anon: "Анонім", level: "Рівень", mastered: "Вивчено", streak: "Серія", week: "Очки тижня", activity: "Активність",
        hidden: "Людина приховала свою статистику", sets: "Опубліковані набори", you: "Це ви", remove: "Прибрати з друзів",
        loading: "Завантаження…", notFound: "Профіль не знайдено",
    },
    pl: {
        anon: "Anonim", level: "Poziom", mastered: "Opanowane", streak: "Seria", week: "Punkty tygodnia", activity: "Aktywność",
        hidden: "Ta osoba ukrywa swoje statystyki", sets: "Opublikowane zestawy", you: "To ty", remove: "Usuń ze znajomych",
        loading: "Ładowanie…", notFound: "Nie znaleziono profilu",
    },
    lt: {
        anon: "Anonimas", level: "Lygis", mastered: "Išmokta", streak: "Serija", week: "Savaitės taškai", activity: "Aktyvumas",
        hidden: "Žmogus paslėpė savo statistiką", sets: "Paskelbti rinkiniai", you: "Tai jūs", remove: "Pašalinti iš draugų",
        loading: "Kraunama…", notFound: "Profilis nerastas",
    },
    lv: {
        anon: "Anonīms", level: "Līmenis", mastered: "Iemācīts", streak: "Sērija", week: "Nedēļas punkti", activity: "Aktivitāte",
        hidden: "Cilvēks ir paslēpis savu statistiku", sets: "Publicētās kopas", you: "Tas esat jūs", remove: "Noņemt no draugiem",
        loading: "Ielāde…", notFound: "Profils nav atrasts",
    },
    ar: {
        anon: "مجهول", level: "المستوى", mastered: "مُتقَن", streak: "السلسلة", week: "نقاط الأسبوع", activity: "النشاط",
        hidden: "أخفى هذا الشخص إحصاءاته", sets: "المجموعات المنشورة", you: "هذا أنت", remove: "إزالة من الأصدقاء",
        loading: "جارٍ التحميل…", notFound: "لم يُعثر على الملف",
    },
}, "Social.P");

// Каталог наборов сообщества + публикация своего набора.
export const C = langGuard({
    ru: {
        title: "Каталог наборов", ph: "Название или автор…", popular: "Популярные", fresh: "Новые",
        empty: "Ничего не нашли", emptyAll: "Каталог пока пуст. Опубликуй свой набор — он появится здесь",
        took: "взяли: {n}", tookLabel: "взяли", take: "Взять себе", taken: "Уже взят", mine: "Ваш набор", takenToast: "Набор «{set}» добавлен",
        back: "Назад", more: "Показать ещё", publish: "Опубликовать", unpublish: "Снять с публикации",
        published: "В каталоге · взяли: {n}", publishedToast: "Набор опубликован в каталоге", unpublishedToast: "Набор снят с публикации",
        tooFew: "Для публикации нужно минимум {n} слов из общей базы", adminHide: "Снять (модерация)", errGeneric: "Не получилось",
    },
    en: {
        title: "Set catalog", ph: "Name or author…", popular: "Popular", fresh: "New",
        empty: "Nothing found", emptyAll: "The catalog is empty for now. Publish your set — it'll show up here",
        took: "taken: {n}", tookLabel: "taken", take: "Take a copy", taken: "Already taken", mine: "Your set", takenToast: "Set “{set}” added",
        back: "Back", more: "Show more", publish: "Publish", unpublish: "Unpublish",
        published: "In catalog · taken: {n}", publishedToast: "Set published to the catalog", unpublishedToast: "Set unpublished",
        tooFew: "Publishing needs at least {n} words from the shared base", adminHide: "Hide (moderation)", errGeneric: "Something went wrong",
    },
    ukr: {
        title: "Каталог наборів", ph: "Назва або автор…", popular: "Популярні", fresh: "Нові",
        empty: "Нічого не знайдено", emptyAll: "Каталог поки порожній. Опублікуй свій набір — він з'явиться тут",
        took: "взяли: {n}", tookLabel: "взяли", take: "Взяти собі", taken: "Вже взято", mine: "Ваш набір", takenToast: "Набір «{set}» додано",
        back: "Назад", more: "Показати ще", publish: "Опублікувати", unpublish: "Зняти з публікації",
        published: "У каталозі · взяли: {n}", publishedToast: "Набір опубліковано в каталозі", unpublishedToast: "Набір знято з публікації",
        tooFew: "Для публікації потрібно щонайменше {n} слів зі спільної бази", adminHide: "Зняти (модерація)", errGeneric: "Не вдалося",
    },
    pl: {
        title: "Katalog zestawów", ph: "Nazwa lub autor…", popular: "Popularne", fresh: "Nowe",
        empty: "Nic nie znaleziono", emptyAll: "Katalog jest na razie pusty. Opublikuj swój zestaw — pojawi się tutaj",
        took: "wzięto: {n}", tookLabel: "wzięto", take: "Weź kopię", taken: "Już wzięty", mine: "Twój zestaw", takenToast: "Zestaw „{set}” dodany",
        back: "Wstecz", more: "Pokaż więcej", publish: "Opublikuj", unpublish: "Cofnij publikację",
        published: "W katalogu · wzięto: {n}", publishedToast: "Zestaw opublikowany w katalogu", unpublishedToast: "Publikacja cofnięta",
        tooFew: "Do publikacji potrzeba co najmniej {n} słów ze wspólnej bazy", adminHide: "Ukryj (moderacja)", errGeneric: "Nie udało się",
    },
    lt: {
        title: "Rinkinių katalogas", ph: "Pavadinimas arba autorius…", popular: "Populiarūs", fresh: "Nauji",
        empty: "Nieko nerasta", emptyAll: "Katalogas kol kas tuščias. Paskelbk savo rinkinį — jis atsiras čia",
        took: "paėmė: {n}", tookLabel: "paėmė", take: "Pasiimti kopiją", taken: "Jau paimtas", mine: "Jūsų rinkinys", takenToast: "Rinkinys „{set}“ pridėtas",
        back: "Atgal", more: "Rodyti daugiau", publish: "Paskelbti", unpublish: "Atšaukti paskelbimą",
        published: "Kataloge · paėmė: {n}", publishedToast: "Rinkinys paskelbtas kataloge", unpublishedToast: "Paskelbimas atšauktas",
        tooFew: "Paskelbti reikia bent {n} žodžių iš bendros bazės", adminHide: "Paslėpti (moderavimas)", errGeneric: "Nepavyko",
    },
    lv: {
        title: "Kopu katalogs", ph: "Nosaukums vai autors…", popular: "Populārās", fresh: "Jaunās",
        empty: "Nekas nav atrasts", emptyAll: "Katalogs pagaidām ir tukšs. Publicē savu kopu — tā parādīsies šeit",
        took: "paņēma: {n}", tookLabel: "paņēma", take: "Paņemt kopiju", taken: "Jau paņemta", mine: "Jūsu kopa", takenToast: "Kopa «{set}» pievienota",
        back: "Atpakaļ", more: "Rādīt vairāk", publish: "Publicēt", unpublish: "Atsaukt publicēšanu",
        published: "Katalogā · paņēma: {n}", publishedToast: "Kopa publicēta katalogā", unpublishedToast: "Publicēšana atsaukta",
        tooFew: "Publicēšanai vajag vismaz {n} vārdus no kopējās bāzes", adminHide: "Paslēpt (moderācija)", errGeneric: "Neizdevās",
    },
    ar: {
        title: "كتالوج المجموعات", ph: "الاسم أو المؤلف…", popular: "الأكثر شيوعًا", fresh: "الأحدث",
        empty: "لم يُعثر على شيء", emptyAll: "الكتالوج فارغ حاليًا. انشر مجموعتك — وستظهر هنا",
        took: "أخذها: {n}", tookLabel: "أخذها", take: "خذ نسخة", taken: "مأخوذة مسبقًا", mine: "مجموعتك", takenToast: "تمت إضافة المجموعة «{set}»",
        back: "رجوع", more: "عرض المزيد", publish: "نشر", unpublish: "إلغاء النشر",
        published: "في الكتالوج · أخذها: {n}", publishedToast: "نُشرت المجموعة في الكتالوج", unpublishedToast: "أُلغي نشر المجموعة",
        tooFew: "يتطلب النشر {n} كلمات على الأقل من القاعدة المشتركة", adminHide: "إخفاء (إشراف)", errGeneric: "تعذّر ذلك",
    },
}, "Social.C");

// Приглашение в онлайн-комнату.
export const I = langGuard({
    ru: {
        btn: "Позвать", title: "Позвать в комнату", friends: "Друзья", search: "Найти человека", invite: "Позвать", invited: "Позвали",
        noFriends: "Друзей пока нет — найди человека поиском", errFull: "Комната заполнена", errInGame: "Игра уже идёт",
        errAlready: "Уже в комнате", errGeneric: "Не удалось позвать",
    },
    en: {
        btn: "Invite", title: "Invite to the room", friends: "Friends", search: "Find a person", invite: "Invite", invited: "Invited",
        noFriends: "No friends yet — find a person by search", errFull: "The room is full", errInGame: "The game has started",
        errAlready: "Already in the room", errGeneric: "Couldn't invite",
    },
    ukr: {
        btn: "Покликати", title: "Покликати в кімнату", friends: "Друзі", search: "Знайти людину", invite: "Покликати", invited: "Покликали",
        noFriends: "Друзів поки немає — знайди людину пошуком", errFull: "Кімната заповнена", errInGame: "Гра вже йде",
        errAlready: "Вже в кімнаті", errGeneric: "Не вдалося покликати",
    },
    pl: {
        btn: "Zaproś", title: "Zaproś do pokoju", friends: "Znajomi", search: "Znajdź osobę", invite: "Zaproś", invited: "Zaproszono",
        noFriends: "Brak znajomych — znajdź osobę wyszukiwaniem", errFull: "Pokój jest pełny", errInGame: "Gra już trwa",
        errAlready: "Już w pokoju", errGeneric: "Nie udało się zaprosić",
    },
    lt: {
        btn: "Pakviesti", title: "Pakviesti į kambarį", friends: "Draugai", search: "Rasti žmogų", invite: "Pakviesti", invited: "Pakviesta",
        noFriends: "Draugų kol kas nėra — rask žmogų paieška", errFull: "Kambarys pilnas", errInGame: "Žaidimas jau vyksta",
        errAlready: "Jau kambaryje", errGeneric: "Nepavyko pakviesti",
    },
    lv: {
        btn: "Uzaicināt", title: "Uzaicināt uz istabu", friends: "Draugi", search: "Atrast cilvēku", invite: "Uzaicināt", invited: "Uzaicināts",
        noFriends: "Draugu pagaidām nav — atrodi cilvēku meklēšanā", errFull: "Istaba ir pilna", errInGame: "Spēle jau notiek",
        errAlready: "Jau istabā", errGeneric: "Neizdevās uzaicināt",
    },
    ar: {
        btn: "دعوة", title: "دعوة إلى الغرفة", friends: "الأصدقاء", search: "ابحث عن شخص", invite: "دعوة", invited: "تمت الدعوة",
        noFriends: "لا أصدقاء بعد — ابحث عن شخص", errFull: "الغرفة ممتلئة", errInGame: "بدأت اللعبة",
        errAlready: "موجود في الغرفة", errGeneric: "تعذّرت الدعوة",
    },
}, "Social.I");
