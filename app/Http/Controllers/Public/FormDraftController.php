<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Public\FormDraftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormDraftController extends Controller
{
    public function __construct(
        private readonly FormDraftService $formDraftService
    ) {
    }

    /**
     * Сохранить черновик формы.
     */
    public function save(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'form_data' => 'required|array',
        ]);

        try {
            $draft = $this->formDraftService->saveDraft(
                $token,
                $request->input('form_data')
            );

            return response()->json([
                'data' => [
                    'id' => $draft->id,
                    'message' => 'Черновик сохранён',
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => [
                    'message' => 'Не удалось сохранить черновик',
                    'code' => 500,
                    'details' => [],
                ],
            ], 500);
        }
    }

    /**
     * Получить черновик формы.
     */
    public function get(string $token): JsonResponse
    {
        $draft = $this->formDraftService->getDraft($token);

        if (!$draft) {
            return response()->json([
                'data' => null,
            ], 200);
        }

        return response()->json([
            'data' => [
                'id' => $draft->id,
                'form_data' => $draft->form_data,
                'updated_at' => $draft->updated_at,
            ],
        ]);
    }

    /**
     * Удалить черновик формы.
     */
    public function delete(string $token): JsonResponse
    {
        $deleted = $this->formDraftService->deleteDraft($token);

        return response()->json([
            'data' => [
                'deleted' => $deleted,
                'message' => $deleted ? 'Черновик удалён' : 'Черновик не найден',
            ],
        ]);
    }
}
