<?php

namespace App\Services\Admin;

use App\Models\FormTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class FormTemplateService
{
    /**
     * Получить список шаблонов форм с пагинацией.
     *
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = FormTemplate::with(['visaType', 'creator']);

        if (isset($filters['visa_type_id']) && $filters['visa_type_id'] !== '') {
            $query->where('visa_type_id', $filters['visa_type_id']);
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('visaType', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Получить все активные шаблоны форм.
     *
     * @return Collection
     */
    public function getActive(): Collection
    {
        return FormTemplate::with('visaType')
            ->where('status', 'active')
            ->orderBy('name')
            ->get();
    }

    /**
     * Создать новый шаблон формы.
     *
     * @param array $data
     * @return FormTemplate
     */
    public function create(array $data): FormTemplate
    {
        return FormTemplate::create($data);
    }

    /**
     * Обновить шаблон формы.
     *
     * @param FormTemplate $formTemplate
     * @param array $data
     * @return FormTemplate
     */
    public function update(FormTemplate $formTemplate, array $data): FormTemplate
    {
        $formTemplate->update($data);
        return $formTemplate->fresh(['visaType', 'creator']);
    }

    /**
     * Удалить шаблон формы (soft delete).
     *
     * @param FormTemplate $formTemplate
     * @return bool
     */
    public function delete(FormTemplate $formTemplate): bool
    {
        return $formTemplate->delete();
    }

    /**
     * Получить шаблон формы по ID.
     *
     * @param int $id
     * @return FormTemplate|null
     */
    public function find(int $id): ?FormTemplate
    {
        return FormTemplate::with(['visaType', 'creator'])->find($id);
    }
}

