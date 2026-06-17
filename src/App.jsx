import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import { NavigationBar } from "./components/navigationBar";
import Footer from "./components/footer.jsx";
import { useWordsStore } from "./store/wordStore.jsx";
import { useAuthStore } from "./store/AuthStore.jsx";
import { useSystemStore } from "./store/systemStore.jsx";

import { BrandLoader } from "./components/ui/Spinner.jsx";
import Toast from "./components/tools/error.jsx";
import { WordListPage } from "./pages/WordListPage.jsx";
import { PoolPage } from "./pages/PoolPage.jsx";
import { GamePage } from "./pages/GamePage.jsx";
import { OnlinePage } from "./pages/OnlinePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MyPage from "./pages/MyPage.jsx";
import { StatsPage } from "./pages/StatsPage.jsx";

function App() {
    const location = useLocation();
    const path = location.pathname;
    const accessToken = useAuthStore((s) => s.accessToken);
    const isAuthed = !!accessToken;
    const isLoadingData = useWordsStore((s) => s.isLoading);
    const dataLoaded = useWordsStore((s) => s.loaded);
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);

    const theme = useSystemStore((s) => s.theme);
    const toast = useSystemStore((s) => s.toast);
    const showToast = useSystemStore((s) => s.showToast);

    // Проверка сессии при старте.
    useEffect(() => { useAuthStore.getState().checkAuth(); }, []);

    // Тема оформления → атрибут на <html>, остальное делают CSS-токены.
    useEffect(() => {
        document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
    }, [theme]);

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
            <Route path="/online" element={<OnlinePage />} />
            <Route path="/authorization" element={<LoginPage />} />
            <Route path="/registration" element={<RegisterPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/stats" element={isAdmin ? <StatsPage /> : <Navigate to="/words" replace />} />
        </Routes>
    );

    const isAuthScreen = path === "/authorization" || path === "/registration";

    // Экраны входа/регистрации — полноэкранные.
    if (isAuthScreen) return routes;

    // Всё остальное требует авторизации.
    if (!isAuthed) return <Navigate to="/authorization" replace />;

    const showFooter = path === "/words" || path === "/mypage" || path === "/pool";
    // Первичная загрузка серверных данных — полноэкранный лоадер вместо пустых экранов.
    const showInitialLoader = isLoadingData && !dataLoaded;
    return (
        <div className="app">
            <NavigationBar />
            {showInitialLoader ? <BrandLoader size="lg" /> : routes}
            {showFooter && <Footer />}
            <Toast text={toast} setText={showToast} />
        </div>
    );
}

export default App;
