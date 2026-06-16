import ky from 'ky';
import CryptoJS from 'crypto-js';

// Ключ шифрования токенов в localStorage. Это лишь лёгкая обфускация (на клиенте
// настоящего секрета быть не может) — задаётся через env, иначе дефолт для разработки.
const SECRET_KEY = import.meta.env.VITE_TOKEN_KEY || 'dev-token-key';

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/+$/, ''); // без хвостового слэша
        this.accessToken = null;
        this.refreshToken = null;
        this._initTokens();
    }

    // --- Хранилище токенов (единственный источник правды) ---
    _initTokens() {
        const accessToken = this._decryptToken(localStorage.getItem('access_token'));
        const refreshToken = this._decryptToken(localStorage.getItem('refresh_token'));
        if (accessToken && refreshToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
        }
    }

    _encryptToken(token) {
        return token ? CryptoJS.AES.encrypt(token, SECRET_KEY).toString() : null;
    }

    _decryptToken(encryptedToken) {
        if (!encryptedToken) return null;
        try {
            return CryptoJS.AES.decrypt(encryptedToken, SECRET_KEY).toString(CryptoJS.enc.Utf8) || null;
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

    isAuthenticated() {
        return !!this.accessToken;
    }

    // --- Обновление access-токена ---
    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.logout();
            throw new Error('No refresh token available');
        }

        try {
            const response = await ky.post(`${this.baseUrl}/refresh`, {
                json: { refresh_token: this.refreshToken },
                timeout: 5000,
            }).json();

            if (!response.access_token) {
                throw new Error('Invalid token response');
            }

            this._setTokens(response.access_token, response.refresh_token);
            return response.access_token;
        } catch {
            this.logout();
            throw new Error('Failed to refresh token. Please log in again.');
        }
    }

    async apiRequest(endpoint, options = {}) {
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const mergedOptions = {
            ...options,
            timeout: 120000,
            // Авто-ретраи только для идемпотентных GET-запросов; login/register/refresh не повторяем.
            retry: {
                limit: 3,
                methods: ['get'],
                statusCodes: [408, 429, 500, 502, 503, 504],
            },
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            hooks: {
                beforeRequest: [
                    request => {
                        if (this.accessToken) {
                            request.headers.set('Authorization', `Bearer ${this.accessToken}`);
                        }
                    }
                ],
                afterResponse: [
                    async (request, _options, response) => {
                        // Один раз пытаемся обновить токен при 401 и повторить запрос.
                        if (response.status === 401 && !request.headers.has('x-token-retried')) {
                            try {
                                const newToken = await this.refreshAccessToken();
                                request.headers.set('Authorization', `Bearer ${newToken}`);
                                request.headers.set('x-token-retried', '1');
                                return ky(request);
                            } catch {
                                return response;
                            }
                        }
                        return response;
                    }
                ]
            }
        };

        return ky(`${this.baseUrl}${path}`, mergedOptions);
    }

    // --- Публичные методы ---
    async register(username, password) {
        const response = await this.apiRequest('/register', {
            method: 'POST',
            json: { username, password },
            throwHttpErrors: false,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.detail || 'Unknown error');
        }
        return response.json();
    }

    async login(username, password) {
        const response = await this.apiRequest('/login', {
            method: 'POST',
            json: { username, password },
            throwHttpErrors: false,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
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
        const response = await this.apiRequest('/me');
        return response.json();
    }

    // --- Серверные данные (требуют авторизации) ---
    async _send(method, endpoint, body) {
        const opts = { method };
        if (body !== undefined) opts.json = body;
        opts.throwHttpErrors = false;
        const response = await this.apiRequest(endpoint, opts);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.detail || `Request failed (${response.status})`);
        }
        return response.json();
    }

    getData() { return this._send('GET', '/data'); }
    createDict(name) { return this._send('POST', '/dictionaries', { name }); }
    deleteDict(dictId) { return this._send('DELETE', `/dictionaries/${dictId}`); }
    addWords(dictId, prompt) { return this._send('POST', `/dictionaries/${dictId}/words`, { prompt }); }
    addPoolWord(dictId, norwegian) { return this._send('POST', `/dictionaries/${dictId}/add_pool`, { norwegian }); }
    importDict(dict) { return this._send('POST', '/dictionaries/import', { name: dict.dictName, words: dict.words || [] }); }
    createDictFromPool({ name, q = "", topics = [], level = "" }) {
        return this._send('POST', '/dictionaries/from_pool', { name, q, topics, level });
    }
    deleteWord(wordId) { return this._send('DELETE', `/words/${wordId}`); }
    moveWords(ids, dictId) { return this._send('POST', `/words/move`, { ids, dict_id: dictId }); }
    editWord(wordId, override) { return this._send('PATCH', `/words/${wordId}`, override); }
    recordResult(wordId, correct) { return this._send('POST', `/words/${wordId}/result`, { correct }); }
    reportWord(wordId) { return this._send('POST', `/words/${wordId}/report`); }
    getWordDescription(wordId) { return this._send('GET', `/words/${wordId}/description`); }
    getDistractors(wordId, { n = 3, mode = 'no2int', lang = 'ru' } = {}) {
        return this._send('GET', `/words/${wordId}/distractors?n=${n}&mode=${mode}&lang=${encodeURIComponent(lang)}`);
    }
    getSynonyms(wordId, { n = 5, lang = 'ru' } = {}) {
        return this._send('GET', `/words/${wordId}/synonyms?n=${n}&lang=${encodeURIComponent(lang)}`);
    }
    searchPool(q) { return this._send('GET', `/pool/search?q=${encodeURIComponent(q)}`); }
    getPool({ q = "", limit = 60, offset = 0, topics = [], level = "", sort = "alpha", order = "asc" } = {}) {
        const qs = new URLSearchParams({ limit, offset, sort, order });
        if (q) qs.set("q", q);
        if (topics && topics.length) qs.set("topics", topics.join(","));
        if (level) qs.set("level", level);
        return this._send('GET', `/pool?${qs.toString()}`);
    }
    setUserTheme(theme) { return this._send('POST', '/me/theme', { theme }); }
    setGamePrefs(prefs) { return this._send('POST', '/me/game_prefs', prefs); }
    getAdminStats() { return this._send('GET', '/admin/stats'); }
    adminDeleteWord(word) { return this._send('DELETE', `/admin/pool/${encodeURIComponent(word)}`); }
    adminDescribeAll() { return this._send('POST', '/admin/describe_all'); }
    getPoolTopics() { return this._send('GET', '/pool/topics'); }
    getPoolDescription(word) { return this._send('GET', `/pool/${encodeURIComponent(word)}/description`); }
    getPoolSynonyms(word, { lang = "ru" } = {}) { return this._send('GET', `/pool/${encodeURIComponent(word)}/synonyms?lang=${encodeURIComponent(lang)}`); }
    getWordDiff(a, b, lang = "ru") { return this._send('GET', `/pool/diff?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&lang=${encodeURIComponent(lang)}`); }
    redescribe(word, hint) { return this._send('POST', `/pool/${encodeURIComponent(word)}/redescribe`, { hint }); }
    getPoolMeta(word) { return this._send('GET', `/pool/${encodeURIComponent(word)}/meta`); }
    rediff(a, b, lang, hint) { return this._send('POST', '/pool/rediff', { a, b, lang, hint }); }
    ttsUrl(word, lang) { return `${this.baseUrl}/tts?word=${encodeURIComponent(word)}${lang ? `&lang=${encodeURIComponent(lang)}` : ""}`; }

    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}

// URL бэкенда задаётся через переменные окружения.
const api = new ApiService(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000');
export default api;
