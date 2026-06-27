import ky from 'ky';
import CryptoJS from 'crypto-js';
import { useSystemStore } from '../../store/systemStore.jsx';
import { interfaceTranslate } from '../../interface/interfaceTranslation';

// Глобальный тост при сбоях запроса. Показываем только то, в чём пользователь не виноват:
// сеть недоступна (status 0) либо перегрузка/сбой AI-провайдера (429/5xx). Прочие 4xx
// (валидация и т.п.) — молча, их разбирает вызывающий код. Возвращает на нужном языке.
let _lastNetToast = 0;
function toastForError(status) {
    const transient = status === 0 || status === 429 || status >= 500;
    if (!transient) return;
    const now = Date.now();
    if (now - _lastNetToast < 6000) return;   // антиспам: один тост на серию (ретраи/параллельные запросы)
    _lastNetToast = now;
    const lang = useSystemStore.getState().currentLanguage;
    const t = interfaceTranslate[lang] || interfaceTranslate.en;
    useSystemStore.getState().showToast(status === 0 ? t.connectionError : t.providerError);
}

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

        try {
            return await ky(`${this.baseUrl}${path}`, mergedOptions);
        } catch (e) {
            // Сетевой сбой (нет ответа вовсе: офлайн/таймаут/CORS-провал/сервер недоступен) — тост на
            // ЛЮБОМ запросе. HTTPError (есть .response) тут не тостим: 5xx/429 разбирает _send, 4xx — вызыватели.
            if (!(/** @type {any} */(e)?.response)) toastForError(0);
            throw e;
        }
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

    // Вход/регистрация через Google: шлём ID-token, получаем нашу пару токенов.
    async loginWithGoogle(credential) {
        const response = await this.apiRequest('/auth/google', {
            method: 'POST',
            json: { credential },
            throwHttpErrors: false,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.detail || 'Google sign-in failed');
        }
        const data = await response.json();
        if (!data.access_token || !data.refresh_token) {
            throw new Error('Invalid login response');
        }
        this._setTokens(data.access_token, data.refresh_token);
        return data;
    }

    // Привязать/отвязать Google к текущему аккаунту (требует авторизации).
    linkGoogle(credential) { return this._send('POST', '/me/link_google', { credential }); }
    unlinkGoogle() { return this._send('POST', '/me/unlink_google'); }
    setPassword(password) { return this._send('POST', '/me/set_password', { password }); }
    setName(name) { return this._send('POST', '/me/name', { name }); }
    setOnlinePrefs(prefs) { return this._send('POST', '/me/online_prefs', prefs); }
    setGameMode(mode) { return this._send('POST', '/me/game_mode', { mode }); }
    // Правка слова в общем пуле (норвежское + переводы) — для всех, через ревью нейросети.
    editPoolWord(word, translate, lang, hint) { return this._send('POST', `/pool/${encodeURIComponent(word)}/edit`, { translate, lang, hint }); }
    adminDeletePoolWord(word) { return this._send('DELETE', `/admin/pool/${encodeURIComponent(word)}`); }
    gamesAiWords(opts) { return this._send('POST', '/games/ai_words', opts); }

    // URL WebSocket-а онлайн-раздела (токен и язык — в query, т.к. браузерный WS без заголовков).
    onlineSocketUrl(lang) {
        const base = this.baseUrl.replace(/^http/, 'ws');
        return `${base}/ws/online?token=${encodeURIComponent(this.accessToken || '')}&lang=${encodeURIComponent(lang || 'ru')}`;
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
        const response = await this.apiRequest(endpoint, opts);   // сетевой сбой тостит apiRequest и пробрасывает
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            toastForError(response.status);
            throw new Error(err?.detail || `Request failed (${response.status})`);
        }
        return response.json();
    }

    getData() { return this._send('GET', '/data'); }   // набор слов пользователя (фон tts + fallback игр)
    recordResult(wordId, correct, mode = null, elapsed = null, direction = null) { return this._send('POST', `/words/${wordId}/result`, { correct, mode, elapsed, direction }); }
    getWordDescription(wordId) { return this._send('GET', `/words/${wordId}/description`); }
    getDistractors(wordId, { n = 3, mode = 'no2int', lang = 'ru' } = {}) {
        return this._send('GET', `/words/${wordId}/distractors?n=${n}&mode=${mode}&lang=${encodeURIComponent(lang)}`);
    }
    // Кэш дистракторов на время сессии: каждый вопрос «Выбора» ходил на бэк и БЛОКИРОВАЛ показ
    // вариантов (round-trip с телефона + иногда холодный воркер = до 5с). Мемоизируем по ключу и
    // даём prefetch — сессия греет кэш заранее, поэтому вопросы открываются мгновенно.
    getPoolDistractors(poolId, { n = 3, mode = 'no2int', lang = 'ru' } = {}) {
        if (!this._distractorCache) this._distractorCache = new Map();
        const key = `${poolId}|${n}|${mode}|${lang}`;
        const hit = this._distractorCache.get(key);
        if (hit) return hit;
        const p = this._send('GET', `/pool/${poolId}/distractors?n=${n}&mode=${mode}&lang=${encodeURIComponent(lang)}`)
            .catch((e) => { this._distractorCache.delete(key); throw e; }); // не кэшируем ошибку
        this._distractorCache.set(key, p);
        return p;
    }
    // Заранее прогреть кэш дистракторов для предстоящих слов сессии (огонь-и-забыли).
    prefetchPoolDistractors(poolId, opts) {
        if (poolId == null) return;
        try { this.getPoolDistractors(poolId, opts).catch(() => {}); } catch { /* */ }
    }
    getSynonyms(wordId, { n = 5, lang = 'ru' } = {}) {
        return this._send('GET', `/words/${wordId}/synonyms?n=${n}&lang=${encodeURIComponent(lang)}`);
    }
    searchPool(q, lang) { return this._send('GET', `/pool/search?q=${encodeURIComponent(q)}${lang ? `&lang=${encodeURIComponent(lang)}` : ""}`); }
    generateWord(word) { return this._send('POST', '/pool/generate', { word }); }
    getPool({ q = "", limit = 60, offset = 0, topics = [], level = "", sort = "alpha", order = "asc", missing = "", pos = "", lang = "" } = {}) {
        const qs = new URLSearchParams({ limit, offset, sort, order });
        if (q) qs.set("q", q);
        if (topics && topics.length) qs.set("topics", topics.join(","));
        if (level) qs.set("level", level);
        if (missing) qs.set("missing", missing);
        if (pos) qs.set("pos", pos);
        if (lang) qs.set("lang", lang);   // поиск по норвежскому + языку интерфейса
        return this._send('GET', `/pool?${qs.toString()}`);
    }
    setUserTheme(theme) { return this._send('POST', '/me/theme', { theme }); }
    setFocusTopics(topics) { return this._send('POST', '/me/focus_topics', { topics }); }
    setGamePrefs(prefs) { return this._send('POST', '/me/game_prefs', prefs); }
    getAdminStats() { return this._send('GET', '/admin/stats'); }
    adminPending() { return this._send('GET', '/admin/pending'); }                                  // слова на модерации
    adminApprove(poolId) { return this._send('POST', `/admin/pending/${poolId}/approve`); }         // → в общую базу
    adminReject(poolId) { return this._send('POST', `/admin/pending/${poolId}/reject`); }           // → приватно у автора
    adminReported() { return this._send('GET', '/admin/reported'); }                                 // жалобы «не учить»
    adminExcludeWord(poolId) { return this._send('POST', `/admin/reported/${poolId}/exclude`); }     // убрать из учёбы (всем)
    adminKeepWord(poolId) { return this._send('POST', `/admin/reported/${poolId}/keep`); }           // оставить (+гасить 5 жалоб)
    adminDeleteWord(word) { return this._send('DELETE', `/admin/pool/${encodeURIComponent(word)}`); }
    adminDescribeAll() { return this._send('POST', '/admin/describe_all'); }
    getAdminControl() { return this._send('GET', '/admin/control'); }
    setAdminControl(key, paused) { return this._send('POST', `/admin/control/${key}?paused=${paused}`); }
    getPoolTopics() { return this._send('GET', '/pool/topics'); }
    getPoolDescription(word) { return this._send('GET', `/pool/${encodeURIComponent(word)}/description`); }
    getPoolSynonyms(word, { lang = "ru" } = {}) { return this._send('GET', `/pool/${encodeURIComponent(word)}/synonyms?lang=${encodeURIComponent(lang)}`); }
    getWordDiff(a, b, lang = "ru") { return this._send('GET', `/pool/diff?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&lang=${encodeURIComponent(lang)}`); }
    redescribe(word, hint) { return this._send('POST', `/pool/${encodeURIComponent(word)}/redescribe`, { hint }); }
    getPoolMeta(word) { return this._send('GET', `/pool/${encodeURIComponent(word)}/meta`); }
    askWord(word, question, lang = "ru") { return this._send('POST', `/pool/${encodeURIComponent(word)}/ask`, { question, lang }); }
    revoiceWord(word) { return this._send('POST', `/pool/${encodeURIComponent(word)}/revoice`); }

    // --- «Учёба» (интервальные повторения) ---
    learningList({ status, level, topic, q, sort = "strength", order = "asc", limit = 500, offset = 0 } = {}) {
        const qs = new URLSearchParams();
        if (status) qs.set("status", status);
        if (level) qs.set("level", level);
        if (topic) qs.set("topic", topic);
        if (q) qs.set("q", q);
        if (sort) qs.set("sort", sort);
        if (order) qs.set("order", order);
        qs.set("limit", limit); qs.set("offset", offset);
        return this._send('GET', `/learning?${qs.toString()}`);
    }
    learningStats() { return this._send('GET', '/learning/stats'); }
    leaderboard(period = 'week', limit = 50) { return this._send('GET', `/learning/leaderboard?period=${period}&limit=${limit}`); }
    learningDue(limit = 20) { return this._send('GET', `/learning/due?limit=${limit}`); }
    learningActivity(days = 119) { return this._send('GET', `/learning/activity?days=${days}`); }
    learningAnswer({ pool_id, correct, elapsed = null, mode = null, direction = null }) { return this._send('POST', '/learning/answer', { pool_id, correct, elapsed, mode, direction }); }
    learningAdd(poolId) { return this._send('POST', '/learning/add', { pool_id: poolId }); }       // добавить слово (по pool_id) в Учёбу
    learningRemove(poolId) { return this._send('POST', '/learning/remove', { pool_id: poolId }); } // убрать слово (по pool_id) из Учёбы
    learningReport(poolId) { return this._send('POST', '/learning/report', { pool_id: poolId }); } // «не учить»: жалоба на мусорное слово + убрать у себя
    learningSession(size = 20, lang = 'ru') { return this._send('GET', `/learning/session?size=${size}&lang=${encodeURIComponent(lang)}`); }
    learningGate() { return this._send('GET', '/learning/gate'); }
    learningGateExam(lang = "ru") { return this._send('GET', `/learning/gate/exam?lang=${encodeURIComponent(lang)}`); }
    learningGateGrade({ lang = "ru", answers = [] }) { return this._send('POST', '/learning/gate/exam', { lang, answers }); }
    learningAudit(lang = "ru") { return this._send('GET', `/learning/audit?lang=${encodeURIComponent(lang)}`); }
    learningAuditGrade({ lang = "ru", answers = [] }) { return this._send('POST', '/learning/audit', { lang, answers }); }
    learningStatus(poolId, action) { return this._send('POST', `/learning/${poolId}/status`, { action }); }
    learningSuggest({ count = 10, level = "" } = {}) { return this._send('POST', '/learning/suggest', { count, level }); }
    placementGet(lang = "ru", per = 4) { return this._send('GET', `/learning/placement?lang=${encodeURIComponent(lang)}&per=${per}`); }
    placementGrade({ lang = "ru", answers = [] }) { return this._send('POST', '/learning/placement', { lang, answers }); }
    placementLevel(level) { return this._send('POST', '/learning/level', { level }); }
    rediff(a, b, lang, hint) { return this._send('POST', '/pool/rediff', { a, b, lang, hint }); }
    ttsUrl(word, lang) { return `${this.baseUrl}/tts?word=${encodeURIComponent(word)}${lang ? `&lang=${encodeURIComponent(lang)}` : ""}`; }

    // Личные наборы для изучения слов
    setsList() { return this._send('GET', '/sets'); }                                              // [{id, name, studying, count}]
    setCreate(name) { return this._send('POST', '/sets', { name }); }
    setRename(id, name) { return this._send('PATCH', `/sets/${id}`, { name }); }
    setDelete(id) { return this._send('DELETE', `/sets/${id}`); }
    setStudying(id, studying) { return this._send('POST', `/sets/${id}/studying`, { studying }); }
    setWords(id) { return this._send('GET', `/sets/${id}/words`); }                                 // {words:[{pool_id,...}]}
    setAddWords(id, poolIds) { return this._send('POST', `/sets/${id}/words`, { pool_ids: poolIds }); }
    setRemoveWord(id, poolId) { return this._send('DELETE', `/sets/${id}/words/${poolId}`); }
    setsMembership(poolIds) { return this._send('POST', '/sets/membership', { pool_ids: poolIds }); } // pool_id → [set_id]
    setSession(id, size = 20, lang = 'ru') { return this._send('GET', `/sets/${id}/session?size=${size}&lang=${encodeURIComponent(lang)}`); }
    setGenerate(id, { topic = "", level = "", count = 10, lang = 'ru' } = {}) { return this._send('POST', `/sets/${id}/generate`, { topic, level, count, lang }); } // ИИ-генерация слов в набор
    setReset(id) { return this._send('POST', `/sets/${id}/reset`); }   // сброс рампы выученных слов набора
    setOcr(id, { image, hint = "" } = {}) { return this._send('POST', `/sets/${id}/ocr`, { image, hint }); }   // фото → список слов (vision)
    setImportWords(id, { words, lang = 'ru' } = {}) { return this._send('POST', `/sets/${id}/import-words`, { words, lang }); } // отредактированный список → в набор

    // Веб-пуши (напоминания о бездействии)
    pushVapidKey() { return this._send('GET', '/push/vapid'); }
    pushSubscribe(sub) { return this._send('POST', '/push/subscribe', sub); }
    pushUnsubscribe(endpoint) { return this._send('POST', '/push/unsubscribe', { endpoint }); }

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
