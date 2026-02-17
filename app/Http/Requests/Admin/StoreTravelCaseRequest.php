<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreTravelCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'visa_type_id' => 'required|exists:visa_types,id',
            'form_template_id' => 'required|exists:form_templates,id',
            'user_id' => 'nullable|exists:users,id',
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
            'status' => 'new',
        ]);
    }
}


