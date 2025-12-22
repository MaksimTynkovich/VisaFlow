import React, { useState } from "react";

function FormPreview({ schema }) {
  const [formData, setFormData] = useState({});

  // Проверка, должно ли поле быть видимым
  const isFieldVisible = (field) => {
    if (!field.when) {
      return true;
    }

    const condition = field.when;
    const dependentFieldValue = formData[condition.field];

    if (dependentFieldValue === undefined || dependentFieldValue === null || dependentFieldValue === "") {
      return false;
    }

    if (condition.equals !== undefined) {
      return dependentFieldValue === condition.equals;
    }

    if (condition.not_equals !== undefined) {
      return dependentFieldValue !== condition.not_equals;
    }

    if (condition.in !== undefined && Array.isArray(condition.in)) {
      return condition.in.includes(dependentFieldValue);
    }

    if (condition.not_in !== undefined && Array.isArray(condition.not_in)) {
      return !condition.not_in.includes(dependentFieldValue);
    }

    return true;
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData({ ...formData, [fieldId]: value });
  };

  if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
    return (
      <div className="text-center py-8 text-blue-400 border-2 border-dashed border-blue-200 rounded-md">
        <p>Добавьте поля в схему для предпросмотра</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-700 mb-4">Предпросмотр формы</h3>
      <div className="bg-white rounded-lg border border-blue-200 p-6">
        {schema.fields
          .filter((field) => isFieldVisible(field))
          .map((field, index) => {
            const fieldId = field.id || field.name || `field_${index}`;

            return (
              <div key={fieldId} className="mb-4">
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  {field.label || fieldId}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === "file" ? (
                  <input
                    type="file"
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                    required={field.required}
                    accept={field.accept || "*/*"}
                    disabled
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[fieldId] || ""}
                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                    required={field.required}
                  >
                    <option value="">Выберите...</option>
                    {field.options &&
                      field.options.map((option, optIndex) => {
                        const optionValue =
                          typeof option === "string" ? option : option.value;
                        const optionLabel =
                          typeof option === "string" ? option : option.label;
                        return (
                          <option key={optIndex} value={optionValue}>
                            {optionLabel || optionValue}
                          </option>
                        );
                      })}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={formData[fieldId] || ""}
                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                    rows={field.rows || 4}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={formData[fieldId] || ""}
                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                )}

                {field.description && (
                  <p className="text-xs text-blue-400 mt-1">{field.description}</p>
                )}
              </div>
            );
          })}

        {schema.fields.filter((field) => isFieldVisible(field)).length === 0 && (
          <div className="text-center py-8 text-blue-400">
            <p>Нет видимых полей. Заполните зависимые поля для отображения.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FormPreview;

