<?php

namespace App\Http\Requests\Bitrix;

use Illuminate\Foundation\Http\FormRequest;

class CreateSpainVisaPdfRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'deal_id' => 'required|integer|min:1',
        ];
    }

    protected function prepareForValidation(): void
    {
        $dealId = $this->input('deal_id') ?? $this->query('deal_id');

        if ($dealId !== null) {
            $this->merge(['deal_id' => (int) $dealId]);
        }
    }
}
