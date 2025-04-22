import ky from 'ky';
import CryptoJS from 'crypto-js';

// Ключ для шифрования токенов (должен быть скрыт в production)
const SECRET_KEY = 'your-secure-encryption-key-123';

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.accessToken = null;
        this.refreshToken = null;
        this._initTokens();
    }

    // Новый метод инициализации
    _initTokens() {
        const accessToken = this._decryptToken(localStorage.getItem('access_token'));
        const refreshToken = this._decryptToken(localStorage.getItem('refresh_token'));
        console.log('accessToken', accessToken);
        console.log('refreshToken', refreshToken);
        if (accessToken && refreshToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
        }
    }


    // --- Вспомогательные методы ---
    _encryptToken(token) {
        return token ? CryptoJS.AES.encrypt(token, SECRET_KEY).toString() : null;
    }

    _decryptToken(encryptedToken) {
        if (!encryptedToken) return null;
        try {
            return CryptoJS.AES.decrypt(encryptedToken, SECRET_KEY).toString(CryptoJS.enc.Utf8);
        } catch {
            return null;
        }
    }

    _setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('access_token', this._encryptToken(accessToken));
        localStorage.setItem('refresh_token', this._encryptToken(refreshToken));
    }

    // --- Основные методы ---
    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.logout();
            throw new Error('No refresh token available');
        }

        try {
            const response = await ky.post(`${this.baseUrl}/refresh?refresh_token=${this.refreshToken}`, {
                throwHttpErrors: false,
                json: { refresh_token: this.refreshToken },
                timeout: 5000,
            }).json();

            if (!response.access_token) {
                throw new Error('Invalid token response');
            }

            this._setTokens(response.access_token, response.refresh_token);
            return response.access_token;
        } catch (error) {
            this.logout();
            throw new Error('Failed to refresh token. Please log in again.');
        }
    }

    async apiRequest(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек таймаут

        try {
            const response = await ky(`${this.baseUrl}${endpoint}`, {
                ...options,
                throwHttpErrors: false,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            // Обновляем токен при 401 ошибке
            if (error.response?.status === 401 && !options._retry) {
                const newToken = await this.refreshAccessToken();
                return this.apiRequest(endpoint, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${newToken}`,
                    },
                    _retry: true, // Предотвращаем бесконечный цикл
                });
            }

            throw error;
        }
    }

    // --- Публичные методы ---
    async register(username, password) {

        const response = await this.apiRequest('/register', {
            method: 'POST',
            json: { username, password },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.detail || 'Unknown error');
        }

        return response.json();
    }


    async login(username, password) {
        const response = await this.apiRequest('/login', {
            method: 'POST',
            json: { username, password },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.detail || 'Unknown error');
        }

        const data = await response.json();
        if (!data.access_token || !data.refresh_token) {
            throw new Error('Invalid login response');
        }

        this._setTokens(data.access_token, data.refresh_token);
        return data;
    }

    async getProtectedData() {
        const response = await this.apiRequest('/protected');
        return response.json();
    }

    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}

// Создаём экземпляр API (URL можно задать через переменные окружения)
const api = new ApiService(import.meta.env.VITE_API_URL || 'http://127.0.0.2:8000');
export default api;