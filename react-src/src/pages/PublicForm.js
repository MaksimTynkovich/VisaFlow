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
  const [fieldErrors, setFieldErrors] = useState({}); // Валидация полей
  const [savingStatus, setSavingStatus] = useState(null); // 'saving', 'saved', null
  const [uploadingFiles, setUploadingFiles] = useState({}); // { fieldId: true/false }
  const [currentStep, setCurrentStep] = useState(0); // Текущий шаг формы
  const [formSteps, setFormSteps] = useState([]); // Разбитые на шаги поля
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
            
            // Синхронизируем formData с uploadedFiles - обновляем ID файлов в formData
            // Это важно, чтобы formData содержал только те файлы, которые реально загружены
            Object.keys(filesByField).forEach((fieldId) => {
              const fileIds = filesByField[fieldId].map((file) => file.id);
              initialFormData[fieldId] = fileIds;
            });
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
      
      // Разбиваем поля на шаги после загрузки
      if (formData.data.form_template?.schema?.fields) {
        // Используем setTimeout, чтобы убедиться, что состояние обновилось
        setTimeout(() => {
          organizeFieldsIntoSteps(formData.data.form_template.schema.fields);
        }, 0);
      }
    } catch (e) {
      setError(e.message || "Ошибка загрузки формы");
    } finally {
      setLoading(false);
    }
  };

  // Организация полей в шаги (по 3 поля на шаг)
  const organizeFieldsIntoSteps = (fields) => {
    // Сохраняем все поля, видимость будет проверяться динамически при рендеринге
    const steps = [];
    const fieldsPerStep = 3; // Показываем по 3 поля на шаг
    
    for (let i = 0; i < fields.length; i += fieldsPerStep) {
      steps.push(fields.slice(i, i + fieldsPerStep));
    }
    
    // Если нет полей, создаем один пустой шаг
    if (steps.length === 0) {
      steps.push([]);
    }
    
    setFormSteps(steps);
    setCurrentStep(0);
  };

  // Инициализация шагов при загрузке формы
  useEffect(() => {
    if (travelCase?.form_template?.schema?.fields && formSteps.length === 0) {
      organizeFieldsIntoSteps(travelCase.form_template.schema.fields);
    }
  }, [travelCase]);

  // Автоматический переход к первому шагу с видимыми полями при изменении шагов
  useEffect(() => {
    if (formSteps.length > 0) {
      const currentStepFields = formSteps[currentStep] || [];
      const visibleFields = currentStepFields.filter((field) => isFieldVisible(field));
      
      // Если на текущем шаге нет видимых полей, переходим к первому шагу с видимыми полями
      if (visibleFields.length === 0) {
        const firstVisibleStep = findFirstStepWithVisibleFields();
        if (firstVisibleStep !== currentStep && firstVisibleStep !== null) {
          setCurrentStep(firstVisibleStep);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSteps.length, currentStep]);

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

  // Валидация поля
  const validateField = (field, value) => {
    const errors = [];
    
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      errors.push("Это поле обязательно для заполнения");
    }
    
    if (value && field.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push("Введите корректный email адрес");
      }
    }
    
    if (value && field.type === "tel") {
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(value)) {
        errors.push("Введите корректный номер телефона");
      }
    }
    
    if (value && field.type === "number") {
      if (isNaN(value)) {
        errors.push("Введите число");
      }
      if (field.min !== undefined && parseFloat(value) < field.min) {
        errors.push(`Минимальное значение: ${field.min}`);
      }
      if (field.max !== undefined && parseFloat(value) > field.max) {
        errors.push(`Максимальное значение: ${field.max}`);
      }
    }
    
    if (value && field.minLength && value.length < field.minLength) {
      errors.push(`Минимальная длина: ${field.minLength} символов`);
    }
    
    if (value && field.maxLength && value.length > field.maxLength) {
      errors.push(`Максимальная длина: ${field.maxLength} символов`);
    }
    
    return errors;
  };

  // Автосохранение черновика с индикатором
  const saveDraft = useCallback(async (data) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingStatus('saving');

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
        // Убираем индикатор сохранения после успешного сохранения
        setSavingStatus(null);
      } catch (e) {
        console.error("Ошибка автосохранения:", e);
        setSavingStatus(null);
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
    setUploadingFiles((prev) => ({ ...prev, [fieldId]: true }));
    setError("");
    
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
        mime_type: data.data.mime_type,
        url: data.data.url,
      };

      // Добавляем файл в список загруженных для этого поля
      setUploadedFiles((prev) => {
        const fieldFiles = prev[fieldId] || [];
        return { ...prev, [fieldId]: [...fieldFiles, uploadedFile] };
      });

      // Обновляем formData для этого поля
      const currentFiles = formData[fieldId] || [];
      const newFormData = {
        ...formData,
        [fieldId]: [...currentFiles, uploadedFile.id],
      };
      setFormData(newFormData);
      saveDraft(newFormData);
    } catch (e) {
      setError(e.message || "Ошибка при загрузке файла");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldId]: false }));
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
  const handleFieldChange = (fieldName, value, field) => {
    const newFormData = { ...formData, [fieldName]: value };
    
    // Валидация в реальном времени
    if (field) {
      const errors = validateField(field, value);
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: errors.length > 0 ? errors : undefined,
      }));
    }
    
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
            // Очищаем ошибки для скрытого поля
            setFieldErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[fieldId];
              return newErrors;
            });
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

    // Валидация всех полей перед отправкой
    const validationErrors = {};
    if (travelCase?.form_template?.schema?.fields) {
      const visibleFields = travelCase.form_template.schema.fields.filter((field) => 
        isFieldVisible(field)
      );
      
      visibleFields.forEach((field) => {
        const fieldId = field.name || field.id;
        const errors = validateField(field, formData[fieldId]);
        if (errors.length > 0) {
          validationErrors[fieldId] = errors;
        }
      });
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Пожалуйста, исправьте ошибки в форме перед отправкой");
      setSubmitting(false);
      
      // Прокручиваем к первой ошибке
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    try {
      // Собираем ID файлов только из formData (только те, которые указаны в форме)
      // И дополнительно проверяем, что файлы действительно есть в uploadedFiles
      // Файловые поля в formData содержат массивы ID файлов
      const fileIds = [];
      Object.keys(formData).forEach((fieldId) => {
        const fieldValue = formData[fieldId];
        // Если значение - массив чисел, это файловое поле
        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
          // Проверяем, что все элементы массива - числа (ID файлов)
          const ids = fieldValue.filter((id) => {
            // Фильтруем только валидные ID (числа или строки-числа)
            const numId = typeof id === 'number' ? id : (typeof id === 'string' && !isNaN(id) ? parseInt(id, 10) : null);
            if (numId === null || numId <= 0) {
              return false;
            }
            // Дополнительно проверяем, что файл действительно есть в uploadedFiles
            // Это гарантирует, что удаленные файлы не будут отправлены
            const fieldFiles = uploadedFiles[fieldId] || [];
            return fieldFiles.some((file) => file.id === numId);
          });
          fileIds.push(...ids.map((id) => parseInt(id, 10)));
        }
      });
      
      // Удаляем дубликаты
      const uniqueFileIds = [...new Set(fileIds)];

      const res = await fetch(apiUrl(`/api/public/form/${token}/submit`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          payload: formData,
          file_ids: uniqueFileIds,
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

  // Найти следующий шаг с видимыми полями
  const findNextStepWithVisibleFields = (startStep) => {
    if (startStep >= formSteps.length - 1) {
      return null; // Уже на последнем шаге
    }
    
    for (let i = startStep + 1; i < formSteps.length; i++) {
      const stepFields = formSteps[i] || [];
      if (stepFields.length === 0) continue;
      
      const visibleFields = stepFields.filter((field) => {
        if (!field) return false;
        return isFieldVisible(field);
      });
      
      if (visibleFields.length > 0) {
        return i;
      }
    }
    return null; // Нет следующего шага с видимыми полями
  };

  // Найти предыдущий шаг с видимыми полями
  const findPrevStepWithVisibleFields = (startStep) => {
    for (let i = startStep - 1; i >= 0; i--) {
      const stepFields = formSteps[i] || [];
      const visibleFields = stepFields.filter((field) => isFieldVisible(field));
      if (visibleFields.length > 0) {
        return i;
      }
    }
    return null; // Нет предыдущего шага с видимыми полями
  };

  // Найти первый шаг с видимыми полями
  const findFirstStepWithVisibleFields = () => {
    for (let i = 0; i < formSteps.length; i++) {
      const stepFields = formSteps[i] || [];
      const visibleFields = stepFields.filter((field) => isFieldVisible(field));
      if (visibleFields.length > 0) {
        return i;
      }
    }
    return 0;
  };

  // Найти последний шаг с видимыми полями
  const findLastStepWithVisibleFields = () => {
    for (let i = formSteps.length - 1; i >= 0; i--) {
      const stepFields = formSteps[i] || [];
      const visibleFields = stepFields.filter((field) => isFieldVisible(field));
      if (visibleFields.length > 0) {
        return i;
      }
    }
    return 0;
  };

  // Навигация между шагами
  const nextStep = () => {
    const nextStepIndex = findNextStepWithVisibleFields(currentStep);
    if (nextStepIndex !== null) {
      setCurrentStep(nextStepIndex);
      // Прокручиваем вверх при переходе
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    const prevStepIndex = findPrevStepWithVisibleFields(currentStep);
    if (prevStepIndex !== null) {
      setCurrentStep(prevStepIndex);
      // Прокручиваем вверх при переходе
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Валидация текущего шага перед переходом
  const validateCurrentStep = () => {
    if (currentStep >= formSteps.length) return true;
    
    const stepFields = formSteps[currentStep];
    const errors = {};
    let hasErrors = false;
    
    stepFields.forEach((field) => {
      const fieldId = field.name || field.id;
      if (isFieldVisible(field)) {
        const fieldErrors = validateField(field, formData[fieldId]);
        if (fieldErrors.length > 0) {
          errors[fieldId] = fieldErrors;
          hasErrors = true;
        }
      }
    });
    
    if (hasErrors) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
    }
    
    return !hasErrors;
  };

  const handleNext = (e) => {
    // Предотвращаем отправку формы, если это случайно произошло
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (validateCurrentStep()) {
      // Проверяем, есть ли следующий шаг с видимыми полями
      const nextStepIndex = findNextStepWithVisibleFields(currentStep);
      if (nextStepIndex !== null && nextStepIndex < formSteps.length) {
        // Есть следующий шаг - переходим на него
        setCurrentStep(nextStepIndex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Если nextStepIndex === null, значит это действительно последний шаг
      // Остаёмся на текущем шаге, кнопка "Отправить форму" будет показана
    } else {
      // Прокручиваем к первой ошибке
      const firstErrorField = Object.keys(fieldErrors).find(
        (fieldId) => fieldErrors[fieldId] && fieldErrors[fieldId].length > 0
      );
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorElement.focus();
        }
      }
    }
  };

  // Расчет прогресса заполнения формы
  const calculateProgress = () => {
    if (!travelCase?.form_template?.schema?.fields) return 0;
    
    const visibleFields = travelCase.form_template.schema.fields.filter((field) => 
      isFieldVisible(field)
    );
    
    if (visibleFields.length === 0) return 100;
    
    let filledFields = 0;
    visibleFields.forEach((field) => {
      const fieldId = field.name || field.id;
      const value = formData[fieldId];
      
      if (field.required) {
        if (field.type === "file") {
          if (value && Array.isArray(value) && value.length > 0) {
            filledFields++;
          }
        } else if (value !== undefined && value !== null && value !== "") {
          filledFields++;
        }
      } else {
        // Для необязательных полей считаем заполненными, если есть значение
        if (value !== undefined && value !== null && value !== "") {
          filledFields++;
        }
      }
    });
    
    return Math.round((filledFields / visibleFields.length) * 100);
  };

  const renderFormFields = () => {
    if (!travelCase?.form_template?.schema) {
      return (
        <div className="text-gray-700 text-center py-12 text-lg">
          Схема формы не настроена. Обратитесь к администратору.
        </div>
      );
    }

    // Если шаги еще не организованы, показываем все поля
    if (formSteps.length === 0) {
      return (
        <div className="text-gray-700 text-center py-12 text-lg">
          Загрузка полей формы...
        </div>
      );
    }

    // Показываем только поля текущего шага
    const currentStepFields = formSteps[currentStep] || [];
    const visibleFields = currentStepFields.filter((field) => isFieldVisible(field));
    
    // Если на текущем шаге нет видимых полей, автоматически переходим к следующему шагу с видимыми полями
    if (visibleFields.length === 0) {
      const nextStepIndex = findNextStepWithVisibleFields(currentStep);
      if (nextStepIndex !== null) {
        // Используем setTimeout, чтобы избежать проблем с рендерингом
        setTimeout(() => {
          setCurrentStep(nextStepIndex);
        }, 0);
        return (
          <div className="text-gray-700 text-center py-12 text-lg">
            Переход к следующему шагу...
          </div>
        );
      } else {
        // Если нет следующего шага, значит это действительно последний шаг
        return (
          <div className="text-gray-700 text-center py-12 text-lg">
            Все поля заполнены.
          </div>
        );
      }
    }
    
    return visibleFields.map((field, index) => {
        const fieldId = field.name || field.id || `field_${index}`;
        const fieldValue = formData[fieldId] || "";
        const errors = fieldErrors[fieldId];
        const hasError = errors && errors.length > 0;
        const isUploading = uploadingFiles[fieldId];
        
        return (
          <div 
            key={fieldId} 
            className="mb-6"
            role="group"
            aria-labelledby={`label-${fieldId}`}
          >
            <label 
              id={`label-${fieldId}`}
              htmlFor={fieldId}
              className="block text-base font-medium text-gray-900 mb-2"
            >
              {field.label || field.name || `Поле ${index + 1}`}
              {field.required && (
                <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>
              )}
            </label>
            
            {field.description && (
              <p id={`desc-${fieldId}`} className="text-sm text-gray-500 mb-3">
                {field.description}
              </p>
            )}
            
            {field.type === "file" ? (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      id={fieldId}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleFileUpload(fieldId, file);
                        }
                        e.target.value = ""; // Сбрасываем input для возможности повторной загрузки того же файла
                      }}
                      className={`w-full py-3 px-4 text-base border rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                        hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      } file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-800 file:cursor-pointer`}
                      required={field.required && (!formData[fieldId] || formData[fieldId].length === 0)}
                      accept={field.accept || "*/*"}
                      aria-describedby={[
                        field.description ? `desc-${fieldId}` : null,
                        hasError ? `error-${fieldId}` : null
                      ].filter(Boolean).join(' ') || undefined}
                      aria-invalid={hasError}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                        <div className="flex items-center space-x-2 text-blue-600">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-base font-medium">Загрузка...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {uploadedFiles[fieldId] && uploadedFiles[fieldId].length > 0 && (
                    <div className="mt-3 space-y-3">
                      {uploadedFiles[fieldId].map((file) => {
                        const isImage = file.mime_type?.startsWith('image/') || file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        const fileSizeKB = file.file_size ? (file.file_size / 1024).toFixed(1) : '0';
                        
                        return (
                          <div
                            key={file.id}
                            className="bg-gray-50 border border-gray-200 rounded-md p-3"
                          >
                            {isImage && file.url ? (
                              <div className="space-y-2">
                                <div className="relative group">
                                  <img
                                    src={file.url}
                                    alt={file.original_name}
                                    className="w-full h-48 object-contain rounded-md border border-gray-200 bg-white"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-md"
                                    aria-label="Открыть изображение в полном размере"
                                  >
                                    <svg
                                      className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                      />
                                    </svg>
                                  </a>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <svg
                                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    <span className="text-sm text-gray-700 truncate">
                                      {file.original_name}
                                    </span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                      {fileSizeKB} KB
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleFileRemove(fieldId, file.id)}
                                    className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Удалить файл"
                                    aria-label="Удалить файл"
                                  >
                                    <svg
                                      className="w-4 h-4"
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
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <svg
                                    className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                                  <span className="text-sm text-gray-700 truncate">
                                    {file.original_name}
                                  </span>
                                  <span className="text-xs text-gray-400 flex-shrink-0">
                                    {fileSizeKB} KB
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {file.url && (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                      title="Открыть файл"
                                      aria-label="Открыть файл"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleFileRemove(fieldId, file.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Удалить файл"
                                    aria-label="Удалить файл"
                                  >
                                    <svg
                                      className="w-4 h-4"
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
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : field.type === "select" ? (
                <select
                  id={fieldId}
                  value={fieldValue}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, field)}
                  className={`w-full py-3 px-4 text-base border rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                  required={field.required}
                  aria-describedby={[
                    field.description ? `desc-${fieldId}` : null,
                    hasError ? `error-${fieldId}` : null
                  ].filter(Boolean).join(' ') || undefined}
                  aria-invalid={hasError}
                >
                  <option value="">— Выберите вариант —</option>
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
                  id={fieldId}
                  value={fieldValue}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, field)}
                  className={`w-full py-3 px-4 text-base border rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y ${
                    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                  rows={field.rows || 5}
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  aria-describedby={[
                    field.description ? `desc-${fieldId}` : null,
                    hasError ? `error-${fieldId}` : null
                  ].filter(Boolean).join(' ') || undefined}
                  aria-invalid={hasError}
                />
              ) : (
                <input
                  id={fieldId}
                  type={field.type || "text"}
                  value={fieldValue}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, field)}
                  className={`w-full py-3 px-4 text-base border rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  aria-describedby={[
                    field.description ? `desc-${fieldId}` : null,
                    hasError ? `error-${fieldId}` : null
                  ].filter(Boolean).join(' ') || undefined}
                  aria-invalid={hasError}
                />
              )}
              
            {hasError && (
              <div id={`error-${fieldId}`} className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md" role="alert">
                <ul className="list-disc list-inside space-y-0.5">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-800">Загрузка формы...</p>
          <p className="text-base text-gray-600 mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  if (error && !travelCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ошибка загрузки</h2>
          <div className="text-lg text-red-600 mb-4 font-medium">{error}</div>
          <p className="text-base text-gray-600 leading-relaxed">
            Проверьте правильность ссылки или обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-10 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Форма успешно отправлена!
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Ваши данные получены. Мы свяжемся с вами в ближайшее время.
          </p>
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-base text-green-800">
              <strong>Спасибо за заполнение формы!</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Определяем шаги с видимыми полями
  const firstStepWithVisibleFields = formSteps.length > 0 ? findFirstStepWithVisibleFields() : 0;
  const lastStepWithVisibleFields = formSteps.length > 0 ? findLastStepWithVisibleFields() : 0;
  
  // Проверяем, есть ли следующий шаг с видимыми полями - это более надёжная проверка
  // Важно: проверяем это динамически на основе текущего шага
  const nextStepIndex = findNextStepWithVisibleFields(currentStep);
  const hasNextStepWithVisibleFields = nextStepIndex !== null;
  const isLastStep = formSteps.length > 0 && !hasNextStepWithVisibleFields;
  const isFirstStep = formSteps.length > 0 && (currentStep === firstStepWithVisibleFields || findPrevStepWithVisibleFields(currentStep) === null);
  const totalSteps = formSteps.length;

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Минималистичный заголовок */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
            {travelCase?.form_template?.name || "Форма заявки на визу"}
          </h1>
          {travelCase?.visa_type && (
            <p className="text-sm text-gray-500">
              {travelCase.visa_type.name} ({travelCase.visa_type.country})
            </p>
          )}
        </div>

        {/* Индикатор шага */}
        {totalSteps > 0 && (
          <div className="mb-6 text-center">
            <span className="text-sm text-gray-500">
              Шаг {currentStep + 1} из {totalSteps}
            </span>
          </div>
        )}

        {/* Индикатор автосохранения */}
        {savingStatus === 'saving' && (
          <div className="mb-4 text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Сохранение...</span>
            </div>
          </div>
        )}

        {/* Общая ошибка */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Форма */}
        <div className="bg-white">
          <form onSubmit={handleSubmit} noValidate>
            {renderFormFields()}

            {/* Навигация между шагами */}
            {totalSteps > 1 && (
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isFirstStep
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-label="Предыдущий шаг"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Назад</span>
                </button>

                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center space-x-2 px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                    aria-label="Следующий шаг"
                  >
                    <span>Далее</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                    aria-label="Отправить форму"
                  >
                    {submitting ? "Отправка..." : "Отправить форму"}
                  </button>
                )}
              </div>
            )}

            {/* Кнопка отправки для формы без шагов */}
            {totalSteps <= 1 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-gray-900 text-white text-base font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                  aria-label="Отправить форму"
                >
                  {submitting ? "Отправка..." : "Отправить форму"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default PublicForm;