<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Public\PublicFormController;

Route::post('/admin/auth/login', [AuthController::class, 'login']);

// Публичные роуты для форм
Route::get('/public/form/{token}', [PublicFormController::class, 'show']);
Route::post('/public/form/{token}/submit', [PublicFormController::class, 'submit']);

Route::prefix('admin')
    ->middleware(['auth:admin', 'admin'])
    ->group(function () {

        Route::get('/me', function (\Illuminate\Http\Request $request) {
            return $request->user();
        });

        Route::apiResource('visa-types', \App\Http\Controllers\Admin\VisaTypeController::class);
        Route::get('visa-types/active/list', [\App\Http\Controllers\Admin\VisaTypeController::class, 'active']);

        Route::apiResource('form-templates', \App\Http\Controllers\Admin\FormTemplateController::class);
        Route::get('form-templates/active/list', [\App\Http\Controllers\Admin\FormTemplateController::class, 'active']);

        Route::apiResource('travel-cases', \App\Http\Controllers\Admin\TravelCaseController::class);
    });
