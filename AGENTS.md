# AGENTS.md

Инструкции для ИИ-агентов и разработчиков по этому репозиторию (фронтенд **Lære Norsk**).
React 18 + Vite SPA, состояние на Zustand, запросы через `ky` к FastAPI-бэкенду на Fly.io.
Обзор и запуск — в [README.md](README.md). Бэкенд — отдельный репозиторий `laereNorskBackand`.

---

## Команды

```bash
npm run dev        # дев-сервер (Vite, --host); ходит на ПРОД-бэкенд (см. .env.development)
npm run typecheck  # типы через JSDoc + tsc (jsconfig.json) — держать 0 ошибок
npm run lint       # ESLint (ошибки блокируют; порог предупреждений --max-warnings 50)
npm test           # vitest (юнит/контроллеры/render/i18n/smoke)
npm run build      # прод-сборка; не должна падать
```

**Перед коммитом гонять все четыре** (`typecheck && lint && test && build`). Те же гейты
крутит CI (GitHub Actions, `.github/workflows/ci.yml`) на каждый push в `master` и каждый PR —
красный CI = чинить.

---

## Архитектура (главное)

После большого рефактора структура единообразна. **Держать тот же паттерн.**

### Контроллер-хуки: логика отдельно от рендера
Тяжёлая вьюха = **тонкий компонент-рендер + хук `use<Name>`** со всем состоянием, эффектами,
api-вызовами и экшенами. Хук возвращает данные + действия; компонент только рисует.

| Вьюха | Контроллер |
|---|---|
| `pages/PoolPage.jsx` | `pages/usePoolSearch.js` |
| `pages/OnlinePage.jsx` | `pages/useOnlineGame.js` (WebSocket-протокол) |
| `pages/learning/TodayTab.jsx` | `pages/learning/useToday.js` |
| `pages/learning/ExamTab.jsx` | `pages/learning/useExam.js` (+ `ExamRun.jsx`) |
| `components/learning/LearningSession.jsx` | `components/learning/useLearningSession.js` |
| `components/learning/PlacementScreen.jsx` | `components/learning/usePlacement.js` |
| `pages/learning/SetsTab.jsx` | `pages/learning/useMobileSetsLayout.js` (хрупкая DOM-раскладка) |

Контроллер живёт **рядом со своим компонентом**. Переиспользуемые между вьюхами хуки —
в `src/hooks/` (`useAuth`, `useMediaQuery`, `useAutoHideNav`, `useHistoryClose`, `useVersionCheck`).

### Самодостаточные feature-модалки
Под-фича со своим UI-состоянием = отдельный компонент. Наружу — `open` + `onClose`/колбэк
(`onSaved`/`onImported`/…), состояние формы/busy держит сам:
- `components/sets/{GenerateSetModal,PhotoImportModal}.jsx`
- `components/ui/{AskWordModal,FixDescriptionModal,EditWordModal,WordDiff}.jsx`
- `components/profile/{NameEditModal,PasswordModal}.jsx`, `components/online/RoomForm.jsx`

View-завязанные правки (мутируют общий объект) — через колбэки наружу, родитель применяет.

### Состояние — Zustand-сторы (`src/store/`)
- `wordStore.jsx` — словари/пул; данные **серверные**, локально только текущая сессия (без persist).
  Мутации через методы стора → дёргают API → `loadData(true)` для тихого обновления.
- `systemStore.jsx` — язык интерфейса, тема, звук, авто-скрытие панелей и пр. настройки.
- `AuthStore.jsx` — пользователь, вход/выход, `gamePrefs`/`focusTopics`.
- `sessionStore.jsx` — префетч/состав следующей учебной сессии.
- Селекторы: `useWordsStore((s) => s.x)`. Вне React — `useStore.getState()`.

### API — единый класс `ApiService` (`components/tools/api.js`)
Все запросы тут (`ky`): авто-refresh JWT, токены шифруются (`crypto-js`). **Новый эндпоинт —
методом сюда**, не вызывай `ky`/`fetch` из компонентов/хуков.

### Бэкенд — отдельный репозиторий
`laereNorskBackand` (FastAPI, Fly.io, app `learn-norsk-backend`). Нужно новое поведение
сервера/эндпоинт — менять там. Деплой: `flyctl deploy --remote-only` + push github.

---

## Карта `src/`

```
pages/                 # роут-страницы (+ co-located use*.js контроллеры)
  learning/            # вкладки раздела «Учёба» (Today/Words/Sets/Progress/Exam) + их хуки
components/
  ui/                  # дизайн-система: Modal, Icon, WordCard, Spinner, Dropdown, …
  learning/            # компоненты учёбы (LearningSession, Leaderboard, StatusBits, …)
  gameComponents/      # игровые экраны (Choice/Build/Input/Study/Cloze) + useGameLoop
  online/              # мультиплеер (RaceScreen, RoomForm, Countdown, …)
  sets/ profile/       # модалки «Наборов» / профиля
  tools/               # НЕ-хуковые утилиты/клиенты: api, sound, raceAudio, push, plural, …
hooks/                 # переиспользуемые хуки
store/                 # Zustand-сторы
interface/             # i18n: i18nGuard, languages, *.test.js
  translations/        # центральный реестр по файлам языков: ru/en/ukr/pl/lt/lv/ar.js
styles/                # CSS (app/screens/components) + спрайт иконок
types.js               # JSDoc @typedef основных структур
```

