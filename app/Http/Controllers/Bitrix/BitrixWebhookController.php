<?php

namespace App\Http\Controllers\Bitrix;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bitrix\CreateFormFromDealRequest;
use App\Http\Requests\Bitrix\CreateSpainVisaPdfRequest;
use App\Services\Bitrix\BitrixFormFromDealService;
use App\Services\Bitrix\BitrixSpainVisaPdfService;
use Illuminate\Http\JsonResponse;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BitrixWebhookController extends Controller
{
    public function __construct(
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
     * Сгенерировать заполненную PDF-анкету Испании и сразу отдать на скачивание.
     */
    public function createSpainVisaPdf(CreateSpainVisaPdfRequest $request): BinaryFileResponse|JsonResponse
    {
        try {
            $result = $this->bitrixSpainVisaPdfService->generateFromDeal((int) $request->input('deal_id'));
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => [
                    'message' => $e->getMessage(),
                    'code' => 500,
                ],
            ], 500);
        }

        return response()
            ->download($result['output_path'], $result['filename'], [
                'Content-Type' => 'application/pdf',
            ])
            ->deleteFileAfterSend(true);
    }
}
