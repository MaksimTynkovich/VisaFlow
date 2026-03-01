import React, { useState, useEffect } from "react";
import { apiRequest } from "../../utils/api";
import { useToastContext } from "../../contexts/ToastContext";
import SchemaEditor from "./SchemaEditor";

function FormTemplateForm({ formTemplate, onClose, onSuccess }) {
  const toast = useToastContext();
  const [formData, setFormData] = useState({
    visa_type_id: "",
    name: "",
    schema: null,
    status: "draft",
  });
  const [schemaText, setSchemaText] = useState("");
  const [schemaError, setSchemaError] = useState("");
  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [editorMode, setEditorMode] = useState("visual"); // "visual" или "json"

  useEffect(() => {
    loadVisaTypes();
    if (formTemplate) {
      const schema = formTemplate.schema || null;
      setFormData({
        visa_type_id: formTemplate.visa_type_id || "",
        name: formTemplate.name || "",
        schema: schema,
        status: formTemplate.status || "draft",
      });
      setSchemaText(
        schema
          ? JSON.stringify(schema, null, 2)
          : ""
      );
    } else {
      // При создании нового шаблона
      setFormData({
        visa_type_id: "",
        name: "",
        schema: null,
        status: "draft",
      });
      setSchemaText("");
    }
  }, [formTemplate]);

  // Синхронизация визуального редактора с JSON
  const handleSchemaChange = (newSchema) => {
    setSchemaText(JSON.stringify(newSchema, null, 2));
    setFormData({ ...formData, schema: newSchema });
  };

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

  const validateForm = () => {
    const errors = {};
    
    if (!formData.visa_type_id) {
      errors.visa_type_id = "Выберите тип визы";
    }
    
    if (!formData.name || formData.name.trim() === "") {
      errors.name = "Название обязательно для заполнения";
    }

    // Проверяем JSON схему
    if (schemaText.trim()) {
      try {
        const parsed = JSON.parse(schemaText);
        
        // Валидация структуры схемы
        if (parsed.fields && Array.isArray(parsed.fields)) {
          const fieldIds = new Set();
          parsed.fields.forEach((field, index) => {
            const fieldId = field.name || field.id || `field_${index}`;
            
            // Проверка на дубликаты ID
            if (fieldIds.has(fieldId)) {
              errors.schema = `Дублирующийся ID поля: ${fieldId}`;
            }
            fieldIds.add(fieldId);
            
            // Валидация условий
            if (field.when) {
              if (!field.when.field) {
                errors.schema = `Поле ${fieldId}: условие 'when' должно содержать 'field'`;
              }
              if (
                field.when.equals === undefined &&
                field.when.not_equals === undefined &&
                field.when.in === undefined &&
                field.when.not_in === undefined
              ) {
                errors.schema = `Поле ${fieldId}: условие 'when' должно содержать оператор (equals, not_equals, in, not_in)`;
              }
              // Проверка, что зависимое поле существует
              if (field.when.field) {
                const dependentFieldExists = parsed.fields.some(
                  (f) => (f.name || f.id) === field.when.field
                );
                if (!dependentFieldExists) {
                  errors.schema = `Поле ${fieldId}: зависимое поле '${field.when.field}' не найдено`;
                }
              }
            }

            if (Array.isArray(field.when_any)) {
              if (field.when_any.length === 0) {
                errors.schema = `Поле ${fieldId}: 'when_any' не должен быть пустым`;
              }
              field.when_any.forEach((condition, conditionIndex) => {
                if (!condition || typeof condition !== "object") {
                  errors.schema = `Поле ${fieldId}: условие when_any[${conditionIndex}] должно быть объектом`;
                  return;
                }

                if (!condition.field) {
                  errors.schema = `Поле ${fieldId}: условие when_any[${conditionIndex}] должно содержать 'field'`;
                }

                if (
                  condition.equals === undefined &&
                  condition.not_equals === undefined &&
                  condition.in === undefined &&
                  condition.not_in === undefined
                ) {
                  errors.schema = `Поле ${fieldId}: условие when_any[${conditionIndex}] должно содержать оператор (equals, not_equals, in, not_in)`;
                }

                if (condition.field) {
                  const dependentFieldExists = parsed.fields.some(
                    (f) => (f.name || f.id) === condition.field
                  );
                  if (!dependentFieldExists) {
                    errors.schema = `Поле ${fieldId}: зависимое поле '${condition.field}' не найдено`;
                  }
                }
              });
            }
            
            // Проверка select полей
            if (field.type === "select" && !field.options) {
              errors.schema = `Поле ${fieldId}: select поле должно содержать 'options'`;
            }
          });
        }
      } catch (parseError) {
        errors.schema = `Невалидный JSON: ${parseError.message}`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSchemaError("");
    setValidationErrors({});

    if (!validateForm()) {
      toast.error("Пожалуйста, исправьте ошибки в форме");
      return;
    }

    setLoading(true);

    // Парсим JSON схему перед отправкой
    let parsedSchema = null;
    if (schemaText.trim()) {
      try {
        parsedSchema = JSON.parse(schemaText);
      } catch (parseError) {
        setSchemaError("Невалидный JSON. Исправьте ошибки в схеме.");
        toast.error("Невалидный JSON в схеме");
        setLoading(false);
        return;
      }
    }

    try {
      const url = formTemplate
        ? `/api/admin/form-templates/${formTemplate.id}`
        : "/api/admin/form-templates";
      const method = formTemplate ? "PUT" : "POST";

      const payload = {
        ...formData,
        schema: parsedSchema,
      };

      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
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

      toast.success(formTemplate ? "Шаблон успешно обновлён" : "Шаблон успешно создан");
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
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-700">
            {formTemplate ? "Редактировать шаблон" : "Создать шаблон формы"}
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
              onChange={(e) => {
                setFormData({ ...formData, visa_type_id: e.target.value });
                setValidationErrors({ ...validationErrors, visa_type_id: "" });
              }}
              className={`w-full py-2 px-3 border rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none ${
                validationErrors.visa_type_id ? "border-red-300" : "border-blue-200"
              }`}
              required
            >
              <option value="">Выберите тип визы</option>
              {visaTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name} ({vt.country})
                </option>
              ))}
            </select>
            {validationErrors.visa_type_id && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.visa_type_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Название шаблона *
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
              placeholder="Основная форма для туристической визы"
            />
            {validationErrors.name && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Статус *
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            >
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="archived">Архив</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-blue-700">
                Схема формы
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditorMode("visual")}
                  className={`px-3 py-1 rounded text-sm ${
                    editorMode === "visual"
                      ? "bg-blue-500 text-white"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  Визуальный редактор
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorMode("json");
                    // Синхронизируем JSON при переключении
                    if (formData.schema) {
                      setSchemaText(JSON.stringify(formData.schema, null, 2));
                    }
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    editorMode === "json"
                      ? "bg-blue-500 text-white"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  JSON редактор
                </button>
              </div>
            </div>

            {editorMode === "visual" ? (
              <div className="border border-blue-200 rounded-md p-4 bg-blue-50">
                <SchemaEditor
                  schema={formData.schema || { fields: [] }}
                  onChange={handleSchemaChange}
                />
              </div>
            ) : (
              <>
                <textarea
                  value={schemaText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setSchemaText(text);
                    setSchemaError("");

                    // Проверяем валидность JSON в реальном времени (не блокируем ввод)
                    if (text.trim()) {
                      try {
                        JSON.parse(text);
                      } catch {
                        // JSON невалиден, но не показываем ошибку пока пользователь не попытается сохранить
                      }
                    }
                  }}
                  className={`w-full py-2 px-3 border rounded-md bg-blue-50 text-blue-700 focus:ring-2 outline-none font-mono text-sm ${
                    schemaError
                      ? "border-red-300 focus:ring-red-200"
                      : "border-blue-200 focus:ring-blue-200"
                  }`}
                  rows="8"
                  placeholder='{"fields": []}'
                />
                <div className="mt-2 text-xs text-blue-500 bg-blue-50 p-3 rounded border border-blue-200">
              <p className="font-semibold mb-2">Пример схемы с условиями:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "fields": [
    {
      "id": "phone",
      "type": "tel",
      "label": "Телефон",
      "required": true,
      "placeholder": "+7 (999) 123-45-67"
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email",
      "required": true,
      "placeholder": "example@mail.ru"
    },
    {
      "id": "document_type",
      "type": "select",
      "label": "Тип документа",
      "required": true,
      "options": [
        {"value": "passport", "label": "Паспорт"},
        {"value": "id_card_biometric", "label": "ID карта + биометрический"}
      ]
    },
    {
      "id": "passport_number",
      "type": "text",
      "label": "Номер паспорта",
      "required": true,
      "when": {
        "field": "document_type",
        "equals": "passport"
      }
    },
    {
      "id": "id_card_number",
      "type": "text",
      "label": "Номер ID карты",
      "required": true,
      "when": {
        "field": "document_type",
        "equals": "id_card_biometric"
      }
    },
    {
      "id": "registration",
      "type": "text",
      "label": "Прописка",
      "required": true,
      "when": {
        "field": "document_type",
        "equals": "id_card_biometric"
      }
    }
  ]
}`}
              </pre>
                </div>
                {(schemaError || validationErrors.schema) && (
                  <p className="text-xs text-red-500 mt-1">{schemaError || validationErrors.schema}</p>
                )}
                {!schemaError && !validationErrors.schema && (
                  <p className="text-xs text-blue-400 mt-1">
                    Введите валидный JSON. Поддерживаются условия "when" для условного отображения полей.
                  </p>
                )}
              </>
            )}
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

export default FormTemplateForm;

