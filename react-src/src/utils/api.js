/**
 * Базовый URL для API запросов
 * В продакшене (когда React и Laravel на одном домене) используется относительный путь
 * В разработке можно указать REACT_APP_API_URL в .env для явного указания адреса
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Формирует полный URL для API запроса
 * @param {string} endpoint - путь API (например, '/api/admin/auth/login' или '/admin/auth/login')
 * @returns {string} - полный URL
 */
export const apiUrl = (endpoint) => {
    // Убираем начальный слеш, если он есть
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    if (cleanEndpoint.startsWith('/api/')) {
        cleanEndpoint = cleanEndpoint.substring(4);
    }

    // Если указан базовый URL (dev или prod с явным URL)
    if (API_BASE_URL) {
        // Убираем '/api' с конца API_BASE_URL, если он там есть
        // Это позволяет использовать как 'http://localhost:8000', так и 'http://localhost:8000/api'
        const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
        return `${baseUrl}/api${cleanEndpoint}`;
    }

    // Иначе используем относительный путь (prod или dev с proxy)
    // Laravel автоматически добавит '/api' префикс к роутам из routes/api.php
    return `/api${cleanEndpoint}`;
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
        window.location.reload();
    }

    return response;
};
