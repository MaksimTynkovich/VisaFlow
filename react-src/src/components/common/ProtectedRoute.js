import React from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage } from "../../utils/api";
import { useUser } from "../../contexts/UserContext";

function ProtectedRoute({ children }) {
    const { currentUser, loading } = useUser();

    // Пока загружаем, показываем загрузку
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white">
                <div className="text-blue-400">Проверка доступа...</div>
            </div>
        );
    }

    // Если токена нет или пользователь не авторизован, редиректим на логин
    if (!tokenStorage.has() || !currentUser) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
}

export default ProtectedRoute;

