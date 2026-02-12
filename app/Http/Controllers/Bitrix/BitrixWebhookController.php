<?php

namespace App\Http\Controllers\Bitrix;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bitrix\CreateFormFromDealRequest;
use App\Services\Bitrix\BitrixFormFromDealService;
use Illuminate\Http\JsonResponse;

class BitrixWebhookController extends Controller
{
    public function __construct(
        private readonly BitrixFormFromDealService $bitrixFormService
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
}
