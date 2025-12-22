<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\TravelCase;
use App\Services\Admin\TravelCaseService;
use App\Services\Public\FormDraftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicFormController extends Controller
{
    public function __construct(
        private readonly TravelCaseService $travelCaseService,
        private readonly FormDraftService $formDraftService
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
                    'message' => 'Форма не найдена',
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
     * Получить последнюю отправку формы по токену.
     */
    public function getLastSubmission(string $token): JsonResponse
    {
        $travelCase = $this->travelCaseService->findByToken($token);

        if (!$travelCase) {
            return response()->json([
                'error' => [
                    'message' => 'Форма не найдена',
                    'code' => 404,
                    'details' => [],
                ],
            ], 404);
        }

        // Получаем последнюю отправку (не удаленную, soft deletes автоматически исключаются)
        $lastResponse = $travelCase->formResponses()
            ->orderBy('submitted_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$lastResponse) {
            return response()->json([
                'data' => null,
            ]);
        }

        return response()->json([
            'data' => [
                'id' => $lastResponse->id,
                'payload' => $lastResponse->payload,
                'submitted_at' => $lastResponse->submitted_at?->toIso8601String() ?? $lastResponse->submitted_at?->format('c'),
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
                    'message' => 'Форма не найдена',
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

        // Удаляем черновик после успешной отправки
        $this->formDraftService->deleteDraft($token);

        return response()->json([
            'data' => [
                'id' => $formResponse->id,
                'message' => 'Ответ успешно сохранён',
            ],
        ], 201);
    }
}


