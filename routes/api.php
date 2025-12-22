<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Public\PublicFormController;

Route::post('/admin/auth/login', [AuthController::class, 'login']);

// Публичные роуты для форм
Route::get('/public/form/{token}', [PublicFormController::class, 'show']);
Route::get('/public/form/{token}/last-submission', [PublicFormController::class, 'getLastSubmission']);
Route::post('/public/form/{token}/upload-file', [PublicFormController::class, 'uploadFile']);
Route::get('/public/form/file/{fileId}', [PublicFormController::class, 'getFile']);
Route::post('/public/form/{token}/submit', [PublicFormController::class, 'submit']);

// Публичные роуты для черновиков форм
Route::get('/public/form/{token}/draft', [\App\Http\Controllers\Public\FormDraftController::class, 'get']);
Route::post('/public/form/{token}/draft', [\App\Http\Controllers\Public\FormDraftController::class, 'save']);
Route::delete('/public/form/{token}/draft', [\App\Http\Controllers\Public\FormDraftController::class, 'delete']);

Route::prefix('admin')
    ->middleware(['auth:admin', 'admin'])
    ->group(function () {

        Route::get('/me', function (\Illuminate\Http\Request $request) {
            return new \App\Http\Resources\Admin\AdminUserResource($request->user());
        });

        Route::get('/statistics', [DashboardController::class, 'statistics']);

        Route::apiResource('visa-types', \App\Http\Controllers\Admin\VisaTypeController::class);
        Route::get('visa-types/active/list', [\App\Http\Controllers\Admin\VisaTypeController::class, 'active']);

        Route::apiResource('form-templates', \App\Http\Controllers\Admin\FormTemplateController::class);
        Route::get('form-templates/active/list', [\App\Http\Controllers\Admin\FormTemplateController::class, 'active']);

        Route::apiResource('travel-cases', \App\Http\Controllers\Admin\TravelCaseController::class);
    });
