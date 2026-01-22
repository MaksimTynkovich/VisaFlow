import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [uploadedFiles, setUploadedFiles] = useState({}); // { fieldId: [file objects] }
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    loadForm();
  }, [token]);

  const loadForm = async () => {
    setLoading(true);
    setError("");
    try {
      // Загружаем форму, последнюю отправку и черновик параллельно
      const [formRes, lastSubmissionRes, draftRes] = await Promise.all([
        fetch(apiUrl(`/api/public/form/${token}`), {
          headers: { Accept: "application/json" },
        }),
        fetch(apiUrl(`/api/public/form/${token}/last-submission`), {
          headers: { Accept: "application/json" },
        }).catch(() => ({ ok: false })), // Игнорируем ошибки загрузки последней отправки
        fetch(apiUrl(`/api/public/form/${token}/draft`), {
          headers: { Accept: "application/json" },
        }).catch(() => ({ ok: false })), // Игнорируем ошибки загрузки черновика
      ]);

      if (!formRes.ok) {
        const data = await formRes.json();
        throw new Error(data?.error?.message || "Форма не найдена");
      }

      const formData = await formRes.json();
      setTravelCase(formData.data);

      // Инициализируем форму на основе схемы
      let initialFormData = {};
      if (formData.data.form_template?.schema) {
        initialFormData = initializeFormData(formData.data.form_template.schema);
      }

      // Приоритет: последняя отправка > черновик > пустая форма
      let hasLastSubmission = false;
      if (lastSubmissionRes && lastSubmissionRes.ok) {
        const submissionData = await lastSubmissionRes.json();
        // Проверяем, что данные действительно есть (не null)
        if (submissionData.data !== null && submissionData.data && submissionData.data.payload) {
          // Используем данные из последней отправки
          hasLastSubmission = true;
          initialFormData = { ...initialFormData, ...submissionData.data.payload };
          // Загружаем файлы из последней отправки
          if (submissionData.data.files) {
            const filesByField = {};
            submissionData.data.files.forEach((file) => {
              if (!filesByField[file.field_id]) {
                filesByField[file.field_id] = [];
              }
              filesByField[file.field_id].push(file);
            });
            setUploadedFiles(filesByField);
          }
        }
      }
      
      // Если нет последней отправки с данными, используем черновик
      if (!hasLastSubmission && draftRes && draftRes.ok) {
        const draftData = await draftRes.json();
        if (draftData.data !== null && draftData.data && draftData.data.form_data) {
          // Применяем данные из черновика поверх инициализированных данных
          // Фильтруем только null и undefined значения, остальное применяем
          const draftFormData = draftData.data.form_data;
          const filteredDraftData = {};
          Object.keys(draftFormData).forEach((key) => {
            const value = draftFormData[key];
            // Применяем значение, если оно не null и не undefined
            if (value !== null && value !== undefined) {
              filteredDraftData[key] = value;
            }
          });
          
          // Объединяем данные: сначала инициализированные, потом из черновика
          initialFormData = { ...initialFormData, ...filteredDraftData };
          
          // Загружаем файлы из черновика
          if (draftData.data.files && Array.isArray(draftData.data.files)) {
            const filesByField = {};
            draftData.data.files.forEach((file) => {
              if (!filesByField[file.field_id]) {
                filesByField[file.field_id] = [];
              }
              filesByField[file.field_id].push(file);
            });
            setUploadedFiles(filesByField);
          }
        }
      }

      setFormData(initialFormData);
    } catch (e) {
      setError(e.message || "Ошибка загрузки формы");
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (schema) => {
    // Простая инициализация формы на основе схемы
    // Если schema содержит fields, создаём пустые значения
    const initialData = {};
    if (schema && schema.fields && Array.isArray(schema.fields)) {
      schema.fields.forEach((field) => {
        const fieldId = field.name || field.id;
        if (field.type === "file") {
          initialData[fieldId] = [];
        } else {
          initialData[fieldId] = "";
        }
      });
    }
    return initialData;
  };

  // Автосохранение черновика с debounce (тихое, без индикаторов)
  const saveDraft = useCallback(async (data) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(apiUrl(`/api/public/form/${token}/draft`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            form_data: data,
          }),
        });
      } catch (e) {
        console.error("Ошибка автосохранения:", e);
      }
    }, 2000); // Сохраняем через 2 секунды после последнего изменения
  }, [token]);

  // Проверка, должно ли поле быть видимым на основе условий
  const isFieldVisible = (field) => {
    if (!field.when) {
      return true; // Поле без условий всегда видимо
    }

    const condition = field.when;
    const dependentFieldValue = formData[condition.field];

    // Если зависимое поле не заполнено, скрываем поле
    if (dependentFieldValue === undefined || dependentFieldValue === null || dependentFieldValue === "") {
      return false;
    }

    // Поддержка оператора equals
    if (condition.equals !== undefined) {
      return dependentFieldValue === condition.equals;
    }

    // Поддержка оператора not_equals
    if (condition.not_equals !== undefined) {
      return dependentFieldValue !== condition.not_equals;
    }

    // Поддержка оператора in (массив значений)
    if (condition.in !== undefined && Array.isArray(condition.in)) {
      return condition.in.includes(dependentFieldValue);
    }

    // Поддержка оператора not_in (массив значений)
    if (condition.not_in !== undefined && Array.isArray(condition.not_in)) {
      return !condition.not_in.includes(dependentFieldValue);
    }

    // Если условие не распознано, показываем поле
    return true;
  };

  // Обработчик загрузки файлов
  const handleFileUpload = async (fieldId, file) => {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('field_id', fieldId);

      const res = await fetch(apiUrl(`/api/public/form/${token}/upload-file`), {
        method: "POST",
        body: uploadFormData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Ошибка при загрузке файла");
      }

      const data = await res.json();
      const uploadedFile = {
        id: data.data.id,
        original_name: data.data.original_name,
        file_size: data.data.file_size,
        url: data.data.url,
      };

      // Добавляем файл в список загруженных для этого поля
      setUploadedFiles((prev) => {
        const fieldFiles = prev[fieldId] || [];
        return { ...prev, [fieldId]: [...fieldFiles, uploadedFile] };
      });

      // Обновляем formData для этого поля
      const currentFiles = formData[fieldId] || [];
      setFormData((prev) => ({
        ...prev,
        [fieldId]: [...currentFiles, uploadedFile.id],
      }));
    } catch (e) {
      setError(e.message || "Ошибка при загрузке файла");
    }
  };

  // Обработчик удаления файла
  const handleFileRemove = (fieldId, fileId) => {
    setUploadedFiles((prev) => {
      const fieldFiles = prev[fieldId] || [];
      return { ...prev, [fieldId]: fieldFiles.filter((f) => f.id !== fileId) };
    });

    setFormData((prev) => {
      const fieldFiles = prev[fieldId] || [];
      return { ...prev, [fieldId]: fieldFiles.filter((id) => id !== fileId) };
    });
  };

  // Обработчик изменения полей формы
  const handleFieldChange = (fieldName, value) => {
    const newFormData = { ...formData, [fieldName]: value };
    
    // Очищаем значения полей, которые стали скрытыми из-за изменения
    if (travelCase?.form_template?.schema?.fields) {
      travelCase.form_template.schema.fields.forEach((field) => {
        const fieldId = field.name || field.id;
        if (field.when && field.when.field === fieldName) {
          // Если это поле зависит от изменяемого поля, проверяем видимость
          const condition = field.when;
          let shouldBeVisible = true;
          
          if (condition.equals !== undefined) {
            shouldBeVisible = value === condition.equals;
          } else if (condition.not_equals !== undefined) {
            shouldBeVisible = value !== condition.not_equals;
          } else if (condition.in !== undefined && Array.isArray(condition.in)) {
            shouldBeVisible = condition.in.includes(value);
          } else if (condition.not_in !== undefined && Array.isArray(condition.not_in)) {
            shouldBeVisible = !condition.not_in.includes(value);
          }
          
          // Если поле должно быть скрыто, очищаем его значение
          if (!shouldBeVisible && newFormData[fieldId]) {
            delete newFormData[fieldId];
            // Также очищаем загруженные файлы для этого поля
            if (field.type === "file") {
              setUploadedFiles((prev) => {
                const newFiles = { ...prev };
                delete newFiles[fieldId];
                return newFiles;
              });
            }
          }
        }
      });
    }
    
    setFormData(newFormData);
    saveDraft(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Отменяем отложенное автосохранение
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      // Собираем все ID загруженных файлов
      const fileIds = Object.values(uploadedFiles)
        .flat()
        .map((file) => file.id);

      const res = await fetch(apiUrl(`/api/public/form/${token}/submit`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          payload: formData,
          file_ids: fileIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Ошибка при отправке формы");
      }

      // Удаляем черновик после успешной отправки
      try {
        await fetch(apiUrl(`/api/public/form/${token}/draft`), {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        });
      } catch (e) {
        // Игнорируем ошибку удаления черновика
      }

      setSuccess(true);
    } catch (e) {
      setError(e.message || "Произошла ошибка при отправке");
    } finally {
      setSubmitting(false);
    }
  };

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
      return schema.fields
        .filter((field) => isFieldVisible(field)) // Фильтруем поля по условиям
        .map((field, index) => {
          const fieldId = field.name || field.id || `field_${index}`;
          
          return (
            <div key={fieldId} className="mb-4">
              <label className="block text-sm font-medium text-blue-700 mb-1">
                {field.label || field.name || `Поле ${index + 1}`}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === "file" ? (
                <div className="space-y-2">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(fieldId, file);
                      }
                      e.target.value = ""; // Сбрасываем input для возможности повторной загрузки того же файла
                    }}
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                    required={field.required && (!formData[fieldId] || formData[fieldId].length === 0)}
                    accept={field.accept || "*/*"}
                  />
                  {uploadedFiles[fieldId] && uploadedFiles[fieldId].length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedFiles[fieldId].map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-2"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <svg
                              className="w-5 h-5 text-blue-500 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="text-sm text-blue-700 truncate">
                              {file.original_name}
                            </span>
                            <span className="text-xs text-blue-400 flex-shrink-0">
                              ({(file.file_size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFileRemove(fieldId, file.id)}
                            className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
        });
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
            onChange={(e) => handleFieldChange("first_name", e.target.value)}
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
            onChange={(e) => handleFieldChange("last_name", e.target.value)}
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
            onChange={(e) => handleFieldChange("email", e.target.value)}
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
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Комментарий
          </label>
          <textarea
            value={formData.comment || ""}
            onChange={(e) => handleFieldChange("comment", e.target.value)}
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


