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
import * as ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";

// Единый catch-all: всеми маршрутами управляет App (его внутренние <Routes>),
// иначе новый путь (например /pool) даёт 404 на уровне data-роутера.
const router = createHashRouter([
  { path: "*", element: <App /> },
]);
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router}/>
    </React.StrictMode>,

)

// Service worker — только для веб-пушей (напоминания). Регистрируем после загрузки; ошибки глушим.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
