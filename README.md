# Lære Norsk — фронтенд

Веб-приложение для изучения норвежских слов: личные словари, общий пул слов
с ИИ-переводами на 5 языков, описания и синонимы по запросу, озвучка и игровые
режимы тренировки памяти.

Это **фронтенд** (SPA на React + Vite). Бэкенд живёт в отдельном репозитории
`laereNorskBackand` (FastAPI, деплой на Fly.io).

## Стек

- **React 18** + **Vite 5** (SPA, хэш-роутинг через `react-router-dom`)
- **Zustand** (+ `immer`) — состояние (`src/store`)
- **ky** — HTTP-клиент к API (`src/components/tools/api.js`)
- **framer-motion** — анимации (модалки, карточки игр)
- **hyphen** — мягкие переносы слов по правилам языка
- **crypto-js** — хранение JWT-токенов в localStorage
- **ESLint** — линтинг

## Запуск

```bash
npm install
npm run dev        # дев-сервер (--host), общается с прод-бэкендом на Fly
npm run build      # прод-сборка в dist/
npm run preview    # предпросмотр сборки
```

## Проверки качества (нужно держать зелёными)

```bash
npm run typecheck  # типы через JSDoc + tsc (jsconfig.json) — 0 ошибок
npm run lint       # ESLint (ошибки блокируют; exhaustive-deps — предупреждения)
npm test           # vitest (в т.ч. паритет i18n-блоков interfaceTranslate)
npm run build      # сборка не должна падать
```

Все четыре прогоняются автоматически в **CI** (GitHub Actions,
`.github/workflows/ci.yml`) на каждый push в `master` и каждый PR.

### Переменные окружения

| Переменная        | Назначение                              | По умолчанию              |
|-------------------|------------------------------------------|---------------------------|
| `VITE_API_URL`    | URL бэкенда                              | `http://127.0.0.1:8000`   |
| `VITE_TOKEN_KEY`  | Ключ шифрования токенов в localStorage  | `dev-token-key`           |

`.env.development` и `.env.production` указывают на бэкенд `https://learn-norsk-backend.fly.dev`.

## Структура

```
src/
├── App.jsx                 # роуты (#/words, #/pool, #/game, #/mypage, #/stats, авторизация)
├── pages/                  # экраны: WordListPage, PoolPage, GamePage, MyPage, StatsPage(админ), Login/Register
├── components/
│   ├── gameComponents/     # игры: StudyGame (флешкарты), game.jsx (ввод/выбор), GameWordChooser
│   ├── wordListComponents/ # карточки слов, выбор словаря
│   ├── ui/                 # Modal, Icon, SpeakButton, WordInfoModal, hyphenate.js, tts.js …
│   └── tools/api.js        # ApiService: все запросы к бэкенду, refresh-токены
├── store/                  # zustand: wordStore (словари/пул), systemStore (язык/тема), AuthStore
├── interface/              # переводы интерфейса на ru/ukr/en/pl/lt
└── styles/                 # CSS (app.css, screens.css, components.css), icons.js (SVG-спрайт)
```

## Ключевые особенности

- **5 языков интерфейса и переводов**: ru, ukr, en, pl, lt (`src/interface/interfaceTranslation.jsx`).
- **Общий пул слов** — слова, сгенерированные ИИ; пользователь добавляет их в свои словари.
- **Описания и синонимы** генерируются на бэкенде по запросу (при открытии карточки) и кешируются.
- **Игры**: «Изучение» (флешкарты), «Ввод», «Выбор» — направление Norsk↔родной язык, опц. озвучка.
- **Иконки** — единый SVG-спрайт (`src/styles/icons.js`), используются как `<Icon n="..." />`.

## Деплой

- **Фронтенд** → пуш в `master` на GitHub → авто-деплой на **Vercel**.
- **Бэкенд** → отдельный репозиторий, деплой на **Fly.io** (`flyctl deploy`).

В репозитории есть и `yarn.lock`, и `package-lock.json` — Vercel собирает через
**yarn**, поэтому новые зависимости должны попадать в `yarn.lock`.

Подробные конвенции для разработки — в [AGENTS.md](AGENTS.md).
