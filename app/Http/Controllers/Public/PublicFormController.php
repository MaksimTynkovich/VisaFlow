<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\FormFile;
use App\Models\FormResponse;
use App\Models\TravelCase;
use App\Services\Admin\TravelCaseService;
use App\Services\Bitrix\BitrixApiService;
use App\Services\Public\FormDraftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicFormController extends Controller
{
    public function __construct(
        private readonly TravelCaseService $travelCaseService,
        private readonly FormDraftService $formDraftService,
        private readonly BitrixApiService $bitrixApi
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

        // Отправляем комментарий в таймлайн сделки Bitrix и обновляем контакт, если заявка связана со сделкой
        if ($travelCase->bitrix_deal_id && config('bitrix.webhook_url')) {
            $payload = $request->input('payload', []);
            $dealId = (int) $travelCase->bitrix_deal_id;
            $comment = $this->formatBitrixComment($travelCase, $payload, $formResponse);
            $this->bitrixApi->addDealTimelineComment($dealId, $comment);

            // Обновляем данные контакта в Bitrix данными из формы (заменяем текущие значения, а не добавляем)
            $contactIds = $this->bitrixApi->getDealContactIds($dealId);
            if (!empty($contactIds)) {
                $contactId = $contactIds[0];
                $existingContact = $this->bitrixApi->getContact($contactId);
                $contactFields = $this->payloadToBitrixContactFields($travelCase, $payload, $existingContact);

                // Если в ответе есть загруженные изображения — отправляем одно из них в Bitrix в поле PHOTO (раздел «Фото»)
                $photoField = $this->buildBitrixContactPhotoField($formResponse);
                if ($photoField !== null) {
                    $contactFields['PHOTO'] = $photoField;
                }

                if (!empty($contactFields)) {
                    $this->bitrixApi->updateContact($contactId, $contactFields);
                }
            }
        }

        return response()->json([
            'data' => [
                'id' => $formResponse->id,
                'message' => 'Ответ успешно сохранён',
            ],
        ], 201);
    }

    /**
     * Форматировать данные формы для комментария в Bitrix: "Название поля — значение".
     * Для файловых полей добавляются ссылки на файлы.
     */
    private function formatBitrixComment(TravelCase $travelCase, array $payload, ?FormResponse $formResponse = null): string
    {
        $schema = $travelCase->formTemplate->schema ?? [];
        $fields = $schema['fields'] ?? [];
        $fieldMeta = [];
        foreach ($fields as $field) {
            $id = $field['name'] ?? $field['id'] ?? null;
            $label = $field['label'] ?? $id ?? '';
            if ($id) {
                $type = $field['type'] ?? null;
                $optionsMap = [];

                if ($type === 'select' && !empty($field['options']) && is_array($field['options'])) {
                    foreach ($field['options'] as $opt) {
                        if (is_array($opt)) {
                            $value = $opt['value'] ?? ($opt['label'] ?? null);
                            $optLabel = $opt['label'] ?? ($opt['value'] ?? null);
                        } else {
                            $value = $opt;
                            $optLabel = $opt;
                        }

                        if ($value !== null && $value !== '') {
                            $optionsMap[(string) $value] = (string) $optLabel;
                        }
                    }
                }

                $fieldMeta[$id] = [
                    'label' => $label,
                    'type' => $type,
                    'options' => $optionsMap,
                ];
            }
        }

        $filesByField = [];
        if ($formResponse) {
            $filesByField = $formResponse->files->groupBy('field_id')->map(function ($files) {
                return $files->map(fn (FormFile $f) => [
                    'name' => $f->original_name,
                    'url' => url("/api/public/form/file/{$f->id}"),
                ])->values()->all();
            })->all();
        }

        $templateName = $travelCase->formTemplate->name ?? '—';
        $lines = [
            'Клиент отправил форму',
            'Шаблон: ' . $templateName,
            'Дата: ' . now()->format('d.m.Y H:i'),
            '',
        ];

        foreach ($payload as $fieldId => $value) {
            $meta = $fieldMeta[$fieldId] ?? null;
            $label = $meta['label'] ?? $fieldId;
            $type = $meta['type'] ?? null;
            $options = $meta['options'] ?? [];

            if (is_array($value)) {
                $fileLinks = $filesByField[$fieldId] ?? [];
                if (!empty($fileLinks)) {
                    $lines[] = $label . ':';
                    foreach ($fileLinks as $file) {
                        $lines[] = '  • ' . $file['name'] . ': ' . $file['url'];
                    }
                } elseif ($type === 'select') {
                    $displayValues = [];
                    foreach ($value as $v) {
                        $displayValues[] = $options[(string) $v] ?? (string) $v;
                    }
                    if (!empty($displayValues)) {
                        $lines[] = $label . ': ' . implode(', ', $displayValues);
                    }
                } else {
                    $count = count($value);
                    $lines[] = $label . ': загружено ' . $count . ' ' . $this->pluralFiles($count);
                }
            } elseif ($value !== null && $value !== '') {
                if ($type === 'select') {
                    $displayValue = $options[(string) $value] ?? (string) $value;
                    $lines[] = $label . ': ' . $displayValue;
                } else {
                    $lines[] = $label . ': ' . $value;
                }
            }
        }

        return implode("\n", $lines);
    }

    private function pluralFiles(int $n): string
    {
        $mod10 = $n % 10;
        $mod100 = $n % 100;
        if ($mod10 === 1 && $mod100 !== 11) {
            return 'файл';
        }
        if (in_array($mod10, [2, 3, 4]) && !in_array($mod100, [12, 13, 14])) {
            return 'файла';
        }
        return 'файлов';
    }

    /**
     * Собрать значение для поля PHOTO контакта Bitrix из файлов текущего ответа.
     * Берём одно изображение (последнее по ID), кодируем в base64 и возвращаем в формате fileData.
     *
     * @return array<string, mixed>|null
     */
    private function buildBitrixContactPhotoField(?FormResponse $formResponse): ?array
    {
        if (!$formResponse) {
            return null;
        }

        $imageFile = $formResponse->files()
            ->where('mime_type', 'like', 'image/%')
            ->orderByDesc('id')
            ->first();

        if (!$imageFile) {
            return null;
        }

        if (!Storage::disk('public')->exists($imageFile->file_path)) {
            return null;
        }

        $path = Storage::disk('public')->path($imageFile->file_path);
        $content = @file_get_contents($path);

        if ($content === false) {
            return null;
        }

        $encoded = base64_encode($content);
        $fileName = $imageFile->original_name ?: basename($imageFile->file_path);

        return [
            'fileData' => [$fileName, $encoded],
        ];
    }

    /**
     * Преобразовать данные формы (payload) в поля контакта Bitrix24 для crm.contact.update.
     * Для PHONE и EMAIL обновляет существующие записи по ID (замена значения), а не добавляет новые.
     *
     * @param array<string, mixed>|null $existingContact Текущие данные контакта из Bitrix (для ID телефонов/email)
     * @return array<string, mixed>
     */
    private function payloadToBitrixContactFields(TravelCase $travelCase, array $payload, ?array $existingContact = null): array
    {
        $schema = $travelCase->formTemplate->schema ?? [];
        $fields = $schema['fields'] ?? [];
        $mapping = config('bitrix.field_mapping', []);
        $bitrixFields = [];

        foreach ($fields as $field) {
            $fieldId = $field['name'] ?? $field['id'] ?? null;
            if (!$fieldId || !array_key_exists($fieldId, $payload)) {
                continue;
            }
            $value = $payload[$fieldId];
            if (is_array($value) || $value === null || $value === '') {
                continue;
            }
            $value = trim((string) $value);
            if ($value === '') {
                continue;
            }

            $bitrixField = $field['bitrix_field'] ?? $mapping[$fieldId] ?? $this->guessBitrixFieldFromFormId($fieldId);
            if (!$bitrixField) {
                continue;
            }

            if ($bitrixField === 'PHONE' || $bitrixField === 'EMAIL') {
                $bitrixFields[$bitrixField] = $this->buildMultifieldUpdate(
                    $bitrixField,
                    $value,
                    $existingContact[$bitrixField] ?? null
                );
            } elseif (!empty($field['bitrix_send_as_multiple']) && ($field['type'] ?? '') === 'select') {
                $second = $this->resolveBitrixSecondValueForOption($value, $field);
                // Если второе значение не задано (совпадает с первым) — отправляем одно значение, чтобы в Bitrix не дублировалось
                if ((string) $second === (string) $value) {
                    $bitrixFields[$bitrixField] = $value;
                } else {
                    $values = [$value, $second];
                    $bitrixFields[$bitrixField] = $this->formatBitrixMultipleListValue($values);
                }
            } else {
                $bitrixFields[$bitrixField] = $value;
            }
        }

        return $bitrixFields;
    }

    /**
     * Формат значения для UF_ поля с множественным выбором в Bitrix24.
     * По умолчанию — массив, чтобы оба значения записались в мультиселект.
     *
     * @param array<int, string> $values Массив значений (ID вариантов списка)
     * @return array<int, string|int>|string
     */
    private function formatBitrixMultipleListValue(array $values): array|string
    {
        $values = array_values(array_map('strval', $values));
        $values = array_filter($values, fn ($v) => $v !== '');

        if (config('bitrix.multiple_list_value_as_string', false)) {
            return implode(',', $values);
        }

        $asInteger = config('bitrix.multiple_list_value_as_integer', false);
        if ($asInteger) {
            return array_values(array_map(function ($v) {
                return is_numeric($v) ? (int) $v : $v;
            }, $values));
        }

        return array_values($values);
    }

    /**
     * Для поля «Выбор» с bitrix_send_as_multiple: второе значение для Bitrix берётся из выбранного варианта (option.bitrix_second_value).
     * Если у варианта не задано — возвращается выбранное значение (передаём его дважды).
     */
    private function resolveBitrixSecondValueForOption(string $selectedValue, array $field): string
    {
        $options = $field['options'] ?? [];
        if (!is_array($options)) {
            return $selectedValue;
        }
        foreach ($options as $opt) {
            $optValue = null;
            if (is_array($opt)) {
                $optValue = $opt['value'] ?? $opt['label'] ?? null;
            } elseif (is_scalar($opt)) {
                $optValue = $opt;
            }
            if ((string) $optValue === $selectedValue && is_array($opt)) {
                $second = $opt['bitrix_second_value'] ?? null;
                if ($second !== null && trim((string) $second) !== '') {
                    return trim((string) $second);
                }
                break;
            }
        }
        return $selectedValue;
    }

    /**
     * Собрать массив для обновления мультиполя Bitrix (PHONE/EMAIL): обновить первую запись по ID, остальные удалить.
     *
     * @param mixed $existingValues Текущие значения из crm.contact.get (массив объектов с ID, VALUE, VALUE_TYPE)
     * @return array<int, array<string, mixed>>
     */
    private function buildMultifieldUpdate(string $fieldName, string $newValue, mixed $existingValues): array
    {
        $items = is_array($existingValues) ? $existingValues : [];
        $withIds = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $id = $item['ID'] ?? $item['id'] ?? null;
            if ($id !== null && $id !== '') {
                $withIds[] = (string) $id;
            }
        }

        if (empty($withIds)) {
            return [['VALUE' => $newValue, 'VALUE_TYPE' => 'WORK']];
        }

        $result = [];
        $result[] = ['ID' => (int) $withIds[0], 'VALUE' => $newValue, 'VALUE_TYPE' => 'WORK'];
        for ($i = 1; $i < count($withIds); $i++) {
            $result[] = ['ID' => (int) $withIds[$i], 'DELETE' => 'Y'];
        }
        return $result;
    }

    private function guessBitrixFieldFromFormId(string $fieldId): ?string
    {
        $normalized = strtolower(str_replace(['-', ' ', '_'], '_', $fieldId));
        $map = [
            'first_name' => 'NAME',
            'last_name' => 'LAST_NAME',
            'middle_name' => 'SECOND_NAME',
            'second_name' => 'SECOND_NAME',
            'phone' => 'PHONE',
            'email' => 'EMAIL',
            'address' => 'ADDRESS',
            'address_city' => 'ADDRESS_CITY',
            'address_postal_code' => 'ADDRESS_POSTAL_CODE',
            'address_region' => 'ADDRESS_REGION',
            'address_country' => 'ADDRESS_COUNTRY',
            'birthdate' => 'BIRTHDATE',
            'birth_date' => 'BIRTHDATE',
            'post' => 'POST',
            'comments' => 'COMMENTS',
            'name' => 'NAME',
            'surname' => 'LAST_NAME',
            'telephone' => 'PHONE',
        ];

        return $map[$normalized] ?? null;
    }
}


