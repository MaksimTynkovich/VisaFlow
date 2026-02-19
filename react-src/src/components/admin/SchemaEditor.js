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
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Равно" },
  { value: "not_equals", label: "Не равно" },
  { value: "in", label: "Одно из значений" },
  { value: "not_in", label: "Не одно из значений" },
];

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
      .filter((_, index) => index < currentIndex); // Только поля, которые идут раньше
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
          {bitrixContactFields.length > 0 && (
            <button
              type="button"
              onClick={() => loadBitrixFields(true)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
              title="Обновить список полей из Bitrix24 после добавления/удаления полей в контактах"
            >
              Обновить поля Bitrix
            </button>
          )}
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

function SelectOptionsEditor({ options, onChange }) {
  const normalizedOptions = React.useMemo(
    () =>
      (options || []).map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value ?? opt.label ?? "", label: opt.label ?? opt.value ?? "" }
      ),
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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-blue-700">
          Варианты выбора
        </label>
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
              className="flex items-center gap-2 bg-white rounded border border-blue-200 p-2"
            >
              <span className="text-blue-400 text-sm w-6">{index + 1}.</span>
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(index, { label: e.target.value })}
                placeholder="Текст варианта"
                className="flex-1 py-1.5 px-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
                <input
                type="text"
                value={opt.value}
                onChange={(e) => updateOption(index, { value: e.target.value })}
                placeholder="Значение"
                className="flex-1 py-1.5 px-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none text-blue-600"
              />
              <div className="flex gap-1">
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
          ))
        )}
      </div>
      <p className="text-xs text-blue-400 mt-1">
        «Текст варианта» — что видит пользователь. «Значение» — сохраняется в ответе, задаётся вручную.
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

  React.useEffect(() => {
    setLocalField(field);
  }, [field]);

  const handleSave = () => {
    let finalField = { ...localField };
    if (localField.type === "select" && Array.isArray(localField.options)) {
      finalField.options = localField.options.filter((opt) => {
        const v = typeof opt === "string" ? opt : (opt.value ?? opt.label ?? "");
        return String(v).trim() !== "";
      });
    }
    onUpdate(finalField);
    onCancel();
  };

  const handleConditionChange = (updates) => {
    setLocalField({
      ...localField,
      when: { ...localField.when, ...updates },
    });
  };

  if (!isEditing) {
    return (
      <div className="border border-blue-200 rounded-md p-3 bg-blue-50 flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-blue-700">
            {field.label || field.id || `Поле ${index + 1}`}
          </div>
          <div className="text-xs text-blue-400 mt-1">
            Тип: {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
            {field.required && " • Обязательное"}
            {field.when && " • Условное"}
            {field.bitrix_field && ` • Bitrix: ${field.bitrix_field}`}
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
              onChange={(e) => setLocalField({ ...localField, type: e.target.value })}
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
            Название поля *
          </label>
          <input
            type="text"
            value={localField.label || ""}
            onChange={(e) => setLocalField({ ...localField, label: e.target.value })}
            className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="Введите название поля"
          />
        </div>

        {bitrixContactFields.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Поле Bitrix24 (контакт)
            </label>
            <select
              value={localField.bitrix_field ?? ""}
              onChange={(e) =>
                setLocalField({
                  ...localField,
                  bitrix_field: e.target.value ? e.target.value : undefined,
                })
              }
              className="w-full py-2 px-3 border border-blue-200 rounded-md bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="">— не сопоставлять —</option>
              {bitrixContactFields.map((bf) => (
                <option key={bf.code} value={bf.code}>
                  {bf.title} ({bf.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-blue-400 mt-1">
              Для синхронизации с контактом при создании формы из сделки и при отправке формы.
            </p>
          </div>
        )}

        {localField.type === "select" && (
          <SelectOptionsEditor
            options={localField.options || []}
            onChange={(options) => setLocalField({ ...localField, options })}
          />
        )}

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

        <div className="border-t border-blue-200 pt-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={!!localField.when}
              onChange={(e) => {
                if (e.target.checked) {
                  setLocalField({
                    ...localField,
                    when: { field: "", equals: "" },
                  });
                } else {
                  const { when, ...rest } = localField;
                  setLocalField(rest);
                }
              }}
              className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-200"
            />
            <span className="text-sm font-medium text-blue-700">
              Условие отображения
            </span>
          </label>

          {localField.when && (
            <div className="ml-6 space-y-3 bg-blue-50 p-3 rounded border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Поле, от которого зависит отображение
                </label>
                <select
                  value={localField.when.field || ""}
                  onChange={(e) => handleConditionChange({ field: e.target.value })}
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
                  value={
                    localField.when.equals !== undefined
                      ? "equals"
                      : localField.when.not_equals !== undefined
                      ? "not_equals"
                      : localField.when.in !== undefined
                      ? "in"
                      : localField.when.not_in !== undefined
                      ? "not_in"
                      : ""
                  }
                  onChange={(e) => {
                    const operator = e.target.value;
                    const newWhen = { field: localField.when.field };
                    if (operator === "equals") {
                      newWhen.equals = "";
                    } else if (operator === "not_equals") {
                      newWhen.not_equals = "";
                    } else if (operator === "in") {
                      newWhen.in = [];
                    } else if (operator === "not_in") {
                      newWhen.not_in = [];
                    }
                    setLocalField({ ...localField, when: newWhen });
                  }}
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

              {(localField.when.equals !== undefined ||
                localField.when.not_equals !== undefined) && (
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Значение
                  </label>
                  <input
                    type="text"
                    value={
                      localField.when.equals !== undefined
                        ? localField.when.equals
                        : localField.when.not_equals
                    }
                    onChange={(e) => {
                      if (localField.when.equals !== undefined) {
                        handleConditionChange({ equals: e.target.value });
                      } else {
                        handleConditionChange({ not_equals: e.target.value });
                      }
                    }}
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-white text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="Введите значение"
                  />
                </div>
              )}

              {(localField.when.in !== undefined ||
                localField.when.not_in !== undefined) && (
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Значения (через запятую)
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(
                        localField.when.in !== undefined
                          ? localField.when.in
                          : localField.when.not_in
                      )
                        ? (
                            localField.when.in !== undefined
                              ? localField.when.in
                              : localField.when.not_in
                          ).join(", ")
                        : ""
                    }
                    onChange={(e) => {
                      const values = e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter((v) => v);
                      if (localField.when.in !== undefined) {
                        handleConditionChange({ in: values });
                      } else {
                        handleConditionChange({ not_in: values });
                      }
                    }}
                    className="w-full py-2 px-3 border border-blue-200 rounded-md bg-white text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="значение1, значение2, значение3"
                  />
                </div>
              )}
            </div>
          )}
        </div>

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

