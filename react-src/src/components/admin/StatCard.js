import React from "react";

function StatCard({ title, value, subtitle, icon }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-blue-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{value || "—"}</p>
                    {subtitle && (
                        <p className="text-xs text-blue-400 mt-1">{subtitle}</p>
                    )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default StatCard;

