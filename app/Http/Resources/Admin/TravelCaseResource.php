<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TravelCaseResource extends JsonResource
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
            'public_token' => $this->public_token,
            'status' => $this->status,
            'filled_at' => $this->filled_at,
            'visa_type_id' => $this->visa_type_id,
            'form_template_id' => $this->form_template_id,
            'user_id' => $this->user_id,
            'created_by' => $this->created_by,
            'visa_type' => $this->whenLoaded('visaType', function () {
                return [
                    'id' => $this->visaType->id,
                    'code' => $this->visaType->code,
                    'name' => $this->visaType->name,
                    'country' => $this->visaType->country,
                ];
            }),
            'form_template' => $this->whenLoaded('formTemplate', function () {
                return [
                    'id' => $this->formTemplate->id,
                    'name' => $this->formTemplate->name,
                ];
            }),
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => trim($this->creator->first_name . ' ' . $this->creator->last_name),
                    'email' => $this->creator->email,
                ];
            }),
            'form_responses' => $this->whenLoaded('formResponses', function () {
                return $this->formResponses->map(function ($response) {
                    return [
                        'id' => $response->id,
                        'payload' => $response->payload,
                        'submitted_at' => $response->submitted_at,
                        'created_at' => $response->created_at,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}


