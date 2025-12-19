import React from "react";
import { useNavigate } from "react-router-dom";

function QuickActions({ actions = [] }) {
    const navigate = useNavigate();

    const defaultActions = [
        { label: "Управление типами виз", onClick: () => navigate("/admin/visa-types") },
        { label: "Управление шаблонами", onClick: () => navigate("/admin/form-templates") },
        { label: "Просмотр заявок", onClick: () => { } },
        { label: "Настройки системы", onClick: () => { } },
    ];

    const actionsToShow = actions.length > 0 ? actions : defaultActions;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mt-6">
            <h2 className="text-lg font-semibold text-blue-700 mb-4">Быстрые действия</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actionsToShow.map((action, index) => (
                    <button
                        key={index}
                        onClick={action.onClick}
                        className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default QuickActions;

