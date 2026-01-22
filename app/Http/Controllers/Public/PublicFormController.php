<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\FormFile;
use App\Models\TravelCase;
use App\Services\Admin\TravelCaseService;
use App\Services\Public\FormDraftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

        // Загружаем файлы для этой отправки
        $files = $lastResponse->files->map(function ($file) {
            return [
                'id' => $file->id,
                'field_id' => $file->field_id,
                'original_name' => $file->original_name,
                'file_size' => $file->file_size,
                'mime_type' => $file->mime_type,
                'url' => url("/api/public/form/file/{$file->id}"),
            ];
        });

        return response()->json([
            'data' => [
                'id' => $lastResponse->id,
                'payload' => $lastResponse->payload,
                'files' => $files,
                'submitted_at' => $lastResponse->submitted_at?->toIso8601String() ?? $lastResponse->submitted_at?->format('c'),
            ],
        ]);
    }

    /**
     * Загрузить файл для формы.
     */
    public function uploadFile(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240', // Максимум 10MB
            'field_id' => 'required|string',
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

        $file = $request->file('file');
        $fieldId = $request->input('field_id');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $fileSize = $file->getSize();

        // Генерируем уникальное имя файла
        $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $filePath = 'form-files/' . $travelCase->id . '/' . $fileName;

        // Сохраняем файл
        Storage::disk('public')->put($filePath, file_get_contents($file->getRealPath()));

        // Сохраняем информацию о файле во временной таблице (без form_response_id)
        // Это будет временный файл, который будет связан с form_response при submit
        $formFile = FormFile::create([
            'form_response_id' => null, // Временное значение, будет обновлено при submit
            'field_id' => $fieldId,
            'original_name' => $originalName,
            'file_path' => $filePath,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
        ]);

        return response()->json([
            'data' => [
                'id' => $formFile->id,
                'field_id' => $fieldId,
                'original_name' => $originalName,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'url' => url("/api/public/form/file/{$formFile->id}"),
            ],
        ], 201);
    }

    /**
     * Получить информацию о файле по ID.
     */
    public function getFileInfo(int $fileId): JsonResponse
    {
        $formFile = FormFile::findOrFail($fileId);

        return response()->json([
            'data' => [
                'id' => $formFile->id,
                'field_id' => $formFile->field_id,
                'original_name' => $formFile->original_name,
                'file_size' => $formFile->file_size,
                'mime_type' => $formFile->mime_type,
                'url' => url("/api/public/form/file/{$formFile->id}"),
            ],
        ]);
    }

    /**
     * Получить файл по ID.
     */
    public function getFile(int $fileId)
    {
        $formFile = FormFile::findOrFail($fileId);

        if (!Storage::disk('public')->exists($formFile->file_path)) {
            abort(404, 'Файл не найден');
        }

        $path = Storage::disk('public')->path($formFile->file_path);
        $mimeType = $formFile->mime_type ?: Storage::disk('public')->mimeType($formFile->file_path);

        return response()->file($path, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $formFile->original_name . '"',
        ]);
    }

    /**
     * Сохранить ответ на форму.
     */
    public function submit(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'payload' => 'required|array',
            'file_ids' => 'sometimes|array',
            'file_ids.*' => 'integer|exists:form_files,id',
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

        // Связываем загруженные файлы с ответом
        if ($request->has('file_ids') && is_array($request->input('file_ids'))) {
            $fileIds = $request->input('file_ids');
            
            // Получаем файлы, которые нужно привязать
            $filesToAttach = FormFile::whereIn('id', $fileIds)->get();
            
            foreach ($filesToAttach as $file) {
                if ($file->form_response_id === null) {
                    // Временный файл - просто привязываем к новому ответу
                    $file->update(['form_response_id' => $formResponse->id]);
                } else {
                    // Файл уже привязан к предыдущему ответу - создаём копию для нового ответа
                    $existingResponse = $file->formResponse;
                    if ($existingResponse && $existingResponse->travel_case_id === $travelCase->id) {
                        // Проверяем, что файл существует
                        if (Storage::disk('public')->exists($file->file_path)) {
                            // Создаём копию файла
                            $originalPath = $file->file_path;
                            $pathInfo = pathinfo($originalPath);
                            $newFileName = Str::uuid() . '.' . ($pathInfo['extension'] ?? '');
                            $newFilePath = 'form-files/' . $travelCase->id . '/' . $newFileName;
                            
                            // Копируем файл
                            Storage::disk('public')->copy($originalPath, $newFilePath);
                            
                            // Создаём новую запись о файле для нового ответа
                            FormFile::create([
                                'form_response_id' => $formResponse->id,
                                'field_id' => $file->field_id,
                                'original_name' => $file->original_name,
                                'file_path' => $newFilePath,
                                'mime_type' => $file->mime_type,
                                'file_size' => $file->file_size,
                            ]);
                        }
                    }
                }
            }

            // Удаляем временные файлы, которые не были использованы
            FormFile::whereNull('form_response_id')
                ->where('created_at', '<', now()->subHours(24))
                ->get()
                ->each(function ($file) {
                    if (Storage::disk('public')->exists($file->file_path)) {
                        Storage::disk('public')->delete($file->file_path);
                    }
                    $file->delete();
                });
        }

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


