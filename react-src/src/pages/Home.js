import React from "react";

function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Hero Section */}
                <div className="text-center mb-20">
                    <h1 className="text-5xl md:text-6xl font-bold text-blue-700 mb-6">
                        VisaVisa
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-400 max-w-3xl mx-auto mb-8">
                        Современная система для оформления визы
                    </p>
                    <p className="text-lg text-blue-300 max-w-2xl mx-auto">
                        Просто, быстро и безопасно. Оформите визу онлайн за несколько минут.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    stroke="#43a3e4"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-blue-700 mb-3">
                            Быстрое оформление
                        </h3>
                        <p className="text-blue-400 leading-relaxed">
                            Интуитивно понятная форма позволит заполнить все необходимые данные за несколько минут.
                            Никаких сложных процедур и долгого ожидания.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    stroke="#43a3e4"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-blue-700 mb-3">
                            Безопасность данных
                        </h3>
                        <p className="text-blue-400 leading-relaxed">
                            Все ваши персональные данные надёжно защищены современными методами шифрования.
                            Мы гарантируем конфиденциальность и безопасность информации.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-5">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                    stroke="#43a3e4"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-blue-700 mb-3">
                            Онлайн отслеживание
                        </h3>
                        <p className="text-blue-400 leading-relaxed">
                            Отслеживайте статус вашей заявки в реальном времени. Получайте уведомления
                            о каждом изменении статуса обработки.
                        </p>
                    </div>
                </div>

                {/* How it works Section */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-10 mb-20">
                    <h2 className="text-3xl font-bold text-blue-700 text-center mb-12">
                        Как это работает
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                1
                            </div>
                            <h4 className="text-lg font-semibold text-blue-700 mb-2">
                                Выберите тип визы
                            </h4>
                            <p className="text-blue-400 text-sm">
                                Выберите подходящий тип визы из доступных вариантов
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                2
                            </div>
                            <h4 className="text-lg font-semibold text-blue-700 mb-2">
                                Заполните форму
                            </h4>
                            <p className="text-blue-400 text-sm">
                                Заполните все необходимые поля в удобной онлайн-форме
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                3
                            </div>
                            <h4 className="text-lg font-semibold text-blue-700 mb-2">
                                Отправьте заявку
                            </h4>
                            <p className="text-blue-400 text-sm">
                                Проверьте данные и отправьте заявку на обработку
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                4
                            </div>
                            <h4 className="text-lg font-semibold text-blue-700 mb-2">
                                Отслеживайте статус
                            </h4>
                            <p className="text-blue-400 text-sm">
                                Следите за обработкой заявки и получайте уведомления
                            </p>
                        </div>
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8">
                        <h3 className="text-2xl font-bold text-blue-700 mb-4">
                            Почему выбирают нас?
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <svg
                                    className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span className="text-blue-400">
                                    Простой и понятный интерфейс без лишних сложностей
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg
                                    className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span className="text-blue-400">
                                    Поддержка различных типов виз для разных стран
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg
                                    className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span className="text-blue-400">
                                    Быстрая обработка заявок нашими специалистами
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <svg
                                    className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span className="text-blue-400">
                                    Круглосуточный доступ к системе и вашим заявкам
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8">
                        <h3 className="text-2xl font-bold text-blue-700 mb-4">
                            Нужна помощь?
                        </h3>
                        <p className="text-blue-400 mb-6 leading-relaxed">
                            Наша команда готова помочь вам на каждом этапе оформления визовой заявки.
                            Если у вас возникли вопросы или нужна консультация, мы всегда готовы помочь.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <svg
                                    className="w-5 h-5 text-blue-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                                <span className="text-blue-400">info@visavisa.by</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <svg
                                    className="w-5 h-5 text-blue-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                </svg>
                                <span className="text-blue-400">+375 (33) 600-04-17</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-blue-300 text-sm pt-8 border-t border-blue-100">
                    <p>© 2026 VisaVisa. Все права защищены.</p>
                </div>
            </div>
        </div>
    );
}

export default Home;

