<?php

use Illuminate\Support\Facades\Route;
use \App\Http\Controllers\Admin\AuthController;

Route::post('/admin/auth/login', [AuthController::class, 'login']);

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

        // travel-cases
    });
