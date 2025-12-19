import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage, apiRequest } from "../../utils/api";

function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = проверка, true = авторизован, false = не авторизован
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Если токена нет, сразу редиректим
            if (!tokenStorage.has()) {
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            // Проверяем валидность токена на сервере
            try {
                const res = await apiRequest("/api/admin/me");
                if (res.ok) {
                    const responseData = await res.json();
                    // AdminUserResource возвращает данные напрямую, не обёрнутые в data
                    const userData = responseData.data || responseData;
                    // Дополнительно проверяем, что пользователь имеет роль admin или manager
                    if (userData && (userData.role === 'admin' || userData.role === 'manager')) {
                        setIsAuthenticated(true);
                    } else {
                        // Пользователь не админ
                        tokenStorage.remove();
                        setIsAuthenticated(false);
                    }
                } else {
                    // Токен невалиден или нет доступа
                    tokenStorage.remove();
                    setIsAuthenticated(false);
                }
            } catch (error) {
                // Ошибка при проверке
                console.error("Ошибка проверки токена:", error);
                tokenStorage.remove();
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Пока проверяем, показываем загрузку
    if (loading || isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white">
                <div className="text-blue-400">Проверка доступа...</div>
            </div>
        );
    }

    // Если не авторизован, редиректим на логин
    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
}

export default ProtectedRoute;

