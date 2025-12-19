<?php

namespace App\Services\Admin;

use App\Models\TravelCase;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class TravelCaseService
{
    /**
     * Получить список заявок с пагинацией.
     *
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = TravelCase::with(['visaType', 'formTemplate', 'creator']);

        if (isset($filters['visa_type_id']) && $filters['visa_type_id'] !== '') {
            $query->where('visa_type_id', $filters['visa_type_id']);
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('public_token', 'like', "%{$search}%")
                    ->orWhereHas('visaType', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        if (isset($filters['date_from']) && $filters['date_from'] !== '') {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to']) && $filters['date_to'] !== '') {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Создать новую заявку.
     *
     * @param array $data
     * @return TravelCase
     */
    public function create(array $data): TravelCase
    {
        // Генерируем уникальный public_token
        do {
            $token = Str::random(32);
        } while (TravelCase::where('public_token', $token)->exists());

        $data['public_token'] = $token;

        return TravelCase::create($data);
    }

    /**
     * Обновить заявку.
     *
     * @param TravelCase $travelCase
     * @param array $data
     * @return TravelCase
     */
    public function update(TravelCase $travelCase, array $data): TravelCase
    {
        // Если статус меняется на 'filled', устанавливаем filled_at
        if (isset($data['status']) && $data['status'] === 'filled' && !$travelCase->filled_at) {
            $data['filled_at'] = now();
        }

        $travelCase->update($data);
        return $travelCase->fresh(['visaType', 'formTemplate', 'creator']);
    }

    /**
     * Удалить заявку (soft delete).
     *
     * @param TravelCase $travelCase
     * @return bool
     */
    public function delete(TravelCase $travelCase): bool
    {
        return $travelCase->delete();
    }

    /**
     * Получить заявку по ID.
     *
     * @param int $id
     * @return TravelCase|null
     */
    public function find(int $id): ?TravelCase
    {
        return TravelCase::with(['visaType', 'formTemplate', 'creator', 'formResponses'])
            ->find($id);
    }

    /**
     * Получить заявку по public_token.
     *
     * @param string $token
     * @return TravelCase|null
     */
    public function findByToken(string $token): ?TravelCase
    {
        return TravelCase::with(['visaType', 'formTemplate'])
            ->where('public_token', $token)
            ->first();
    }
}


