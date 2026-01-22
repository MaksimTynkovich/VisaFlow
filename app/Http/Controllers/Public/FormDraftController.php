<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\FormFile;
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

        // Собираем все ID файлов из form_data
        $fileIds = [];
        if (is_array($draft->form_data)) {
            foreach ($draft->form_data as $fieldValue) {
                if (is_array($fieldValue)) {
                    // Фильтруем только числовые ID
                    $fileIds = array_merge($fileIds, array_filter($fieldValue, 'is_numeric'));
                }
            }
        }

        // Удаляем дубликаты и преобразуем в целые числа
        $fileIds = array_unique(array_map('intval', $fileIds));

        // Загружаем информацию о файлах
        $files = [];
        if (!empty($fileIds)) {
            $formFiles = FormFile::whereIn('id', $fileIds)->get();
            foreach ($formFiles as $file) {
                $files[] = [
                    'id' => $file->id,
                    'field_id' => $file->field_id,
                    'original_name' => $file->original_name,
                    'file_size' => $file->file_size,
                    'mime_type' => $file->mime_type,
                    'url' => url("/api/public/form/file/{$file->id}"),
                ];
            }
        }

        return response()->json([
            'data' => [
                'id' => $draft->id,
                'form_data' => $draft->form_data,
                'files' => $files,
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
