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

        // visa-types, form-templates, travel-cases
    });
