<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreVisaTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|max:255|unique:visa_types,code',
            'name' => 'required|string|max:255',
            'country' => 'required|string|max:255',
            'is_active' => 'sometimes|boolean',
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
}

