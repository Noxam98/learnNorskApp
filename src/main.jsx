import React from 'react'
import App from './App.jsx'
// Дизайн-система: токены → компоненты → стили экранов. Порядок важен.
import './styles/tokens.css'
import './styles/components.css'
import './styles/auth.css'
import './styles/screens.css'
import './styles/app.css'
import './styles/icons.js' // инжектит SVG-спрайт иконок в DOM (side-effect)
import * as ReactDOM from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  Navigate
} from "react-router-dom";
import { WordListPage } from './pages/WordListPage.jsx';
import { GamePage } from './pages/GamePage.jsx';
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MyPage from "./pages/MyPage.jsx";

const router = createHashRouter([
  {
    path: "/",
    element: <App/>,
    children: [
      {
        path: "/",
        element: <Navigate to="/words" />,
      },
      {
        path: 'words',
        element: <WordListPage/>,
      },
      {
        path: 'game',
        element: <GamePage/>, 
      },
      {
        path: 'authorization',
        element: <LoginPage/>,
      },
      {
        path: 'registration',
        element: <RegisterPage/>,
      },
      {
        path: 'mypage',
        element: <MyPage/>,
      }
    ]
  },
]);
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router}/>
    </React.StrictMode>,
 
)
