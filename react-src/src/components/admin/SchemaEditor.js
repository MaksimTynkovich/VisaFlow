import React, { useState, useEffect } from "react";
import FormPreview from "./FormPreview";
import { apiRequest } from "../../utils/api";

const FIELD_TYPES = [
  { value: "text", label: "Текст" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Телефон" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "select", label: "Выбор" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "file", label: "Файл" },
  { value: "step_separator", label: "Разделитель шага" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Равно" },
  { value: "not_equals", label: "Не равно" },
  { value: "in", label: "Одно из значений" },
  { value: "not_in", label: "Не одно из значений" },
];

const createEmptyCondition = () => ({ field: "", equals: "" });

const getConditionOperator = (condition = {}) => {
  if (condition.equals !== undefined) return "equals";
  if (condition.not_equals !== undefined) return "not_equals";
  if (condition.in !== undefined) return "in";
  if (condition.not_in !== undefined) return "not_in";
  return "";
};

const getConditionValue = (condition = {}) => {
  const operator = getConditionOperator(condition);
  if (operator === "equals") return condition.equals ?? "";
  if (operator === "not_equals") return condition.not_equals ?? "";
  if (operator === "in") return Array.isArray(condition.in) ? condition.in.join(", ") : "";
  if (operator === "not_in") return Array.isArray(condition.not_in) ? condition.not_in.join(", ") : "";
  return "";
};

function SchemaEditor({ schema, onChange }) {
  const [fields, setFields] = useState(schema?.fields || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [bitrixContactFields, setBitrixContactFields] = useState([]);

  const loadBitrixFields = (refresh = false) => {
    const url = refresh ? "/api/admin/bitrix/contact-fields?refresh=1" : "/api/admin/bitrix/contact-fields";
    apiRequest(url)
      .then((res) => res.ok && res.json())
      .then((data) => data?.data && setBitrixContactFields(data.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadBitrixFields(false);
  }, []);

  // Синхронизируем fields при изменении schema извне
  React.useEffect(() => {
    if (schema?.fields && Array.isArray(schema.fields)) {
      setFields(schema.fields);
    } else if (!schema?.fields) {
      setFields([]);
    }
  }, [schema]);

  const updateFields = (newFields) => {
    setFields(newFields);
    onChange({ fields: newFields });
  };

  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "",
      required: false,
    };
    const newFields = [...fields, newField];
    updateFields(newFields);
    setEditingIndex(newFields.length - 1);
  };

  const updateField = (index, updates) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateFields(newFields);
  };

  const deleteField = (index) => {
    const newFields = fields.filter((_, i) => i !== index);
    updateFields(newFields);
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const moveField = (fromIndex, toIndex) => {
    const newFields = [...fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    updateFields(newFields);
  };

  const getAvailableFields = (currentIndex) => {
    return fields
      .map((field, index) => ({
        id: field.id || field.name,
        label: field.label || field.id || field.name || `Поле ${index + 1}`,
        index,
      }))
      .filter((f) => f.index < currentIndex && fields[f.index]?.type !== "step_separator"); // Только обычные поля, которые идут раньше
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-700">Поля формы</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
          >
            {showPreview ? "Скрыть" : "Показать"} предпросмотр
          </button>
          <button
            type="button"
            onClick={addField}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            + Добавить поле
          </button>
          <button
            type="button"
            onClick={() => loadBitrixFields(true)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
            title={
              bitrixContactFields.length > 0
                ? "Обновить список полей из Bitrix24 после добавления/удаления полей в контактах"
                : "Загрузить список полей контакта из Bitrix24 (нужен настроенный webhook)"
            }
          >
            {bitrixContactFields.length > 0 ? "Обновить поля Bitrix" : "Загрузить поля Bitrix"}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="mb-4 border-t border-blue-200 pt-4">
          <FormPreview schema={{ fields }} />
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => (
          <FieldEditor
            key={field.id || index}
            field={field}
            index={index}
            isEditing={editingIndex === index}
            onEdit={() => setEditingIndex(index)}
            onCancel={() => setEditingIndex(null)}
            onUpdate={(updates) => updateField(index, updates)}
            onDelete={() => deleteField(index)}
            onMoveUp={index > 0 ? () => moveField(index, index - 1) : null}
            onMoveDown={
              index < fields.length - 1 ? () => moveField(index, index + 1) : null
            }
            availableFields={getAvailableFields(index)}
            bitrixContactFields={bitrixContactFields}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 text-blue-400 border-2 border-dashed border-blue-200 rounded-md">
          <p>Нет полей. Нажмите "Добавить поле" чтобы начать.</p>
        </div>
      )}
    </div>
  );
}

function SelectOptionsEditor({ options, onChange, showBitrixSecondValue = false }) {
  const normalizedOptions = React.useMemo(
    () =>
      (options || []).map((opt) => {
        if (typeof opt === "string") {
          return { value: opt, label: opt };
        }
        const base = {
          value: opt.value ?? opt.label ?? "",
          label: opt.label ?? opt.value ?? "",
        };
        if (typeof opt.bitrix_second_value !== "undefined") {
          base.bitrix_second_value = opt.bitrix_second_value ?? "";
        }
        return base;
      }),
    [options]
  );

  const updateOption = (index, updates) => {
    const next = [...normalizedOptions];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addOption = () => {
    onChange([...normalizedOptions, { value: "", label: "" }]);
  };

  const removeOption = (index) => {
    const next = normalizedOptions.filter((_, i) => i !== index);
    onChange(next);
  };

  const moveOption = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= normalizedOptions.length) return;
    const next = [...normalizedOptions];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    onChange(next);
  };

  const quickSortOptions = () => {
    if (!normalizedOptions.length) return;

    const raw = window.prompt(
      "Введите значения, которые нужно поднять вверх, через запятую.\n\n" +
        "Пример: Беларусь, Украина, Россия"
    );

    if (!raw) return;

    const priorities = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    if (!priorities.length) return;

    const getPriorityIndex = (opt) => {
      const label = String(opt.label || "").toLowerCase();
      const value = String(opt.value || "").toLowerCase();
      const idx = priorities.findIndex(
        (p) => p === label || p === value
      );
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    const sorted = [...normalizedOptions].sort((a, b) => {
      const pa = getPriorityIndex(a);
      const pb = getPriorityIndex(b);
      if (pa !== pb) return pa - pb;
      return 0;
    });

    onChange(sorted);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-medium text-blue-700">
            Варианты выбора
          </label>
          <button
            type="button"
            onClick={quickSortOptions}
            className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
          >
            Быстрая сортировка
          </button>
        </div>
        <button
          type="button"
          onClick={addOption}
          className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
        >
          + Добавить вариант
        </button>
      </div>
      <div className="space-y-2 border border-blue-200 rounded-md bg-blue-50/50 p-3">
        {normalizedOptions.length === 0 ? (
          <p className="text-sm text-blue-400 py-2 text-center">
            Нет вариантов. Нажмите «Добавить вариант».
          </p>
        ) : (
          normalizedOptions.map((opt, index) => (
            <div
              key={index}
              className={`flex flex-wrap items-center gap-2 bg-white rounded border border-blue-200 p-2 ${showBitrixSecondValue ? "flex-col items-stretch" : ""}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-blue-400 text-sm w-6 shrink-0">{index + 1}.</span>
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(index, { label: e.target.value })}
                  placeholder="Текст варианта"
                  className="flex-1 min-w-0 py-1.5 px-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => updateOption(index, { value: e.target.value })}
                  placeholder="Значение"
                  className="flex-1 min-w-0 py-1.5 px-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none text-blue-600"
                />
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveOption(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-blue-500 hover:bg-blue-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Вверх"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOption(index, 1)}
                    disabled={index === normalizedOptions.length - 1}
                    className="p-1.5 text-blue-500 hover:bg-blue-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Вниз"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {showBitrixSecondValue && (
                <div className="pl-8 pr-0 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={opt.bitrix_second_value !== undefined}
                      onChange={(e) =>
                        updateOption(index, {
                          bitrix_second_value: e.target.checked ? "" : undefined,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-200"
                    />
                    <span className="text-sm text-blue-700">Задать второе значение для Bitrix</span>
                  </label>
                  {opt.bitrix_second_value !== undefined && (
                    <input
                      type="text"
                      value={opt.bitrix_second_value ?? ""}
                      onChange={(e) => updateOption(index, { bitrix_second_value: e.target.value })}
                      placeholder="Второе значение для Bitrix"
                      className="flex-1 min-w-0 py-1.5 px-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none text-blue-600"
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-blue-400 mt-1">
        «Текст варианта» — что видит пользователь. «Значение» — сохраняется в ответе, задаётся вручную.
        {showBitrixSecondValue && " Включите «Задать второе значение для Bitrix» только у нужных вариантов; для остальных в Bitrix уйдёт выбранное значение дважды."}
      </p>
    </div>
  );
}

function FieldEditor({
  field,
  index,
  isEditing,
  onEdit,
  onCancel,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  availableFields,
  bitrixContactFields = [],
}) {
  const [localField, setLocalField] = useState(field);
  const [bitrixSearch, setBitrixSearch] = useState("");
  const [bitrixDropdownOpen, setBitrixDropdownOpen] = useState(false);
  const [bitrixOptionsLoading, setBitrixOptionsLoading] = useState(false);
  const bitrixDropdownRef = React.useRef(null);

  const loadBitrixFieldOptions = React.useCallback((fieldCode, applyOptions) => {
    if (!fieldCode) return;
    setBitrixOptionsLoading(true);
    apiRequest(`/api/admin/bitrix/contact-fields/${encodeURIComponent(fieldCode)}/options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const options = Array.isArray(data?.data) ? data.data : [];
        applyOptions(options);
      })
      .catch(() => {})
      .finally(() => setBitrixOptionsLoading(false));
  }, []);

  React.useEffect(() => {
    setLocalField(field);
  }, [field]);

  const filteredBitrixFields = React.useMemo(() => {
    if (!bitrixContactFields || bitrixContactFields.length === 0) return { list: [], total: 0 };
    const term = bitrixSearch.trim().toLowerCase().replace(/\s+/g, " ");
    let list = bitrixContactFields;
    if (term) {
      const wordStartsWith = (text) => {
        const t = String(text || "").toLowerCase();
        if (t === term || t.startsWith(term)) return true;
        const words = t.split(/\s+/);
        return words.some((w) => w.startsWith(term) || term.startsWith(w));
      };
      list = bitrixContactFields.filter((bf) => {
        const title = (bf.title || "").toLowerCase();
        const code = (bf.code || "").toLowerCase();
        return title === term || code === term
          || title.startsWith(term) || code.startsWith(term)
          || wordStartsWith(bf.title) || wordStartsWith(bf.code);
      });
    }
    const getScore = (bf) => {
      const title = String(bf.title || "").toLowerCase();
      const code = String(bf.code || "").toLowerCase();
      if (title === term || code === term) return 4;
      if (title.startsWith(term) || code.startsWith(term)) return 3;
      const titleWords = title.split(/\s+/);
      const codeWords = code.split(/\s+/);
      if (titleWords.some((w) => w.startsWith(term))) return 2;
      if (codeWords.some((w) => w.startsWith(term))) return 2;
      return 0;
    };
    let result = [...list].sort((a, b) => {
      if (term) {
        const sa = getScore(a);
        const sb = getScore(b);
        if (sa !== sb) return sb - sa;
      }
      const aIsUf = String(a.code || "").startsWith("UF_");
      const bIsUf = String(b.code || "").startsWith("UF_");
      if (aIsUf !== bIsUf) return aIsUf ? 1 : -1;
      return String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "accent" });
    });
    if (term && result.length > 0) {
      const bestScore = getScore(result[0]);
      result = result.filter((bf) => getScore(bf) >= bestScore);
    }
    const selectedCode = localField.bitrix_field;
    if (selectedCode && !result.some((bf) => bf.code === selectedCode)) {
      const selected = bitrixContactFields.find((bf) => bf.code === selectedCode);
      if (selected) result = [selected, ...result];
    }
    const BITRIX_SEARCH_LIMIT = 10;
    const totalMatchCount = result.length;
    result = result.slice(0, BITRIX_SEARCH_LIMIT);
    return { list: result, total: totalMatchCount };
  }, [bitrixContactFields, bitrixSearch, localField.bitrix_field]);

  React.useEffect(() => {
    if (!bitrixDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (bitrixDropdownRef.current && !bitrixDropdownRef.current.contains(e.target)) {
        setBitrixDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bitrixDropdownOpen]);

  const selectedBitrixField = localField.bitrix_field
    ? bitrixContactFields.find((bf) => bf.code === localField.bitrix_field)
    : null;
  const bitrixDisplayText = bitrixDropdownOpen
    ? bitrixSearch
    : selectedBitrixField
    ? `${selectedBitrixField.title} (${selectedBitrixField.code})`
    : "";

  const handleSave = () => {
    let finalField = { ...localField };
    if (localField.type === "step_separator") {
      finalField = {
        ...finalField,
        required: false,
      };
      delete finalField.options;
      delete finalField.bitrix_field;
      delete finalField.bitrix_send_as_multiple;
      delete finalField.when;
      delete finalField.when_any;
      delete finalField.placeholder;
    }
    if (localField.type === "file") {
      finalField.accept = "image/*";
      finalField.file_multiple = !!localField.file_multiple;
    }
    if (localField.type === "select" && Array.isArray(localField.options)) {
      finalField.options = localField.options.filter((opt) => {
        const v = typeof opt === "string" ? opt : (opt.value ?? opt.label ?? "");
        return String(v).trim() !== "";
      });
    }
    onUpdate(finalField);
    onCancel();
  };

  const getLocalConditions = React.useCallback(() => {
    if (Array.isArray(localField.when_any) && localField.when_any.length > 0) {
      return localField.when_any;
    }
    if (localField.when) {
      return [localField.when];
    }
    return [];
  }, [localField]);

  const updateConditionAt = (conditionIndex, updater) => {
    const current = getLocalConditions();
    const next = [...current];
    next[conditionIndex] = updater(next[conditionIndex] || createEmptyCondition());
    const { when, ...rest } = localField;
    setLocalField({ ...rest, when_any: next });
  };

  const addCondition = () => {
    const next = [...getLocalConditions(), createEmptyCondition()];
    const { when, ...rest } = localField;
    setLocalField({ ...rest, when_any: next });
  };

  const removeCondition = (conditionIndex) => {
    const next = getLocalConditions().filter((_, idx) => idx !== conditionIndex);
    if (next.length === 0) {
      const { when, when_any, ...rest } = localField;
      setLocalField(rest);
      return;
    }
    const { when, ...rest } = localField;
    setLocalField({ ...rest, when_any: next });
  };

  const setConditionOperator = (conditionIndex, operator) => {
    updateConditionAt(conditionIndex, (condition) => {
      const base = { field: condition.field || "" };
      if (operator === "equals") return { ...base, equals: "" };
      if (operator === "not_equals") return { ...base, not_equals: "" };
      if (operator === "in") return { ...base, in: [] };
      if (operator === "not_in") return { ...base, not_in: [] };
      return base;
    });
  };

  const setConditionField = (conditionIndex, fieldId) => {
    updateConditionAt(conditionIndex, (condition) => ({ ...condition, field: fieldId }));
  };

  const setConditionValue = (conditionIndex, rawValue) => {
    updateConditionAt(conditionIndex, (condition) => {
      const operator = getConditionOperator(condition);
      if (operator === "equals") return { ...condition, equals: rawValue };
      if (operator === "not_equals") return { ...condition, not_equals: rawValue };
      if (operator === "in") {
        return {
          ...condition,
          in: rawValue
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v),
        };
      }
      if (operator === "not_in") {
        return {
          ...condition,
          not_in: rawValue
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v),
        };
      }
      return condition;
    });
  };

  if (!isEditing) {
    return (
      <div className="border border-blue-200 rounded-md p-3 bg-blue-50 flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-blue-700">
            {field.type === "step_separator"
              ? field.label || `Разделитель шага ${index + 1}`
              : field.label || field.id || `Поле ${index + 1}`}
          </div>
          <div className="text-xs text-blue-400 mt-1">
            Тип: {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
            {field.required && field.type !== "step_separator" && " • Обязательное"}
            {(field.when || (Array.isArray(field.when_any) && field.when_any.length > 0)) && " • Условное"}
            {field.bitrix_field && ` • Bitrix: ${field.bitrix_field}`}
            {field.bitrix_send_as_multiple && field.type === "select" && " • В Bitrix передаётся два значения"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1 text-blue-500 hover:bg-blue-100 rounded"
              title="Вверх"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1 text-blue-500 hover:bg-blue-100 rounded"
              title="Вниз"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Редактировать
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Удалить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-blue-300 rounded-md p-4 bg-white">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              ID поля *
            </label>
            <input
              type="text"
              value={localField.id || localField.name || ""}
              onChange={(e) =>
                setLocalField({ ...localField, id: e.target.value, name: e.target.value })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="field_id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Тип поля *
            </label>
            <select
              value={localField.type || "text"}
              onChange={(e) => {
                const newType = e.target.value;
                if (newType === "file") {
                  setLocalField({
                    ...localField,
                    type: "file",
                    file_multiple: !!localField.file_multiple,
                    accept: "image/*",
                  });
                } else {
                  setLocalField({ ...localField, type: newType });
                }
                if (newType === "select" && localField.bitrix_field) {
                  loadBitrixFieldOptions(localField.bitrix_field, (options) =>
                    setLocalField((prev) => ({ ...prev, type: "select", options }))
                  );
                }
              }}
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            {localField.type === "step_separator" ? "Название разделителя" : "Название поля *"}
          </label>
          <input
            type="text"
            value={localField.label || ""}
            onChange={(e) => setLocalField({ ...localField, label: e.target.value })}
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder={
              localField.type === "step_separator"
                ? "Например: Раздел гражданства"
                : "Введите название поля"
            }
          />
        </div>

        {localField.type !== "file" && localField.type !== "step_separator" && (
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Подсказка в поле (placeholder)
            </label>
            <input
              type="text"
              value={localField.placeholder || ""}
              onChange={(e) => setLocalField({ ...localField, placeholder: e.target.value })}
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder={
                localField.type === "select"
                  ? "Например: Выберите вариант"
                  : "Например: Введите данные"
              }
            />
            <p className="text-xs text-blue-400 mt-1">
              {localField.type === "select"
                ? "Для типа «Выбор» это текст первого пустого варианта."
                : "Текст показывается в поле до начала ввода."}
            </p>
          </div>
        )}

        {localField.type !== "step_separator" && bitrixContactFields.length > 0 && (
          <div ref={bitrixDropdownRef} className="relative">
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Поле Bitrix24 (контакт) — одно поле
            </label>
            <div className="relative">
              <input
                type="text"
                value={bitrixDisplayText}
                onChange={(e) => {
                  setBitrixSearch(e.target.value);
                  setBitrixDropdownOpen(true);
                }}
                onFocus={() => {
                  setBitrixDropdownOpen(true);
                  if (!bitrixDropdownOpen) setBitrixSearch("");
                }}
                placeholder="Поиск по названию или коду поля..."
                className="w-full py-2 pl-3 pr-8 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                {bitrixDropdownOpen ? "▲" : "▼"}
              </span>
            </div>
            {bitrixDropdownOpen && (
              <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto border border-blue-200 rounded-md bg-white shadow-lg py-1">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalField({ ...localField, bitrix_field: undefined });
                      setBitrixSearch("");
                      setBitrixDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    — не сопоставлять —
                  </button>
                </li>
                {filteredBitrixFields.list.map((bf) => (
                  <li key={bf.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalField({ ...localField, bitrix_field: bf.code });
                        setBitrixSearch("");
                        setBitrixDropdownOpen(false);
                        if (localField.type === "select") {
                          loadBitrixFieldOptions(bf.code, (options) =>
                            setLocalField((prev) => ({ ...prev, bitrix_field: bf.code, options }))
                          );
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-sm truncate ${
                        localField.bitrix_field === bf.code
                          ? "bg-blue-100 text-blue-800 font-medium"
                          : "text-blue-700 hover:bg-blue-50"
                      }`}
                      title={`${bf.title} (${bf.code})`}
                    >
                      {bf.title} ({bf.code})
                    </button>
                  </li>
                ))}
                {filteredBitrixFields.list.length === 0 && (
                  <li className="px-3 py-2 text-sm text-blue-400">Ничего не найдено</li>
                )}
                {filteredBitrixFields.total > 10 && (
                  <li className="px-3 py-1.5 text-xs text-blue-400 border-t border-blue-100">
                    Показано не более 10 из {filteredBitrixFields.total}
                    {bitrixSearch.trim() ? ", уточните поиск" : ""}
                  </li>
                )}
              </ul>
            )}
            <p className="text-xs text-blue-400 mt-1">
              Выбирается одно поле для синхронизации с контактом при создании формы из сделки и при отправке формы.
            </p>
          </div>
        )}

        {localField.type === "select" && (
          <div>
            {bitrixOptionsLoading && (
              <p className="text-sm text-blue-500 mb-2">Загрузка вариантов из Bitrix24…</p>
            )}
            {localField.bitrix_field && !bitrixOptionsLoading && (localField.options?.length > 0) && (
              <p className="text-xs text-blue-400 mb-2">
                Варианты загружены из Bitrix24. Можно отредактировать вручную.
              </p>
            )}
            <SelectOptionsEditor
              options={localField.options || []}
              onChange={(options) => setLocalField({ ...localField, options })}
              showBitrixSecondValue={!!localField.bitrix_send_as_multiple && !!localField.bitrix_field}
            />
            {localField.bitrix_field && (
              <label className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!localField.bitrix_send_as_multiple}
                  onChange={(e) =>
                    setLocalField({ ...localField, bitrix_send_as_multiple: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-200"
                />
                <span className="text-sm text-blue-700">
                  Поле в Bitrix с множественным выбором — передавать два значения (второе задаётся у каждого варианта ниже)
                </span>
              </label>
            )}
          </div>
        )}

        {localField.type === "file" && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!localField.file_multiple}
                onChange={(e) =>
                  setLocalField({
                    ...localField,
                    file_multiple: e.target.checked,
                    accept: "image/*",
                  })
                }
                className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-200"
              />
              <span className="text-sm text-blue-700">
                Разрешить загрузку нескольких фото в одно поле
              </span>
            </label>
            <p className="text-xs text-blue-400">
              Если выключено — можно загрузить только одно фото (например, страница паспорта).
              Если включено — можно добавить несколько фото (например, история виз).
            </p>
          </div>
        )}

        {localField.type !== "step_separator" && (
          <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localField.required || false}
              onChange={(e) =>
                setLocalField({ ...localField, required: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-200"
            />
            <span className="text-sm text-blue-700">Обязательное поле</span>
          </label>
          </div>
        )}

        {localField.type !== "step_separator" && (
          <div className="border-t border-blue-200 pt-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={!!localField.when || (Array.isArray(localField.when_any) && localField.when_any.length > 0)}
              onChange={(e) => {
                if (e.target.checked) {
                  const currentConditions = getLocalConditions();
                  if (currentConditions.length > 0) {
                    const { when, ...rest } = localField;
                    setLocalField({ ...rest, when_any: currentConditions });
                  } else {
                    const { when, ...rest } = localField;
                    setLocalField({ ...rest, when_any: [createEmptyCondition()] });
                  }
                } else {
                  const { when, when_any, ...rest } = localField;
                  setLocalField(rest);
                }
              }}
              className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-200"
            />
            <span className="text-sm font-medium text-blue-700">
              Условие отображения
            </span>
          </label>

          {(!!localField.when || (Array.isArray(localField.when_any) && localField.when_any.length > 0)) && (
            <div className="ml-6 space-y-3 bg-blue-50 p-3 rounded border border-blue-200">
              {getLocalConditions().map((condition, conditionIndex) => {
                const operator = getConditionOperator(condition);
                return (
                  <div
                    key={conditionIndex}
                    className="bg-white border border-blue-200 rounded-md p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-700">
                        Условие {conditionIndex + 1}
                        {conditionIndex > 0 && " (ИЛИ)"}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCondition(conditionIndex)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        title="Удалить условие"
                      >
                        Удалить
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Поле, от которого зависит отображение
                      </label>
                      <select
                        value={condition.field || ""}
                        onChange={(e) => setConditionField(conditionIndex, e.target.value)}
                        className="w-full py-2 px-3 border border-blue-200 rounded-md bg-white text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="">Выберите поле</option>
                        {availableFields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Оператор
                      </label>
                      <select
                        value={operator}
                        onChange={(e) => setConditionOperator(conditionIndex, e.target.value)}
                        className="w-full py-2 px-3 border border-blue-200 rounded-md bg-white text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="">Выберите оператор</option>
                        {CONDITION_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(operator === "equals" || operator === "not_equals") && (
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Значение
                        </label>
                        <input
                          type="text"
                          value={getConditionValue(condition)}
                          onChange={(e) => setConditionValue(conditionIndex, e.target.value)}
                          className="w-full py-2 px-3 border border-blue-200 rounded-md bg-white text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                          placeholder="Введите значение"
                        />
                      </div>
                    )}

                    {(operator === "in" || operator === "not_in") && (
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Значения (через запятую)
                        </label>
                        <input
                          type="text"
                          value={getConditionValue(condition)}
                          onChange={(e) => setConditionValue(conditionIndex, e.target.value)}
                          className="w-full py-2 px-3 border border-blue-200 rounded-md bg-white text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                          placeholder="значение1, значение2, значение3"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addCondition}
                className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                + Добавить условие ИЛИ
              </button>
            </div>
          )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export default SchemaEditor;

