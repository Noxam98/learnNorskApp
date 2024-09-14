import React from 'react'
import "./App.css";
import App from './App.jsx'
import './index.css'
import * as ReactDOM from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  Navigate
} from "react-router-dom";
import { WordListPage } from './pages/WordListPage.jsx';
import { GamePage } from './pages/GamePage.jsx';

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
      }
    ]
  },
]);
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router}/>
    </React.StrictMode>,
 
)
