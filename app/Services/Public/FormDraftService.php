<?php

namespace App\Services\Public;

use App\Models\FormDraft;
use App\Models\TravelCase;
use Carbon\Carbon;

class FormDraftService
{
    /**
     * Сохранить или обновить черновик формы.
     *
     * @param string $token
     * @param array $formData
     * @return FormDraft
     */
    public function saveDraft(string $token, array $formData): FormDraft
    {
        $travelCase = TravelCase::where('public_token', $token)->firstOrFail();

        // Удаляем старый черновик для этого токена (если есть)
        FormDraft::where('travel_case_id', $travelCase->id)
            ->where('public_token', $token)
            ->delete();

        // Создаём новый черновик
        return FormDraft::create([
            'travel_case_id' => $travelCase->id,
            'public_token' => $token,
            'form_data' => $formData,
            'expires_at' => Carbon::now()->addDays(30),
        ]);
    }

    /**
     * Получить черновик по токену.
     *
     * @param string $token
     * @return FormDraft|null
     */
    public function getDraft(string $token): ?FormDraft
    {
        $travelCase = TravelCase::where('public_token', $token)->first();
        
        if (!$travelCase) {
            return null;
        }

        return FormDraft::where('travel_case_id', $travelCase->id)
            ->where('public_token', $token)
            ->where('expires_at', '>', Carbon::now())
            ->orderBy('updated_at', 'desc')
            ->first();
    }

    /**
     * Удалить черновик после успешной отправки формы.
     *
     * @param string $token
     * @return bool
     */
    public function deleteDraft(string $token): bool
    {
        $travelCase = TravelCase::where('public_token', $token)->first();
        
        if (!$travelCase) {
            return false;
        }

        return FormDraft::where('travel_case_id', $travelCase->id)
            ->where('public_token', $token)
            ->delete() > 0;
    }

    /**
     * Очистить истёкшие черновики.
     *
     * @return int Количество удалённых черновиков
     */
    public function cleanupExpired(): int
    {
        return FormDraft::where('expires_at', '<', Carbon::now())->delete();
    }
}

