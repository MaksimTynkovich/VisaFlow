<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Bitrix\BitrixApiService;
use Illuminate\Http\JsonResponse;

class BitrixController extends Controller
{
    public function __construct(
        private readonly BitrixApiService $bitrixApi
    ) {
    }

    /**
     * Список полей контакта Bitrix24 для маппинга в форме (код поля + название).
     * Используется в редакторе шаблона формы для выбора «Поле Bitrix».
     * Данные кэшируются. Передайте ?refresh=1 для принудительного обновления списка из Bitrix.
     */
    public function contactFields(\Illuminate\Http\Request $request): JsonResponse
    {
        $refresh = $request->boolean('refresh');
        $fields = $this->bitrixApi->getContactFields($refresh);

        return response()->json([
            'data' => $fields,
        ]);
    }

    /**
     * Варианты выбора для поля контакта Bitrix (для полей типа список).
     * Используется при создании поля «Выбор» с привязкой к полю Bitrix — подгрузка вариантов из Битрикса.
     */
    public function contactFieldOptions(string $fieldCode): JsonResponse
    {
        $options = $this->bitrixApi->getContactFieldOptions($fieldCode);

        return response()->json([
            'data' => $options,
        ]);
    }

    /**
     * Список полей сделки Bitrix24 для маппинга в форме (код поля + название).
     * Кэшируется. ?refresh=1 — принудительно обновить из Bitrix.
     */
    public function dealFields(\Illuminate\Http\Request $request): JsonResponse
    {
        $refresh = $request->boolean('refresh');
        $fields = $this->bitrixApi->getDealFields($refresh);

        return response()->json([
            'data' => $fields,
        ]);
    }

    /**
     * Варианты выбора для поля сделки Bitrix (списки / пользовательские поля).
     */
    public function dealFieldOptions(string $fieldCode): JsonResponse
    {
        $options = $this->bitrixApi->getDealFieldOptions($fieldCode);

        return response()->json([
            'data' => $options,
        ]);
    }
}
