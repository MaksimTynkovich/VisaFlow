<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): mixed
    {
        if ($request->user()?->role !== $role) {
            return response()->json([
                'error' => [
                    'message' => 'Forbidden',
                    'code' => 403,
                    'details' => [],
                ],
            ], 403);
        }

        return $next($request);
    }
}

