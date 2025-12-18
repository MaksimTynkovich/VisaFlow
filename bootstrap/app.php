<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\EnsureAdmin;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'admin' => EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'error' => [
                        'message' => 'Ошибка валидации',
                        'code' => 422,
                        'details' => $e->errors(),
                    ],
                ], 422);
            }
        });

        $exceptions->render(function (\Exception $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $code = $e->getCode() ?: 500;
                $code = $code >= 400 && $code < 600 ? $code : 500;

                return response()->json([
                    'error' => [
                        'message' => $e->getMessage(),
                        'code' => $code,
                        'details' => [],
                    ],
                ], $code);
            }
        });
    })->create();
