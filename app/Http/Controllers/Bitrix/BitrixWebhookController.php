<?php

namespace App\Http\Controllers\Bitrix;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bitrix\CreateFormFromDealRequest;
use App\Http\Requests\Bitrix\CreateSpainVisaPdfRequest;
use App\Services\Bitrix\BitrixApiService;
use App\Services\Bitrix\BitrixFormFromDealService;
use App\Services\Bitrix\BitrixSpainVisaPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class BitrixWebhookController extends Controller
{
    public function __construct(
        private readonly BitrixApiService $bitrixApi,
        private readonly BitrixFormFromDealService $bitrixFormService,
        private readonly BitrixSpainVisaPdfService $bitrixSpainVisaPdfService
    ) {
    }

    /**
     * Создать форму из сделки Bitrix24.
     *
     * Вызывается по нажатию кнопки в Bitrix (или из сторонней интеграции).
     * Поддерживает GET и POST с параметром deal_id.
     */
    public function createFormFromDeal(CreateFormFromDealRequest $request): JsonResponse
    {
        $result = $this->bitrixFormService->createFormFromDeal(
            $request->input('deal_id'),
            $request->input('form_template_id')
        );

        if (!$result) {
            $message = config('app.debug')
                ? ($this->bitrixFormService->getLastError() ?? 'Неизвестная ошибка')
                : 'Не удалось создать форму. Проверьте настройки Bitrix и наличие deal/contact.';

            return response()->json([
                'error' => [
                    'message' => $message,
                    'code' => 500,
                    'details' => config('app.debug') ? [
                        'hint' => 'Подробности в storage/logs/laravel.log при вызовах Bitrix API',
                    ] : [],
                ],
            ], 500);
        }

        return response()->json([
            'data' => [
                'travel_case_id' => $result['travel_case']->id,
                'token' => $result['token'],
                'form_url' => $result['form_url'],
                'bitrix_deal_id' => $result['travel_case']->bitrix_deal_id,
            ],
        ], 201);
    }

    /**
     * Сгенерировать заполненную PDF-анкету Испании и загрузить в сделку Bitrix.
     */
    public function createSpainVisaPdf(CreateSpainVisaPdfRequest $request): JsonResponse
    {
        $dealId = (int) $request->input('deal_id');

        try {
            $result = $this->bitrixSpainVisaPdfService->generateFromDeal($dealId);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => [
                    'message' => $e->getMessage(),
                    'code' => 500,
                ],
            ], 500);
        }

        $pdfPath = (string) ($result['output_path'] ?? '');
        $pdfBinary = @file_get_contents($pdfPath);
        if ($pdfPath === '' || $pdfBinary === false) {
            return response()->json([
                'error' => [
                    'message' => 'Не удалось прочитать сгенерированный PDF.',
                    'code' => 500,
                ],
            ], 500);
        }

        $pdfBase64 = base64_encode($pdfBinary);
        $title = $this->buildSpainVisaDocumentTitle((array) ($result['contact'] ?? []));
        $number = now()->format('dmY') . '-1';

        $uploadResult = $this->bitrixApi->uploadDealDocument(
            $dealId,
            $pdfBase64,
            $pdfBase64,
            $title,
            $number
        );

        @unlink($pdfPath);

        if ($uploadResult === null) {
            Log::warning('Failed to upload Spain visa PDF document to Bitrix document generator', [
                'deal_id' => $dealId,
                'title' => $title,
                'number' => $number,
            ]);

            return response()->json([
                'error' => [
                    'message' => 'Не удалось загрузить документ в сделку Bitrix.',
                    'code' => 500,
                ],
            ], 500);
        }

        return response()->json([
            'data' => [
                'deal_id' => $dealId,
                'title' => $title,
                'number' => $number,
                'filename' => (string) ($result['filename'] ?? ''),
                'document' => $uploadResult,
            ],
        ], 201);
    }

    /**
     * @param array<string, mixed> $contact
     */
    private function buildSpainVisaDocumentTitle(array $contact): string
    {
        $lastName = trim((string) ($contact['UF_CRM_1471683129'] ?? $contact['LAST_NAME'] ?? ''));
        $firstName = trim((string) ($contact['UF_CRM_1471683145'] ?? $contact['NAME'] ?? ''));
        $passportNo = trim((string) ($contact['UF_CRM_1470546337'] ?? $contact['UF_CRM_PASSPORT_NO'] ?? ''));

        $name = trim($lastName . ' ' . $firstName);
        $parts = array_values(array_filter([
            'Schengen Spain',
            $name,
            $passportNo,
        ], static fn (string $value): bool => $value !== ''));

        return implode(', ', $parts);
    }
}
