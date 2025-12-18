import React from "react";

function StatCard({ title, value, icon }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-blue-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{value || "—"}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default StatCard;

