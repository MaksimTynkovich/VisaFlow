import React from "react";

function UserInfoCard({ user, loading }) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-blue-700 mb-4">
                    Информация о пользователе
                </h2>
                <div className="text-blue-400">Загрузка...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-700 mb-4">
                Информация о пользователе
            </h2>
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <span className="text-blue-400 w-24">Email:</span>
                    <span className="text-blue-700 font-medium">{user?.email || "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-blue-400 w-24">Имя:</span>
                    <span className="text-blue-700 font-medium">{user?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-blue-400 w-24">Роль:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        {user?.role || "—"}
                    </span>
                </div>
                {user?.created_at && (
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400 w-24">Создан:</span>
                        <span className="text-blue-700">
                            {new Date(user.created_at).toLocaleDateString("ru-RU")}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserInfoCard;