---

## Конвенции

- **Язык**: комментарии и UI-тексты — **на русском** (как в коде). Комментируй «зачем», не «что».
- **Стиль**: функциональные компоненты + хуки, без классов. **Отступ 4 пробела.** Повторяй
  окружающий код (именование, плотность комментариев, идиомы).
- **Типы**: JSDoc + `tsc` (не полный TS). Типы структур — в `src/types.js`; включается пофайлово
  через `// @ts-check`. `npm run typecheck` = 0 ошибок (memory `type-checking-jsdoc-setup`).
- **i18n — обязательно для любой новой строки.** Семь языков: **ru, en, ukr, pl, lt, lv, ar** (ar — RTL).
  - Глобальные строки → центральный реестр, по файлу на язык: `interface/translations/<lang>.js`
    (доступ `interfaceTranslate[lang]`). Паритет ключей проверяет `interface/i18n.test.js`.
  - Локальные строки вьюхи → co-located `<Component>.i18n.js` через `langGuard({...}, "Name")`
    (паритет — `interface/localI18n.test.js`). **При выносе i18n переноси и хелперы-функции,
    что используются ВНУТРИ строк (напр. плюрализация) — иначе `no-undef`.**
- **Иконки** — только из спрайта `styles/icons.js`, рендер `<Icon n="имя" sm />`. Новую сначала
  добавь как `<symbol id="i-имя">` в спрайт.
- **Стили** — CSS-классы в `styles/`; инлайн — для мелочей. Токены через CSS-переменные
  (`var(--sp-4)`, `var(--game-accent)`).
- **Переносы** (`components/ui/hyphenate.js`): норвежский — `nb`, украинский — `uk` (не `ukr`!).
- **Мобильность**: игровые экраны влезают в один экран телефона без скролла (`.play` = 100dvh).

---

## Тесты (vitest)

Сеть под рефактор — держать зелёной и расширять.

- **Окружение**: по умолчанию **node** (быстро). Render-тестам ставь `// @vitest-environment jsdom`
  первой строкой файла. Setup (`src/test/setup.js`) подключает матчеры `@testing-library/jest-dom`.
- **Что чем покрыто**:
  - Контроллер-хуки → `renderHook` + мок `api`/сторов/`WebSocket` (пример: `useExam.test.jsx`,
    `useOnlineGame.test.jsx` с мок-сокетом).
  - Модалки/компоненты → render-тест с моком `api` (пример: `AskWordModal.test.jsx`).
  - i18n → `i18n.test.js` (центр) + `localI18n.test.js` (локальные карты): все языки + паритет.
  - `pages/learning/refactored.smoke.test.jsx` — каждый рефакторенный модуль ИМПОРТИРУЕТСЯ без
    ошибок module-eval (ловит «висячую ссылку на удалённый импорт», которую tsc/build пропускают).
- Детали и грабли — memory `frontend-test-net`, `frontend-architecture`.

---

## Как расширять

- **Новая тяжёлая вьюха** → создай `use<Name>` (вся логика/api/состояние) + компонент-рендер.
  Покрой хук `renderHook`-тестом, добавь в `refactored.smoke`.
- **Новая модалка-фича** → самодостаточный компонент (`open`+`onClose`+колбэк), render-тест.
- **Новая строка UI** → во все 7 языков (центр или `<Component>.i18n.js`). Прогони i18n-тесты.
- **Новый запрос к серверу** → метод в `ApiService`.

---

## Деплой и коммиты

- **Фронт**: коммит → push в `master` → авто-деплой **Vercel**. Коммить/пушить **только по явной
  просьбе** пользователя.
- **Бэк** (`laereNorskBackand`): `flyctl deploy --remote-only` + push github.
- **Формат**: conventional commits на русском — `feat(scope): …`, `fix(game): …`,
  `refactor(pool): …`, `chore: …`. Кратко и по делу.
- **НЕ коммитить**: `.claude/settings.json`, `yarn.lock`, черновые `*.md` в корне (`today*.md`,
  `words*.md`, `wsort*.md`, …). Стейджить точечно (`git add <files>`), **не** `git add -A`.
- **Пакетный менеджер**: канон — **npm** (`package-lock.json`, его и CI). `yarn.lock` присутствует,
  но «грязный»/вестигиальный — не коммитить его изменения. Добавляешь зависимость — согласуй с
  мейнтейнером стратегию lock-файлов.

---

## Частые нюансы

- **Описания/синонимы/формы** слов генерируются бэкендом по запросу и кешируются; фронт
  показывает скелетон во время загрузки.
- **WordInfoModal** — общая карточка слова; её admin/AI-правки вынесены в под-компоненты
  (Edit/Fix/Diff/Ask), мутируют `view` через колбэки.
- **Длинные слова** переносятся (`hyphenate` + `overflow-wrap`) — не ломай вёрстку игр.
