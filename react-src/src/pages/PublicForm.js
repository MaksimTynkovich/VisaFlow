import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from "../utils/api";

function SearchableSelect({
  id,
  options = [],
  value,
  onChange,
  placeholder,
  hasError,
  ariaDescribedBy,
  ariaInvalid,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const wrapperRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      (options || []).map((option, index) => {
        if (typeof option === "string") {
          return {
            key: `str_${index}_${option}`,
            value: option,
            label: option,
          };
        }
        const optionValue = option?.value ?? option?.label ?? "";
        const optionLabel = option?.label ?? option?.value ?? "";
        return {
          key: `obj_${index}_${optionValue}`,
          value: String(optionValue),
          label: String(optionLabel || optionValue),
        };
      }),
    [options]
  );

  const selectedOption = useMemo(() => {
    const valueStr = value === undefined || value === null ? "" : String(value);
    return normalizedOptions.find((opt) => String(opt.value) === valueStr) || null;
  }, [normalizedOptions, value]);

  const isSimpleMode = useMemo(
    () => normalizedOptions.length > 0 && normalizedOptions.length <= 9,
    [normalizedOptions]
  );

  useEffect(() => {
    setSearchText(selectedOption?.label || "");
  }, [selectedOption?.label]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const query = searchText.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (isSimpleMode) return normalizedOptions;
    if (!query) return normalizedOptions;
    return normalizedOptions.filter((opt) => {
      const label = String(opt.label || "").toLowerCase();
      const optionValue = String(opt.value || "").toLowerCase();
      return label.includes(query) || optionValue.includes(query);
    });
  }, [normalizedOptions, query, isSimpleMode]);

  const shownOptions = filteredOptions.slice(0, 10);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={searchText}
          onFocus={() => setIsOpen(true)}
          onChange={
            isSimpleMode
              ? undefined
              : (e) => {
                  setSearchText(e.target.value);
                  setIsOpen(true);
                }
          }
          readOnly={isSimpleMode}
          className={`w-full py-3 pl-4 pr-10 text-base border rounded-md bg-blue-50 text-blue-700 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all ${
            hasError ? "border-red-400 bg-red-50" : "border-blue-200"
          }`}
          placeholder={placeholder || (isSimpleMode ? "— Выберите вариант —" : "Начните вводить для поиска...")}
          autoComplete="off"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        />
        {!isSimpleMode && selectedOption && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearchText("");
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-7 flex items-center px-1 text-blue-300 hover:text-blue-500 focus:outline-none"
            aria-label="Очистить выбор"
          >
            ✕
          </button>
        )}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-300">
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-blue-200 rounded-md shadow-lg max-h-64 overflow-auto">
          {shownOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-blue-400">Ничего не найдено</div>
          ) : (
            shownOptions.map((opt) => {
              const isSelected = String(value ?? "") === String(opt.value);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSearchText(opt.label);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                    isSelected
                      ? "bg-blue-100 text-blue-800 font-medium"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="ml-2 text-blue-500 text-xs">✓</span>
                  )}
                </button>
              );
            })
          )}
          {filteredOptions.length > 10 && (
            <div className="px-3 py-1.5 text-xs text-blue-400 border-t border-blue-100">
              Показано 10 из {filteredOptions.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [dragActive, setDragActive] = useState({}); // { fieldId: true/false } - состояние drag для каждого поля
  const saveTimeoutRef = useRef(null);
  const preferredInitialStepRef = useRef(null); // Шаг, на котором пользователь заполнял черновик
  const [consentAccepted, setConsentAccepted] = useState(false); // Согласие на обработку персональных данных
  const [consentError, setConsentError] = useState(""); // Ошибка по согласию

  const hasMeaningfulValue = (value) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  };

  const splitFieldsIntoSteps = (fields) => {
    if (!Array.isArray(fields) || fields.length === 0) {
      return [[]];
    }

    const hasSeparators = fields.some((field) => field?.type === "step_separator");
    const steps = [];

    if (hasSeparators) {
      let currentStep = [];
      fields.forEach((field) => {
        if (field?.type === "step_separator") {
          steps.push(currentStep);
          currentStep = [];
          return;
        }
        currentStep.push(field);
      });
      steps.push(currentStep);
    } else {
      const fieldsPerStep = 3; // Backward compatibility for old templates without separators.
      for (let i = 0; i < fields.length; i += fieldsPerStep) {
        steps.push(fields.slice(i, i + fieldsPerStep));
      }
    }

    const normalized = steps.filter((step) => step.length > 0);
    return normalized.length > 0 ? normalized : [[]];
  };

  const findLastFilledStepIndex = (fields, data) => {
    const steps = splitFieldsIntoSteps(fields);
    if (steps.length === 0) {
      return 0;
    }

    let lastFilledStep = 0;
    steps.forEach((stepFields, stepIndex) => {
      const stepHasAnyValue = stepFields.some((field) => {
        const fieldId = field?.name || field?.id;
        if (!fieldId) return false;
        return hasMeaningfulValue(data[fieldId]);
      });

      if (stepHasAnyValue) {
        lastFilledStep = stepIndex;
      }
    });

    return lastFilledStep;
  };

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
          const draftFormData = draftData.data.form_data;

          // 1. Читаем шаг, на котором пользователь последний раз работал (__meta_current_step)
          let preferredStep = null;
          const rawStep = draftFormData.__meta_current_step;
          if (typeof rawStep === "number") {
            preferredStep = rawStep;
          } else if (typeof rawStep === "string" && rawStep.trim() !== "" && !isNaN(rawStep)) {
            preferredStep = parseInt(rawStep, 10);
          }
          preferredInitialStepRef.current =
            Number.isInteger(preferredStep) && preferredStep >= 0 ? preferredStep : null;

          // 2. Применяем данные из черновика поверх инициализированных данных
          //    (кроме служебного __meta_current_step)
          const filteredDraftData = {};
          Object.keys(draftFormData).forEach((key) => {
            if (key === "__meta_current_step") {
              return;
            }
            const value = draftFormData[key];
            if (value !== null && value !== undefined) {
              filteredDraftData[key] = value;
            }
          });

          // Объединяем данные: сначала инициализированные, потом из черновика
          initialFormData = { ...initialFormData, ...filteredDraftData };

          // 3. Загружаем файлы из черновика
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

  // Организация полей в шаги (по разделителям или по 3 для старых шаблонов)
  const organizeFieldsIntoSteps = (fields) => {
    const steps = splitFieldsIntoSteps(fields);
    setFormSteps(steps);

    // Определяем стартовый шаг:
    // 1) если есть preferredInitialStepRef (из черновика) — используем его;
    // 2) иначе — всегда начинаем с шага 0, даже если дальше уже есть предзаполненные данные.
    let initialStep = 0;
    if (Number.isInteger(preferredInitialStepRef.current)) {
      initialStep = Math.max(
        0,
        Math.min(preferredInitialStepRef.current, steps.length - 1)
      );
    }

    setCurrentStep(initialStep);
    preferredInitialStepRef.current = null;
  };

  // Инициализация шагов при загрузке формы:
  // ждём, пока есть схема и хотя бы один раз заполнены formData (после загрузки/черновика)
  useEffect(() => {
    if (travelCase?.form_template?.schema?.fields && formSteps.length === 0) {
      organizeFieldsIntoSteps(travelCase.form_template.schema.fields);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelCase, formData]);

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
        if (
          !fieldId ||
          field.type === "step_separator" ||
          field.type === "hint_block"
        ) {
          return;
        }
        if (field.type === "file") {
          initialData[fieldId] = [];
        } else {
          // Значение по умолчанию (в т.ч. для select)
          let defaultValue = "";
          if (
            field.default !== undefined &&
            field.default !== null &&
            field.default !== ""
          ) {
            defaultValue = field.default;
          } else if (
            field.default_value !== undefined &&
            field.default_value !== null &&
            field.default_value !== ""
          ) {
            // Поддержка альтернативного имени свойства, если оно появится в схемах
            defaultValue = field.default_value;
          }
          initialData[fieldId] = defaultValue;
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
  // Дополнительно сохраняем номер шага, на котором пользователь редактировал поля
  const saveDraft = useCallback(async (data, stepIndex = currentStep) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSavingStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const metaCurrentStep =
          typeof stepIndex === "number" && stepIndex >= 0 ? stepIndex : currentStep;

        await fetch(apiUrl(`/api/public/form/${token}/draft`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            form_data: {
              ...data,
              __meta_current_step: metaCurrentStep,
            },
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

  const getFieldConditions = (field) => {
    if (Array.isArray(field?.when_any) && field.when_any.length > 0) {
      return field.when_any;
    }
    if (field?.when) {
      return [field.when];
    }
    return [];
  };

  const evaluateCondition = (condition, data) => {
    if (!condition?.field) {
      return false;
    }

    const dependentFieldValue = data[condition.field];

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

    return false;
  };

  // Проверка, должно ли поле быть видимым на основе условий
  const isFieldVisible = (field, data = formData) => {
    if (field?.type === "step_separator") {
      return false;
    }
    const conditions = getFieldConditions(field);
    if (conditions.length === 0) {
      return true; // Поле без условий всегда видимо
    }
    // Логика ветвления: поле отображается, если выполнено хотя бы одно условие.
    return conditions.some((condition) => evaluateCondition(condition, data));
  };

  const isImageFile = (file) => {
    if (!file) return false;
    if (typeof file.type === "string" && file.type.startsWith("image/")) {
      return true;
    }
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif|tiff?)$/i.test(file.name || "");
  };

  const uploadSingleFile = async (fieldId, file) => {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("field_id", fieldId);

    const res = await fetch(apiUrl(`/api/public/form/${token}/upload-file`), {
      method: "POST",
      body: uploadFormData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data?.error?.message || "Ошибка при загрузке файла");
    }

    const data = await res.json();
    return {
      id: data.data.id,
      original_name: data.data.original_name,
      file_size: data.data.file_size,
      mime_type: data.data.mime_type,
      url: data.data.url,
    };
  };

  // Обработчик загрузки файлов
  const handleFileUpload = async (fieldId, files, field) => {
    const selectedFiles = Array.from(files || []).filter(Boolean);
    if (selectedFiles.length === 0) {
      return;
    }

    const notImageFile = selectedFiles.find((file) => !isImageFile(file));
    if (notImageFile) {
      setError("Можно загружать только фотографии (изображения). PDF, архивы и другие форматы запрещены.");
      return;
    }

    const allowMultiple = !!field?.file_multiple;
    const existingFiles = uploadedFiles[fieldId] || [];
    if (!allowMultiple && existingFiles.length >= 1) {
      setError("Для этого поля разрешена только одна фотография. Удалите текущий файл перед загрузкой нового.");
      return;
    }

    const filesToUpload = allowMultiple ? selectedFiles : [selectedFiles[0]];
    if (!allowMultiple && selectedFiles.length > 1) {
      setError("Для этого поля можно загрузить только одно фото. Будет использован первый выбранный файл.");
    }

    setUploadingFiles((prev) => ({ ...prev, [fieldId]: true }));
    if (allowMultiple || selectedFiles.length === 1) {
      setError("");
    }

    try {
      const uploadedBatch = [];
      for (const file of filesToUpload) {
        const uploadedFile = await uploadSingleFile(fieldId, file);
        uploadedBatch.push(uploadedFile);
      }

      if (uploadedBatch.length === 0) {
        return;
      }

      // Добавляем файл в список загруженных для этого поля
      setUploadedFiles((prev) => {
        const fieldFiles = allowMultiple ? (prev[fieldId] || []) : [];
        return { ...prev, [fieldId]: [...fieldFiles, ...uploadedBatch] };
      });

      // Обновляем formData для этого поля
      const currentFiles = allowMultiple ? (formData[fieldId] || []) : [];
      const newFileIds = allowMultiple
        ? [...currentFiles, ...uploadedBatch.map((f) => f.id)]
        : [uploadedBatch[0].id];
      const newFormData = { ...formData, [fieldId]: newFileIds };
      setFormData(newFormData);
      // Сохраняем черновик вместе с информацией о том, на каком шаге редактировали
      saveDraft(newFormData, currentStep);
    } catch (e) {
      setError(e.message || "Ошибка при загрузке файла");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  // Обработчики drag and drop
  const handleDrag = (e, fieldId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive((prev) => ({ ...prev, [fieldId]: true }));
    } else if (e.type === "dragleave") {
      setDragActive((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleDrop = (e, fieldId, field) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [fieldId]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(fieldId, e.dataTransfer.files, field);
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
        if (!fieldId || field.type === "step_separator") {
          return;
        }
        const conditions = getFieldConditions(field);
        const dependsOnChangedField = conditions.some((condition) => condition?.field === fieldName);
        if (dependsOnChangedField) {
          // Если поле зависит от изменяемого, проверяем видимость по всему набору условий (OR).
          const shouldBeVisible = isFieldVisible(field, newFormData);

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
    // Сохраняем черновик вместе с номером текущего шага — это и есть
    // "последний шаг, где пользователь редактировал поля"
    saveDraft(newFormData, currentStep);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setConsentError("");
    setSubmitting(true);

    // Отменяем отложенное автосохранение
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Проверяем согласие на обработку персональных данных
    if (!consentAccepted) {
      const consentErrorText =
        "Без согласия на обработку персональных данных дальнейшее заполнение и отправка формы недоступны.";
      setError(consentErrorText);
      setConsentError(consentErrorText);
      setSubmitting(false);

      const consentElement = document.getElementById("consent-checkbox");
      if (consentElement) {
        consentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        consentElement.focus();
      }
      return;
    }

    // Валидация всех полей перед отправкой
    const validationErrors = {};
    if (travelCase?.form_template?.schema?.fields) {
      const visibleFields = travelCase.form_template.schema.fields.filter((field) =>
        isFieldVisible(field)
      );

      visibleFields.forEach((field) => {
        if (field.type === "hint_block") {
          return;
        }
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
      if (field.type === "hint_block") {
        return;
      }
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
    
    // Проверяем согласие на обработку персональных данных
    if (!consentAccepted) {
      const consentErrorText =
        "Без согласия на обработку персональных данных дальнейшее заполнение и отправка формы недоступны.";
      setError(consentErrorText);
      setConsentError(consentErrorText);

      const consentElement = document.getElementById("consent-checkbox");
      if (consentElement) {
        consentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        consentElement.focus();
      }
      return;
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
        if (field.type === "hint_block") {
          const hintId = field.id || field.name || `hint_${index}`;
          return (
            <div
              key={hintId}
              className="mb-6 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3"
              role="note"
            >
              {field.label && (
                <div className="text-sm font-semibold text-blue-800">
                  {field.label}
                </div>
              )}
              {field.description && (
                <div className="text-sm text-blue-700 whitespace-pre-line">
                  {field.description}
                </div>
              )}
            </div>
          );
        }

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
              className="block text-base font-semibold text-blue-700 mb-2"
            >
              {field.label || field.name || `Поле ${index + 1}`}
              {field.required && (
                <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>
              )}
            </label>
            
            {field.description && (
              <p id={`desc-${fieldId}`} className="text-sm text-blue-400 mb-3">
                {field.description}
              </p>
            )}
            
            {field.type === "file" ? (
                <div className="space-y-4">
                  {(() => {
                    const currentFilesCount = (uploadedFiles[fieldId] || []).length;
                    const singleFileLimitReached = !field.file_multiple && currentFilesCount >= 1;
                    return (
                      <>
                  {/* Drag and Drop область */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive[fieldId]
                        ? 'border-blue-500 bg-blue-100'
                        : hasError
                        ? 'border-red-400 bg-red-50'
                        : 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100'
                    }`}
                    onDragEnter={(e) => handleDrag(e, fieldId)}
                    onDragLeave={(e) => handleDrag(e, fieldId)}
                    onDragOver={(e) => handleDrag(e, fieldId)}
                    onDrop={(e) => handleDrop(e, fieldId, field)}
                  >
                    <input
                      id={fieldId}
                      type="file"
                      multiple={!!field.file_multiple}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(fieldId, e.target.files, field);
                        }
                        e.target.value = ""; // Сбрасываем input для возможности повторной загрузки того же файла
                      }}
                      className="hidden"
                      required={field.required && (!formData[fieldId] || formData[fieldId].length === 0)}
                      accept="image/*"
                      aria-describedby={[
                        field.description ? `desc-${fieldId}` : null,
                        hasError ? `error-${fieldId}` : null
                      ].filter(Boolean).join(' ') || undefined}
                      aria-invalid={hasError}
                      disabled={isUploading || singleFileLimitReached}
                    />
                    
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-base font-medium text-blue-600">Загрузка файла...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg
                          className={`w-12 h-12 ${dragActive[fieldId] ? 'text-blue-500' : 'text-blue-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <div>
                          <label
                            htmlFor={fieldId}
                            className={`font-medium underline ${
                              isUploading || singleFileLimitReached
                                ? "cursor-not-allowed text-blue-300"
                                : "cursor-pointer text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            {singleFileLimitReached
                              ? "Файл уже загружен. Удалите текущий, чтобы загрузить новый."
                              : "Нажмите для выбора или перетащите фото сюда"}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  </>
                    );
                  })()}
                  {uploadedFiles[fieldId] && uploadedFiles[fieldId].length > 0 && (
                    <div className="mt-3 space-y-3">
                      {uploadedFiles[fieldId].map((file) => {
                        const isImage = file.mime_type?.startsWith('image/') || file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        const fileSizeKB = file.file_size ? (file.file_size / 1024).toFixed(1) : '0';
                        
                        return (
                          <div
                            key={file.id}
                            className="bg-blue-50 border border-blue-200 rounded-md p-3"
                          >
                            {isImage && file.url ? (
                              <div className="space-y-2">
                                <div className="relative group">
                                  <img
                                    src={file.url}
                                    alt={file.original_name}
                                    className="w-full h-48 object-contain rounded-md border border-blue-200 bg-white"
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
                                      className="w-4 h-4 text-blue-500 flex-shrink-0"
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
                                    <span className="text-sm text-blue-700 truncate">
                                      {file.original_name}
                                    </span>
                                    <span className="text-xs text-blue-400 flex-shrink-0">
                                      {fileSizeKB} KB
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleFileRemove(fieldId, file.id)}
                                    className="ml-2 p-1 text-blue-400 hover:text-red-600 transition-colors"
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
                                    className="w-4 h-4 text-blue-500 flex-shrink-0"
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
                                    {fileSizeKB} KB
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {file.url && (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
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
                <SearchableSelect
                  id={fieldId}
                  options={field.options || []}
                  value={fieldValue}
                  onChange={(nextValue) => handleFieldChange(fieldId, nextValue, field)}
                  placeholder={field.placeholder || "— Выберите вариант —"}
                  hasError={hasError}
                  ariaDescribedBy={[
                    field.description ? `desc-${fieldId}` : null,
                    hasError ? `error-${fieldId}` : null
                  ].filter(Boolean).join(' ') || undefined}
                  ariaInvalid={hasError}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  id={fieldId}
                  value={fieldValue}
                  onChange={(e) => handleFieldChange(fieldId, e.target.value, field)}
                  className={`w-full py-3 px-4 text-base border rounded-md bg-blue-50 text-blue-700 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all resize-y ${
                    hasError ? 'border-red-400 bg-red-50' : 'border-blue-200'
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
                  className={`w-full py-3 px-4 text-base border rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all ${
                    hasError ? 'border-red-400 bg-red-50' : 'border-blue-200'
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-xl font-semibold text-blue-700">Загрузка формы...</p>
          <p className="text-base text-blue-400 mt-2">Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  if (error && !travelCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-10 max-w-md w-full text-center">
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
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Ошибка загрузки</h2>
          <div className="text-lg text-red-600 mb-4 font-medium">{error}</div>
          <p className="text-base text-blue-400 leading-relaxed">
            Проверьте правильность ссылки или обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-10 max-w-md w-full text-center">
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
          <h2 className="text-3xl font-bold text-blue-700 mb-4">
            Форма успешно отправлена!
          </h2>
          <p className="text-lg text-blue-400 leading-relaxed mb-6">
            Ваши данные получены. Мы свяжемся с вами в ближайшее время.
          </p>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
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
  
  // Проверяем, есть ли следующий шаг с видимыми полями - это более надёжная проверка
  // Важно: проверяем это динамически на основе текущего шага
  const nextStepIndex = findNextStepWithVisibleFields(currentStep);
  const hasNextStepWithVisibleFields = nextStepIndex !== null;
  const isLastStep = formSteps.length > 0 && !hasNextStepWithVisibleFields;
  const isFirstStep = formSteps.length > 0 && (currentStep === firstStepWithVisibleFields || findPrevStepWithVisibleFields(currentStep) === null);
  const totalSteps = formSteps.length;

  // Имя контакта для приветствия: сначала из Bitrix-контакта по сделке, потом из предзаполненных полей формы (только имя)
  const buildGreetingName = () => {
    // 1. Пробуем взять из bitrix_contact, который приходит вместе с заявкой
    const bitrixContact = travelCase?.bitrix_contact;
    if (bitrixContact) {
      const firstName =
        bitrixContact.NAME ||
        bitrixContact.name ||
        null;
      if (firstName) {
        return String(firstName).trim();
      }
    }

    // 2. Фоллбек: пробуем взять из предзаполненных полей формы, которые приходят из Bitrix
    const firstNameFromForm =
      formData.first_name ||
      formData.name ||
      formData.NAME ||
      formData.client_first_name ||
      formData.client_name;
    if (firstNameFromForm) {
      return String(firstNameFromForm).trim();
    }

    return "";
  };

  const greetingName = buildGreetingName() || "Пожалуйста";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 px-4 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок и описание формы */}
        {isFirstStep && (
          <div className="mb-10">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-3">
                {greetingName}, заполните анкету для оформления визы
              </h1>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-blue-100 rounded-2xl px-4 py-5 sm:px-8 sm:py-6 shadow-sm">
              <div className="grid gap-4 sm:gap-6 md:grid-cols-3 text-sm text-blue-800">
                <div className="flex flex-col items-start md:items-stretch">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Только нужные данные
                  </div>
                  <p className="leading-relaxed">
                    Мы не запрашиваем ничего лишнего: только данные, которые нужны, чтобы подготовить документы и помочь вам открыть визу.
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-stretch">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Автосохранение
                  </div>
                  <p className="leading-relaxed">
                    Форма автоматически сохраняет введённые данные. Можно закрыть страницу и вернуться к заполнению позже — вся информация останется на месте.
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-stretch">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Можно вернуться позже
                  </div>
                  <p className="leading-relaxed">
                    Даже после отправки формы вы можете вернуться к ней, изменить уже заполненные данные и доотправить необходимые документы.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {totalSteps > 0 && (
          <div className="mb-6 text-center">
            <span className="text-sm text-blue-400">
              Шаг {currentStep + 1} из {totalSteps}
            </span>
          </div>
        )}

        <div className="mb-4 text-center h-6">
          {savingStatus === 'saving' && (
            <div className="inline-flex items-center space-x-2 text-sm text-blue-400">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Сохранение...</span>
            </div>
          )}
        </div>

        {/* Общая ошибка */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Форма */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate>
            {renderFormFields()}

            {/* Согласие на обработку персональных данных */}
            <div
              id="consent-checkbox"
              className="mt-6 pt-4 border-t border-blue-100"
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 border-blue-300 rounded focus:ring-blue-300"
                  checked={consentAccepted}
                  onChange={(e) => {
                    setConsentAccepted(e.target.checked);
                    if (e.target.checked) {
                      setConsentError("");
                      if (error) {
                        setError("");
                      }
                    }
                  }}
                  aria-required="true"
                  aria-invalid={!!consentError}
                />
                <span className="text-sm text-blue-800">
                  Заполняя форму, я подтверждаю, что ознакомлен(а) и принимаю{" "}
                  <a
                    href="https://visavisa.by/prochee/soglasie-na-obrabotku-personalnyix-dannyix.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 hover:text-blue-800"
                  >
                    Согласие на обработку персональных данных
                  </a>{" "}
                  и{" "}
                  <a
                    href="https://visavisa.by/prochee/politika-obrabotki-personalnyix-dannyix.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 hover:text-blue-800"
                  >
                    Политику в отношении обработки персональных данных
                  </a>
                  .
                </span>
              </label>
              {consentError && (
                <p className="mt-2 text-sm text-red-600">{consentError}</p>
              )}
            </div>

            {/* Навигация между шагами */}
            {totalSteps > 1 && (
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-blue-100">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isFirstStep
                      ? 'text-blue-200 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
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
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
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
                    className="px-6 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
                    aria-label="Отправить форму"
                  >
                    {submitting ? "Отправка..." : "Отправить форму"}
                  </button>
                )}
              </div>
            )}

            {/* Кнопка отправки для формы без шагов */}
            {totalSteps <= 1 && (
              <div className="mt-8 pt-6 border-t border-blue-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-blue-500 text-white text-base font-medium rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
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