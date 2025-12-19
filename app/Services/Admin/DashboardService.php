<?php

namespace App\Services\Admin;

use App\Models\FormTemplate;
use App\Models\TravelCase;
use App\Models\VisaType;

class DashboardService
{
    /**
     * Получить статистику для Dashboard.
     *
     * @return array
     */
    public function getStatistics(): array
    {
        return [
            'visa_types' => [
                'total' => VisaType::count(),
                'active' => VisaType::where('is_active', true)->count(),
            ],
            'travel_cases' => [
                'total' => TravelCase::count(),
                'new' => TravelCase::where('status', 'new')->count(),
                'filled' => TravelCase::where('status', 'filled')->count(),
                'archived' => TravelCase::where('status', 'archived')->count(),
            ],
            'form_templates' => [
                'total' => FormTemplate::count(),
                'active' => FormTemplate::where('status', 'active')->count(),
            ],
        ];
    }
}

