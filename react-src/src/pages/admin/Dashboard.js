import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import { useUser } from "../../contexts/UserContext";
import UserInfoCard from "../../components/admin/UserInfoCard";
import StatCard from "../../components/admin/StatCard";
import QuickActions from "../../components/admin/QuickActions";

function Dashboard() {
    const { currentUser } = useUser();
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadStatistics = async () => {
            try {
                const res = await apiRequest("/api/admin/statistics");
                if (!isMounted) return;

                if (res.ok) {
                    const data = await res.json();
                    setStatistics(data.data);
                }
            } catch (error) {
                console.error("Ошибка загрузки статистики:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadStatistics();

        return () => {
            isMounted = false;
        };
    }, []);

    const visaIcon = (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#43a3e4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    const caseIcon = (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                stroke="#43a3e4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    const templateIcon = (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
                stroke="#43a3e4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-blue-700">Главная панель</h1>
            </div>
            <UserInfoCard user={currentUser} loading={loading} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Типы виз"
                    value={
                        loading
                            ? "Загрузка..."
                            : statistics
                            ? `${statistics.visa_types.active} / ${statistics.visa_types.total}`
                            : "—"
                    }
                    subtitle={statistics ? "активных из всего" : ""}
                    icon={visaIcon}
                />
                <StatCard
                    title="Заявки"
                    value={
                        loading
                            ? "Загрузка..."
                            : statistics
                            ? statistics.travel_cases.total
                            : "—"
                    }
                    subtitle={
                        statistics
                            ? `${statistics.travel_cases.new} новых, ${statistics.travel_cases.filled} заполнено`
                            : ""
                    }
                    icon={caseIcon}
                />
                <StatCard
                    title="Шаблоны"
                    value={
                        loading
                            ? "Загрузка..."
                            : statistics
                            ? `${statistics.form_templates.active} / ${statistics.form_templates.total}`
                            : "—"
                    }
                    subtitle={statistics ? "активных из всего" : ""}
                    icon={templateIcon}
                />
            </div>

            <QuickActions />
        </>
    );
}

export default Dashboard;

