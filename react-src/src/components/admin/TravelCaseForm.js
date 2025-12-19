import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";

function TravelCaseForm({ travelCase, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    visa_type_id: "",
    form_template_id: "",
    user_id: "",
    status: "new",
  });
  const [visaTypes, setVisaTypes] = useState([]);
  const [formTemplates, setFormTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVisaTypes();
    if (formData.visa_type_id) {
      loadFormTemplates(formData.visa_type_id);
    }
  }, []);

  useEffect(() => {
    if (travelCase) {
      setFormData({
        visa_type_id: travelCase.visa_type_id || "",
        form_template_id: travelCase.form_template_id || "",
        user_id: travelCase.user_id || "",
        status: travelCase.status || "new",
      });
      if (travelCase.visa_type_id) {
        loadFormTemplates(travelCase.visa_type_id);
      }
    }
  }, [travelCase]);

  useEffect(() => {
    if (formData.visa_type_id) {
      loadFormTemplates(formData.visa_type_id);
      // Сбрасываем выбранный шаблон при смене типа визы
      setFormData((prev) => ({ ...prev, form_template_id: "" }));
    } else {
      setFormTemplates([]);
    }
  }, [formData.visa_type_id]);

  const loadVisaTypes = async () => {
    try {
      const res = await apiRequest("/api/admin/visa-types/active/list");
      if (res.ok) {
        const data = await res.json();
        setVisaTypes(data.data);
      }
    } catch (error) {
      console.error("Ошибка загрузки типов виз:", error);
    }
  };

  const loadFormTemplates = async (visaTypeId) => {
    try {
      const res = await apiRequest(
        `/api/admin/form-templates?visa_type_id=${visaTypeId}&status=active&per_page=100`
      );
      if (res.ok) {
        const data = await res.json();
        setFormTemplates(data.data);
      }
    } catch (error) {
      console.error("Ошибка загрузки шаблонов:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = travelCase
        ? `/api/admin/travel-cases/${travelCase.id}`
        : "/api/admin/travel-cases";
      const method = travelCase ? "PUT" : "POST";

      const payload = {
        ...formData,
        user_id: formData.user_id || null,
      };

      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data?.error?.details) {
          const validationErrors = Object.values(data.error.details).flat();
          throw new Error(validationErrors.join(", "));
        }
        throw new Error(data?.error?.message || "Ошибка при сохранении");
      }

      const responseData = await res.json();
      if (onSuccess) onSuccess(responseData.data);
      if (onClose) onClose();
    } catch (e) {
      setError(e.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-700">
            {travelCase ? "Редактировать заявку" : "Создать заявку"}
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
              Тип визы *
            </label>
            <select
              value={formData.visa_type_id}
              onChange={(e) =>
                setFormData({ ...formData, visa_type_id: e.target.value })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            >
              <option value="">Выберите тип визы</option>
              {visaTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name} ({vt.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Шаблон формы *
            </label>
            <select
              value={formData.form_template_id}
              onChange={(e) =>
                setFormData({ ...formData, form_template_id: e.target.value })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              required
              disabled={!formData.visa_type_id || formTemplates.length === 0}
            >
              <option value="">
                {!formData.visa_type_id
                  ? "Сначала выберите тип визы"
                  : formTemplates.length === 0
                  ? "Нет доступных шаблонов"
                  : "Выберите шаблон формы"}
              </option>
              {formTemplates.map((ft) => (
                <option key={ft.id} value={ft.id}>
                  {ft.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Статус
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="new">Новая</option>
              <option value="filled">Заполнена</option>
              <option value="archived">Архив</option>
            </select>
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

export default TravelCaseForm;


