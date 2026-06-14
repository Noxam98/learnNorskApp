import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import { NavigationBar } from "./components/navigationBar";
import Footer from "./components/footer.jsx";
import { useWordsStore } from "./store/wordStore.jsx";
import { useAuthStore } from "./store/AuthStore.jsx";

import { WordListPage } from "./pages/WordListPage.jsx";
import { PoolPage } from "./pages/PoolPage.jsx";
import { GamePage } from "./pages/GamePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MyPage from "./pages/MyPage.jsx";

function App() {
    const location = useLocation();
    const path = location.pathname;
    const accessToken = useAuthStore((s) => s.accessToken);
    const isAuthed = !!accessToken;

    // Проверка сессии при старте.
    useEffect(() => { useAuthStore.getState().checkAuth(); }, []);

    // Данные полностью серверные: грузим при наличии сессии, чистим при выходе.
    useEffect(() => {
        if (isAuthed) useWordsStore.getState().loadData().catch(() => {});
        else useWordsStore.getState().reset();
    }, [isAuthed]);

    // Пока у части слов нет звука — периодически обновляем (фон сервера их догружает).
    useEffect(() => {
        if (!isAuthed) return;
        const id = setInterval(() => {
            const dl = useWordsStore.getState().dictList;
            const incomplete = dl.some((d) => d.words.some((w) => !w.hasTts));
            if (incomplete) useWordsStore.getState().refresh();
        }, 45000);
        return () => clearInterval(id);
    }, [isAuthed]);

    const routes = (
        <Routes location={location}>
            <Route path="/" element={<Navigate to="/words" />} />
            <Route path="/words" element={<WordListPage />} />
            <Route path="/pool" element={<PoolPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/authorization" element={<LoginPage />} />
            <Route path="/registration" element={<RegisterPage />} />
            <Route path="/mypage" element={<MyPage />} />
        </Routes>
    );

    const isAuthScreen = path === "/authorization" || path === "/registration";

    // Экраны входа/регистрации — полноэкранные.
    if (isAuthScreen) return routes;

    // Всё остальное требует авторизации.
    if (!isAuthed) return <Navigate to="/authorization" replace />;

    const showFooter = path === "/words" || path === "/mypage" || path === "/pool";
    return (
        <div className={`app${path === "/words" ? " app--fixed" : ""}`}>
            <NavigationBar />
            {routes}
            {showFooter && <Footer />}
        </div>
    );
}

export default App;
