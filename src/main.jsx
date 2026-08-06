import React from 'react'
import App from './App.jsx'
// Дизайн-система: токены → компоненты → стили экранов. Порядок важен.
import './styles/tokens.css'
import './styles/components.css'
import './styles/auth.css'
import './styles/screens.css'
import './styles/loader.css'
import './styles/race.css'
import './styles/room.css'
import './styles/dropdown.css'
import './styles/study.css'
import './styles/app.css'
import './styles/icons.js' // инжектит SVG-спрайт иконок в DOM (side-effect)
import './noZoom.js' // блокирует масштабирование (pinch/double-tap/Ctrl+колесо/±) — side-effect
import * as ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { registerBackButton } from "./native/backButton.js";
import { hideSplash } from "./native/splash.js";
import { setupServiceWorker } from "./native/serviceWorker.js";
import { setupSharedImages } from "./native/sharedImages.js";
import api from "./components/tools/api.js";

// Единый catch-all: всеми маршрутами управляет App (его внутренние <Routes>),
// иначе новый путь (например /pool) даёт 404 на уровне data-роутера.
const router = createHashRouter([
  { path: "*", element: <App /> },
]);

// Токены: в вебе они уже в памяти (localStorage синхронный, промис разрешён сразу), на нативе
// их отдаёт асинхронный Preferences. Рендерим ПОСЛЕ гидрации — иначе первый рендер решит, что
// юзер не залогинен, и покажет вход при каждом старте приложения. ready() не реджектится.
api.ready().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <RouterProvider router={router}/>
      </React.StrictMode>,

  )

  // Нативные доводки Android. В вебе оба вызова — no-op, плагины Capacitor в бандл не тянутся
  // (динамический импорт внутри нативной ветки).
  registerBackButton();
  hideSplash();

  // «Поделиться» картинкой в приложение → вкладка «Наборы» + OCR-импорт (A4).
  setupSharedImages();

  // Service worker — только для веб-пушей (напоминания) и только в вебе. На нативе не
  // регистрируем и снимаем старую регистрацию (см. native/serviceWorker.js).
  setupServiceWorker();
});
