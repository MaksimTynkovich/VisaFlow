<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormTemplateResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'schema' => $this->schema,
            'status' => $this->status,
            'visa_type_id' => $this->visa_type_id,
            'visa_type' => $this->whenLoaded('visaType', function () {
                return [
                    'id' => $this->visaType->id,
                    'code' => $this->visaType->code,
                    'name' => $this->visaType->name,
                    'country' => $this->visaType->country,
                ];
            }),
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => trim($this->creator->first_name . ' ' . $this->creator->last_name),
                    'email' => $this->creator->email,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

