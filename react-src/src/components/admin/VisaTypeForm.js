import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import { useToastContext } from "../../contexts/ToastContext";

function VisaTypeForm({ visaType, onClose, onSuccess }) {
  const toast = useToastContext();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    country: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (visaType) {
      setFormData({
        code: visaType.code || "",
        name: visaType.name || "",
        country: visaType.country || "",
        is_active: visaType.is_active ?? true,
      });
    }
  }, [visaType]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.code || formData.code.trim() === "") {
      errors.code = "Код обязателен для заполнения";
    }
    
    if (!formData.name || formData.name.trim() === "") {
      errors.name = "Название обязательно для заполнения";
    }
    
    if (!formData.country || formData.country.trim() === "") {
      errors.country = "Страна обязательна для заполнения";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    if (!validateForm()) {
      toast.error("Пожалуйста, заполните все обязательные поля");
      return;
    }

    setLoading(true);

    try {
      const url = visaType
        ? `/api/admin/visa-types/${visaType.id}`
        : "/api/admin/visa-types";
      const method = visaType ? "PUT" : "POST";

      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data?.error?.details) {
          const serverErrors = {};
          Object.keys(data.error.details).forEach((key) => {
            serverErrors[key] = data.error.details[key][0];
          });
          setValidationErrors(serverErrors);
          throw new Error("Ошибка валидации");
        }
        throw new Error(data?.error?.message || "Ошибка при сохранении");
      }

      toast.success(visaType ? "Тип визы успешно обновлён" : "Тип визы успешно создан");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      setError(e.message || "Произошла ошибка");
      if (!validationErrors || Object.keys(validationErrors).length === 0) {
        toast.error(e.message || "Произошла ошибка при сохранении");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-700">
            {visaType ? "Редактировать тип визы" : "Создать тип визы"}
          </h2>
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-600"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Код *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => {
                setFormData({ ...formData, code: e.target.value });
                setValidationErrors({ ...validationErrors, code: "" });
              }}
              className={`w-full py-2 px-3 border rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none ${
                validationErrors.code ? "border-red-300" : "border-blue-200"
              }`}
              required
              placeholder="SCHENGEN_TOURIST"
            />
            {validationErrors.code && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.code}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Название *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setValidationErrors({ ...validationErrors, name: "" });
              }}
              className={`w-full py-2 px-3 border rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none ${
                validationErrors.name ? "border-red-300" : "border-blue-200"
              }`}
              required
              placeholder="Шенгенская туристическая"
            />
            {validationErrors.name && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Страна *
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => {
                setFormData({ ...formData, country: e.target.value });
                setValidationErrors({ ...validationErrors, country: "" });
              }}
              className={`w-full py-2 px-3 border rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none ${
                validationErrors.country ? "border-red-300" : "border-blue-200"
              }`}
              required
              placeholder="Германия"
            />
            {validationErrors.country && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.country}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-200"
            />
            <label htmlFor="is_active" className="text-sm text-blue-700">
              Активен
            </label>
          </div>

          {error && (
            <div className="text-red-500 bg-red-50 rounded py-2 px-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VisaTypeForm;

