import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from "../utils/api";

function PublicForm() {
  const { token } = useParams();
  const [travelCase, setTravelCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadForm();
  }, [token]);

  const loadForm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl(`/api/public/form/${token}`), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Заявка не найдена");
      }

      const data = await res.json();
      setTravelCase(data.data);

      // Инициализируем форму на основе схемы
      if (data.data.form_template?.schema) {
        initializeForm(data.data.form_template.schema);
      }
    } catch (e) {
      setError(e.message || "Ошибка загрузки формы");
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (schema) => {
    // Простая инициализация формы на основе схемы
    // Если schema содержит fields, создаём пустые значения
    if (schema && schema.fields && Array.isArray(schema.fields)) {
      const initialData = {};
      schema.fields.forEach((field) => {
        initialData[field.name || field.id] = "";
      });
      setFormData(initialData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(apiUrl(`/api/public/form/${token}/submit`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ payload: formData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Ошибка при отправке формы");
      }

      setSuccess(true);
    } catch (e) {
      setError(e.message || "Произошла ошибка при отправке");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormFields = () => {
    if (!travelCase?.form_template?.schema) {
      return (
        <div className="text-blue-400 text-center py-8">
          Схема формы не настроена. Обратитесь к администратору.
        </div>
      );
    }

    const schema = travelCase.form_template.schema;

    // Если есть структурированные поля
    if (schema.fields && Array.isArray(schema.fields)) {
      return schema.fields.map((field, index) => (
        <div key={index} className="mb-4">
          <label className="block text-sm font-medium text-blue-700 mb-1">
            {field.label || field.name || `Поле ${index + 1}`}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              value={formData[field.name || field.id] || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [field.name || field.id]: e.target.value,
                })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              rows={field.rows || 4}
              required={field.required}
              placeholder={field.placeholder}
            />
          ) : (
            <input
              type={field.type || "text"}
              value={formData[field.name || field.id] || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [field.name || field.id]: e.target.value,
                })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              required={field.required}
              placeholder={field.placeholder}
            />
          )}
          {field.description && (
            <p className="text-xs text-blue-400 mt-1">{field.description}</p>
          )}
        </div>
      ));
    }

    // Если схема простая (просто объект), создаём базовые поля
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Имя *
          </label>
          <input
            type="text"
            value={formData.first_name || ""}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Фамилия *
          </label>
          <input
            type="text"
            value={formData.last_name || ""}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Телефон
          </label>
          <input
            type="tel"
            value={formData.phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Комментарий
          </label>
          <textarea
            value={formData.comment || ""}
            onChange={(e) =>
              setFormData({ ...formData, comment: e.target.value })
            }
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            rows="4"
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-blue-400">Загрузка формы...</div>
      </div>
    );
  }

  if (error && !travelCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <p className="text-blue-400 text-sm">
            Проверьте правильность ссылки или обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-blue-700 mb-2">
            Форма успешно отправлена!
          </h2>
          <p className="text-blue-400">
            Ваши данные получены. Мы свяжемся с вами в ближайшее время.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-blue-700 mb-2">
              {travelCase?.form_template?.name || "Форма заявки на визу"}
            </h1>
            {travelCase?.visa_type && (
              <p className="text-blue-400">
                Тип визы: {travelCase.visa_type.name} ({travelCase.visa_type.country})
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 text-red-500 bg-red-50 rounded py-2 px-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderFormFields()}

            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? "Отправка..." : "Отправить форму"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PublicForm;


