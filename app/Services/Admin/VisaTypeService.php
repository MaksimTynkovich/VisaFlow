<?php

namespace App\Services\Admin;

use App\Models\VisaType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class VisaTypeService
{
    /**
     * Получить список типов виз с пагинацией.
     *
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = VisaType::query();

        if (isset($filters['country']) && $filters['country'] !== '') {
            $query->where('country', $filters['country']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (isset($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('country', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Получить все активные типы виз.
     *
     * @return Collection
     */
    public function getActive(): Collection
    {
        return VisaType::where('is_active', true)->orderBy('name')->get();
    }

    /**
     * Создать новый тип визы.
     *
     * @param array $data
     * @return VisaType
     */
    public function create(array $data): VisaType
    {
        return VisaType::create($data);
    }

    /**
     * Обновить тип визы.
     *
     * @param VisaType $visaType
     * @param array $data
     * @return VisaType
     */
    public function update(VisaType $visaType, array $data): VisaType
    {
        $visaType->update($data);
        return $visaType->fresh();
    }

    /**
     * Удалить тип визы (soft delete).
     *
     * @param VisaType $visaType
     * @return bool
     */
    public function delete(VisaType $visaType): bool
    {
        return $visaType->delete();
    }

    /**
     * Получить тип визы по ID.
     *
     * @param int $id
     * @return VisaType|null
     */
    public function find(int $id): ?VisaType
    {
        return VisaType::find($id);
    }
}

