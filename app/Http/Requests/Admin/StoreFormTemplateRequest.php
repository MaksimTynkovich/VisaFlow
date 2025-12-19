<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreFormTemplateRequest extends FormRequest
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
            'schema' => 'nullable|array',
            'status' => [
                'required',
                'string',
                Rule::in(['draft', 'active', 'archived']),
            ],
            'created_by' => 'sometimes|exists:users,id',
        ];
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

    protected function prepareForValidation(): void
    {
        $this->merge([
            'created_by' => $this->user()->id,
        ]);
    }
}

