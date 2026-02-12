<?php

namespace App\Providers;

use App\Policies\TravelCasePolicy;
use App\Services\Bitrix\BitrixApiService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    protected $policies = [
         \App\Models\Model::class => TravelCasePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(BitrixApiService::class, function () {
            return new BitrixApiService(
                config('bitrix.webhook_url', ''),
                config('bitrix.timeout', 10),
                config('bitrix.method_suffix', '')
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
