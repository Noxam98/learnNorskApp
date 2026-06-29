import { useAuthStore } from "../store/AuthStore.jsx";
import { useEffect } from "react";

// Точечные селекторы вместо подписки на ВЕСЬ стор (+ без spread `{...store}`): потребители
// ре-рендерятся только при изменении нужных полей auth-стора, а не на любой setState (тема,
// gamePrefs и т.п.), и не получают новый объект-обёртку каждый рендер (стабильные ссылки вниз).
export const useAuth = () => {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const isLoading = useAuthStore((s) => s.isLoading);
    const authorizationError = useAuthStore((s) => s.authorizationError);
    const registrationError = useAuthStore((s) => s.registrationError);
    // actions zustand стабильны по ссылке — подписка на них не вызывает ре-рендеров
    const login = useAuthStore((s) => s.login);
    const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
    const register = useAuthStore((s) => s.register);
    const logout = useAuthStore((s) => s.logout);
    const setTheme = useAuthStore((s) => s.setTheme);
    const refreshMe = useAuthStore((s) => s.refreshMe);
    const checkAuth = useAuthStore((s) => s.checkAuth);

    useEffect(() => {
        if (accessToken && !user) checkAuth();
    }, [accessToken, user, checkAuth]);

    return {
        accessToken, user, isLoading, authorizationError, registrationError,
        login, loginWithGoogle, register, logout, setTheme, refreshMe, checkAuth,
        isAuthenticated: !!accessToken,
    };
};
