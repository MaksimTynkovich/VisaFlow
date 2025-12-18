import React, { useState, useEffect } from "react";
import { apiRequest, tokenStorage } from "./utils/api";

function Dashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Загружаем актуальные данные пользователя при монтировании
    if (!currentUser) {
      loadUserData();
    }
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        throw new Error("Не удалось загрузить данные пользователя");
      }
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    tokenStorage.remove();
    if (onLogout) onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">Админ-панель</h1>
              <p className="text-blue-400 text-sm mt-1">
                Добро пожаловать, {currentUser?.name || currentUser?.email || "Администратор"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-700 mb-4">Информация о пользователе</h2>
          {loading ? (
            <div className="text-blue-400">Загрузка...</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-blue-400 w-24">Email:</span>
                <span className="text-blue-700 font-medium">{currentUser?.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400 w-24">Имя:</span>
                <span className="text-blue-700 font-medium">{currentUser?.name || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400 w-24">Роль:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                  {currentUser?.role || "—"}
                </span>
              </div>
              {currentUser?.created_at && (
                <div className="flex items-center gap-3">
                  <span className="text-blue-400 w-24">Создан:</span>
                  <span className="text-blue-700">
                    {new Date(currentUser.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Типы виз</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">—</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="#43a3e4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Заявки</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">—</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="#43a3e4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Шаблоны</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">—</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
                    stroke="#43a3e4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mt-6">
          <h2 className="text-lg font-semibold text-blue-700 mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left">
              Управление типами виз
            </button>
            <button className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left">
              Управление шаблонами
            </button>
            <button className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left">
              Просмотр заявок
            </button>
            <button className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left">
              Настройки системы
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

