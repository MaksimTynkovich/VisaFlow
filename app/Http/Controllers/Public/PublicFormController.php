<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\TravelCase;
use App\Services\Admin\TravelCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicFormController extends Controller
{
    public function __construct(
        private readonly TravelCaseService $travelCaseService
    ) {
    }

    /**
     * Получить заявку по публичному токену.
     */
    public function show(string $token): JsonResponse
    {
        $travelCase = $this->travelCaseService->findByToken($token);

        if (!$travelCase) {
            return response()->json([
                'error' => [
                    'message' => 'Заявка не найдена',
                    'code' => 404,
                    'details' => [],
                ],
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $travelCase->id,
                'public_token' => $travelCase->public_token,
                'visa_type' => [
                    'id' => $travelCase->visaType->id,
                    'name' => $travelCase->visaType->name,
                    'country' => $travelCase->visaType->country,
                ],
                'form_template' => [
                    'id' => $travelCase->formTemplate->id,
                    'name' => $travelCase->formTemplate->name,
                    'schema' => $travelCase->formTemplate->schema,
                ],
                'status' => $travelCase->status,
            ],
        ]);
    }

    /**
     * Сохранить ответ на форму.
     */
    public function submit(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'payload' => 'required|array',
        ]);

        $travelCase = $this->travelCaseService->findByToken($token);

        if (!$travelCase) {
            return response()->json([
                'error' => [
                    'message' => 'Заявка не найдена',
                    'code' => 404,
                    'details' => [],
                ],
            ], 404);
        }

        if ($travelCase->status === 'archived') {
            return response()->json([
                'error' => [
                    'message' => 'Заявка архивирована и больше не принимает ответы',
                    'code' => 400,
                    'details' => [],
                ],
            ], 400);
        }

        // Создаём ответ на форму
        $formResponse = $travelCase->formResponses()->create([
            'payload' => $request->input('payload'),
            'submitted_at' => now(),
        ]);

        // Обновляем статус заявки на 'filled', если ещё не заполнена
        if ($travelCase->status === 'new') {
            $travelCase->update([
                'status' => 'filled',
                'filled_at' => now(),
            ]);
        }

        return response()->json([
            'data' => [
                'id' => $formResponse->id,
                'message' => 'Ответ успешно сохранён',
            ],
        ], 201);
    }
}


