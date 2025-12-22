<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateVisaTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $visaType = $this->route('visa_type');
        $visaTypeId = $visaType instanceof \App\Models\VisaType ? $visaType->id : $visaType;

        return [
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('visa_types', 'code')->ignore($visaTypeId),
            ],
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

