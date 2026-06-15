import { create } from 'zustand';
import api from "../components/tools/api.js";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "./systemStore.jsx";


const getError = (error, currentLanguage) => {
    const t = interfaceTranslate[currentLanguage];
    const msg = error?.message || '';

    if (msg.includes('NetworkError') || msg.includes('fetch') || msg.includes('refresh token')) {
        return t['connectionError'];
    }
    if (msg.includes('credent')) {
        return t['invalidCredentials'];
    }
    if (msg.includes('Username already exists')) {
        return t['usernameExists'];
    }
    if (msg.includes('Password must be at least 6 characters long')) {
        return t['passwordLengthError'];
    }
    if (msg.includes('Username cannot be empty')) {
        return t['usernameEmptyError'];
    }
    return (t['unexpectedError'] || '') + msg;
};

// Токенами владеет ApiService (единственный источник правды + localStorage).
// Стор только зеркалит состояние для реактивности UI и НЕ персистит токены сам.
export const useAuthStore = create((set, get) => ({
    accessToken: api.accessToken || null,
    user: null,
    isLoading: false,
    registrationError: null,
    authorizationError: null,

    // Проверка сессии при старте приложения. Возвращает true, если пользователь авторизован.
    checkAuth: async () => {
        if (!api.accessToken && !api.refreshToken) {
            set({ user: null, accessToken: null });
            return false;
        }
        try {
            const userData = await api.getProtectedData();
            set({ user: { username: userData.username }, accessToken: api.accessToken });
            if (userData.theme === "light" || userData.theme === "dark") {
                useSystemStore.getState().setTheme(userData.theme);  // тема юзера с сервера
            }
            return true;
        } catch {
            // apiRequest сам пытается обновить токен по 401; сюда попадаем только если не вышло.
            api.logout();
            set({ user: null, accessToken: null });
            return false;
        }
    },

    register: async (username, password) => {
        set({ isLoading: true, registrationError: null });
        try {
            const result = await api.register(username, password);
            if (result?.error) {
                const lang = useSystemStore.getState().currentLanguage;
                set({ registrationError: getError({ message: result.error }, lang), isLoading: false });
                return false;
            }
            set({ isLoading: false });
            return result;
        } catch (error) {
            const lang = useSystemStore.getState().currentLanguage;
            set({ registrationError: getError(error, lang), isLoading: false });
            return false;
        }
    },

    login: async (username, password) => {
        set({ isLoading: true, authorizationError: null });
        try {
            const data = await api.login(username, password);
            set({
                user: { username },
                accessToken: data.access_token,
                isLoading: false,
            });
            // подтянуть тему юзера с сервера
            api.getProtectedData().then((me) => {
                if (me?.theme === "light" || me?.theme === "dark") useSystemStore.getState().setTheme(me.theme);
            }).catch(() => {});
            return data;
        } catch (error) {
            const lang = useSystemStore.getState().currentLanguage;
            set({ authorizationError: getError(error, lang), isLoading: false });
            throw error;
        }
    },

    refreshAuthToken: async () => {
        try {
            const newToken = await api.refreshAccessToken();
            set({ accessToken: newToken });
            return newToken;
        } catch (error) {
            get().logout();
            throw error;
        }
    },

    // Сменить тему: мгновенно локально + сохранить на бэкенде (если авторизован).
    setTheme: (theme) => {
        useSystemStore.getState().setTheme(theme);
        if (get().accessToken) api.setUserTheme(theme).catch(() => {});
    },

    logout: () => {
        api.logout();
        set({ user: null, accessToken: null });
    },
}));
