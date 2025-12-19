import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl, tokenStorage } from "../../utils/api";
import { useToastContext } from "../../contexts/ToastContext";

function Login() {
    const navigate = useNavigate();
    const toast = useToastContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(apiUrl("/api/admin/auth/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            let data;
            try {
                data = await res.json();
            } catch (jsonError) {
                throw new Error(
                    `Ошибка сервера (код ${res.status}). Проверьте, что Laravel API запущен.`
                );
            }

            if (!res.ok) {
                // Обработка ошибок валидации
                if (data?.error?.details) {
                    const validationErrors = Object.values(data.error.details).flat();
                    throw new Error(
                        validationErrors.join(", ") ||
                        data?.error?.message ||
                        "Ошибка валидации"
                    );
                }
                throw new Error(
                    data?.error?.message || `Ошибка авторизации (код ${res.status})`
                );
            }

            // Проверяем структуру ответа
            if (!data?.data) {
                throw new Error("Неверный формат ответа: отсутствует data");
            }

            const token = data.data.token;
            if (!token) {
                throw new Error("Неверный формат ответа: отсутствует token");
            }

            // Сохраняем токен
            tokenStorage.set(token);
            
            // Проверяем, что токен сохранился
            if (!tokenStorage.has()) {
                throw new Error("Не удалось сохранить токен");
            }

            toast.success("Успешный вход в систему");
            setLoading(false);
            navigate("/admin");
        } catch (e) {
            let errorMessage = "Произошла ошибка при входе";
            if (e instanceof SyntaxError) {
                errorMessage = "Ошибка сервера: неверный формат ответа. Проверьте, что Laravel API запущен.";
            } else if (e.message) {
                errorMessage = e.message;
            }
            setError(errorMessage);
            toast.error(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white">
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 px-7 py-8 w-full max-w-xs rounded-xl bg-white/70 shadow-md border border-blue-100"
            >
                <div className="flex flex-col items-center mb-2">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="10" width="18" height="8" rx="2" fill="#43a3e4" />
                            <circle cx="12" cy="8" r="4" fill="#43a3e4" />
                        </svg>
                    </div>
                    <h2 className="text-center text-xl font-semibold text-blue-700">
                        Вход
                    </h2>
                </div>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full py-2 px-3 border border-blue-200 rounded-md text-base bg-blue-50 text-blue-700 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    autoFocus
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className="w-full py-2 px-3 border border-blue-200 rounded-md text-base bg-blue-50 text-blue-700 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-200 outline-none transition"
                />

                <button
                    type="submit"
                    className="w-full py-2 mt-1 bg-blue-500 hover:bg-blue-600 transition-colors text-white rounded-md font-bold text-[16px] tracking-wide shadow-sm disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? "Входим..." : "Войти"}
                </button>
            </form>
        </div>
    );
}

export default Login;

