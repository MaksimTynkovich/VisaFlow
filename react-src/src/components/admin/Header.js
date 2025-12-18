import React from "react";

function Header({ userName, onLogout }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-700">Админ-панель</h1>
                    <p className="text-blue-400 text-sm mt-1">
                        Добро пожаловать, {userName || "Администратор"}
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
                >
                    Выйти
                </button>
            </div>
        </div>
    );
}

export default Header;

