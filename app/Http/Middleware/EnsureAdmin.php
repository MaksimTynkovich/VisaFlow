<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Проверяем, что пользователь аутентифицирован через guard 'admin'
        $user = $request->user('admin');

        if (!$user) {
            return response()->json([
                'error' => [
                    'message' => 'Требуется авторизация',
                    'code' => 401,
                    'details' => [],
                ],
            ], 401);
        }

        // Проверяем, что пользователь имеет роль admin или manager
        if (!in_array($user->role, ['admin', 'manager'], true)) {
            return response()->json([
                'error' => [
                    'message' => 'Доступ запрещён',
                    'code' => 403,
                    'details' => [],
                ],
            ], 403);
        }

        return $next($request);
    }
}
