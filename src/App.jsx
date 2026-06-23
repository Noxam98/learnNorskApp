import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import { NavigationBar } from "./components/navigationBar";
import Footer from "./components/footer.jsx";
import { useWordsStore } from "./store/wordStore.jsx";
import { useAuthStore } from "./store/AuthStore.jsx";
import { useSystemStore } from "./store/systemStore.jsx";
import { resyncPush } from "./components/tools/push.js";
import api from "./components/tools/api.js";

// Тост админу при росте очереди модерации (при открытом приложении). 5 языков.
const MOD_TOAST = { ru: "Новые слова на модерации", ukr: "Нові слова на модерації", en: "New words to moderate", pl: "Nowe słowa do moderacji", lt: "Nauji žodžiai moderacijai" };

import { BrandLoader } from "./components/ui/Spinner.jsx";
import Toast from "./components/tools/error.jsx";
import { UpdateBanner } from "./components/ui/UpdateBanner.jsx";
import { PoolPage } from "./pages/PoolPage.jsx";
import ModerationPage from "./pages/ModerationPage.jsx";
import { OnlinePage } from "./pages/OnlinePage.jsx";
import { GamesRedirect } from "./pages/GamesHub.jsx";
import LearningPage from "./pages/learning/LearningPage.jsx";
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
    const toastType = useSystemStore((s) => s.toastType);
    const showToast = useSystemStore((s) => s.showToast);
    const pushEnabled = useSystemStore((s) => s.pushEnabled);

    // Если пуши были включены — тихо пере-подписываемся при входе (новое устройство/после деплоя).
    useEffect(() => {
        if (isAuthed && pushEnabled) resyncPush().catch(() => {});
    }, [isAuthed, pushEnabled]);

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

    // Админ: лёгкий поллинг очереди модерации → тост при росте (когда приложение открыто).
    // Закрытое приложение покрывает web-push (SW не дублирует системное при открытой вкладке).
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    useEffect(() => {
        if (!isAuthed || !isAdmin) return;
        let prev = null;
        const check = () => {
            if (document.visibilityState !== "visible") return;
            api.adminPending().then((r) => {
                const c = r?.count || 0;
                if (prev !== null && c > prev) {
                    useSystemStore.getState().showToast(`${MOD_TOAST[currentLanguage] || MOD_TOAST.en}: ${c}`, "success");
                }
                prev = c;
            }).catch(() => {});
        };
        check();
        const id = setInterval(check, 45000);
        return () => clearInterval(id);
    }, [isAuthed, isAdmin, currentLanguage]);

    const routes = (
        <Routes location={location}>
            <Route path="/" element={<Navigate to="/learning" />} />
            <Route path="/words" element={<Navigate to="/learning" replace />} />
            <Route path="/pool" element={<PoolPage />} />
            <Route path="/games" element={<GamesRedirect />} />
            <Route path="/online" element={<OnlinePage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/authorization" element={<LoginPage />} />
            <Route path="/registration" element={<RegisterPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/stats" element={isAdmin ? <StatsPage /> : <Navigate to="/learning" replace />} />
            <Route path="/moderation" element={isAdmin ? <ModerationPage /> : <Navigate to="/learning" replace />} />
        </Routes>
    );

    const isAuthScreen = path === "/authorization" || path === "/registration";

    // Экраны входа/регистрации — полноэкранные.
    if (isAuthScreen) return routes;

    // Всё остальное требует авторизации.
    if (!isAuthed) return <Navigate to="/authorization" replace />;

    const showFooter = path === "/mypage" || path === "/pool";
    // Первичная загрузка серверных данных — полноэкранный лоадер вместо пустых экранов.
    const showInitialLoader = isLoadingData && !dataLoaded;
    return (
        <div className="app">
            <NavigationBar />
            {showInitialLoader ? <BrandLoader size="lg" /> : routes}
            {showFooter && <Footer />}
            <Toast text={toast} setText={showToast} type={toastType} />
            <UpdateBanner />
        </div>
    );
}

export default App;
