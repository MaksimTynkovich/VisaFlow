import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest, tokenStorage } from "../../utils/api";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await apiRequest("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки пользователя:", error);
    }
  };

  const handleLogout = () => {
    tokenStorage.remove();
    navigate("/admin/login");
  };

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    {
      path: "/admin",
      label: "Главная",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 22V12h6v10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      path: "/admin/visa-types",
      label: "Типы виз",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      path: "/admin/form-templates",
      label: "Шаблоны форм",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      path: "/admin/travel-cases",
      label: "Заявки",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-blue-100 min-h-screen flex flex-col">
      <div className="p-6 flex-1">
        <h1 className="text-xl font-bold text-blue-700 mb-8">VisaVisa</h1>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "bg-blue-500 text-white"
                  : "text-blue-700 hover:bg-blue-50"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-6 border-t border-blue-100">
        {currentUser && (
          <div className="mb-4">
            <p className="text-sm text-blue-400 mb-1">Вошли как</p>
            <p className="text-sm font-medium text-blue-700">
              {currentUser.name || currentUser.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Выйти
        </button>
      </div>
    </div>
  );
}

export default Sidebar;

