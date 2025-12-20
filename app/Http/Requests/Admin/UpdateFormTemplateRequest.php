<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateFormTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'visa_type_id' => 'required|exists:visa_types,id',
            'name' => 'required|string|max:255',
            'schema' => ['nullable', 'array', function ($attribute, $value, $fail) {
                if ($value && !$this->validateSchemaStructure($value)) {
                    $fail('Схема формы содержит ошибки в структуре условий.');
                }
            }],
            'status' => [
                'required',
                'string',
                Rule::in(['draft', 'active', 'archived']),
            ],
        ];
    }

    /**
     * Валидация структуры схемы формы
     */
    private function validateSchemaStructure(array $schema): bool
    {
        // Проверяем наличие fields
        if (!isset($schema['fields']) || !is_array($schema['fields'])) {
            return true; // Если нет fields, считаем валидным (старая схема)
        }

        $fieldIds = [];
        $fieldNames = [];

        foreach ($schema['fields'] as $index => $field) {
            if (!is_array($field)) {
                return false;
            }

            $fieldId = $field['id'] ?? $field['name'] ?? null;
            if (!$fieldId) {
                return false; // Поле должно иметь id или name
            }

            // Проверка на дубликаты
            if (in_array($fieldId, $fieldIds)) {
                return false;
            }
            $fieldIds[] = $fieldId;
            $fieldNames[] = $fieldId;

            // Валидация условий when
            if (isset($field['when'])) {
                $when = $field['when'];
                if (!is_array($when)) {
                    return false;
                }

                // Проверка наличия поля, от которого зависит условие
                if (!isset($when['field']) || !is_string($when['field'])) {
                    return false;
                }

                // Проверка наличия хотя бы одного оператора
                $hasOperator = isset($when['equals']) ||
                    isset($when['not_equals']) ||
                    (isset($when['in']) && is_array($when['in'])) ||
                    (isset($when['not_in']) && is_array($when['not_in']));

                if (!$hasOperator) {
                    return false;
                }

                // Проверка, что зависимое поле существует
                if (!in_array($when['field'], $fieldNames)) {
                    return false;
                }
            }

            // Валидация select полей
            if (isset($field['type']) && $field['type'] === 'select') {
                if (!isset($field['options']) || !is_array($field['options'])) {
                    return false;
                }
            }
        }

        return true;
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'error' => [
                    'message' => 'Ошибка валидации',
                    'code' => 422,
                    'details' => $validator->errors(),
                ],
            ], 422)
        );
    }
}


