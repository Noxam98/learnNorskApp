import {useAuthStore} from "../store/AuthStore.jsx";
import {useEffect} from "react";

export const useAuth = () => {
    const store = useAuthStore();

    useEffect(() => {
        if (store.accessToken && !store.user) {
            store.checkAuth();
        }
    }, [store.accessToken]);

    return {
        ...store,
        isAuthenticated: !!store.accessToken,
    };
};