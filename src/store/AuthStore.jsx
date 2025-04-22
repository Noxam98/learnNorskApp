import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from "../components/tools/api.js";
import {interfaceTranslate} from "../interface/interfaceTranslation.jsx";
import {useSystemStore} from "./systemStore.jsx";


const getError = (error, currentLanguage)=>{

    if (error.message.includes('NetworkError')) {
        return interfaceTranslate[currentLanguage]['connectionError'];
    }
    if (error.message.includes('credent')) {
        return interfaceTranslate[currentLanguage]['invalidCredentials'];
    }
    if (error.message.includes('Username already exists')) {
        return interfaceTranslate[currentLanguage]['usernameExists'];
    }
    if (error.message.includes('Password must be at least 6 characters long')) {
        return interfaceTranslate[currentLanguage]['passwordLengthError'];
    }
    if (error.message.includes('Username cannot be empty')) {
        return interfaceTranslate[currentLanguage]['usernameEmptyError'];
    }

    return interfaceTranslate[currentLanguage]['unexpectedError'] + error.message;

}


export const useAuthStore = create(
    persist(
        (set, get) => ({
            // Инициализируем состояние из ApiService
            accessToken: api.accessToken || null,
            refreshToken: api.refreshToken || null,
            user: null,
            isLoading: false,
            registrationError: null,
            authorizationError: null,

            // Новый метод для проверки авторизации
            checkAuth: async () => {
                console.log(api.refreshToken)
                // if (!api.accessToken) return false;

                try {
                    const userData = await api.getProtectedData();
                    set({ user: { username: userData.username } });
                    return true;
                } catch {
                    try {
                        const newAccessToken = await api.refreshAccessToken();
                        set({accessToken: newAccessToken});
                        return false;
                    } catch (e) {
                        set({accessToken: null,  refreshToken: null, user: null});
                    }
                }
            },

            // Регистрация
            register: async (username, password) => {
                set({ isLoading: true, registrationError: null });
                try {
                    const result = await api.register( username, password);
                    set({ isLoading: false });
                    if (result.error) {
                        const lang = useSystemStore.getState().currentLanguage;
                        console.log(result.error)

                        set({ registrationError: getError(result.error, lang), isLoading: false });

                    }
                    return result;
                } catch (error) {
                    const lang = useSystemStore.getState().currentLanguage;
                    // console.log(error)
                    set({ registrationError: getError(error, lang), isLoading: false });
                    return false;
                }
            },

            // Методы
            login: async (username, password) => {
                set({ isLoading: true, authorizationError: null });
                try {
                    const data = await api.login(username, password);
                    console.log(data);
                    set({
                        user: { username },
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token, // Обновляем поле
                        isLoading: false,
                    });
                    return data;
                } catch (error) {
                    const lang = useSystemStore.getState().currentLanguage;
                    console.log(lang)
                    console.log(error)
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

            // Остальные методы без изменений
            logout: () => {
                api.logout();
                set({ user: null, accessToken: null, refreshToken: null });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
            }),
        }
    )
);