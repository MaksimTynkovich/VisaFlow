/**
 * Базовый URL для API запросов
 * В продакшене (когда React и Laravel на одном домене) используется относительный путь
 * В разработке можно указать REACT_APP_API_URL в .env для явного указания адреса
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Формирует полный URL для API запроса
 * @param {string} endpoint - путь API (например, '/api/admin/auth/login')
 * @returns {string} - полный URL
 */
export const apiUrl = (endpoint) => {
    // Убираем начальный слеш, если он есть, чтобы избежать двойных слешей
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Если указан базовый URL (dev), используем его
    if (API_BASE_URL) {
        return `${API_BASE_URL}${cleanEndpoint}`;
    }

    // Иначе используем относительный путь (prod или dev с proxy)
    return cleanEndpoint;
};

/**
 * Работа с токеном авторизации
 */
const TOKEN_KEY = 'admin_token';

export const tokenStorage = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    remove: () => localStorage.removeItem(TOKEN_KEY),
    has: () => !!localStorage.getItem(TOKEN_KEY),
};

/**
 * Выполняет авторизованный API запрос с автоматической подстановкой токена
 * @param {string} endpoint - путь API
 * @param {RequestInit} options - опции fetch (method, body, headers и т.д.)
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}) => {
    const token = tokenStorage.get();

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
    };

    // Добавляем токен в заголовок Authorization, если он есть
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(apiUrl(endpoint), {
        ...options,
        headers,
    });

    // Если токен невалиден (401), удаляем его
    if (response.status === 401) {
        tokenStorage.remove();
        // Можно добавить редирект на страницу входа
        window.location.reload();
    }

    return response;
};

