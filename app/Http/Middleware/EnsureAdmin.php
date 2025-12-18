<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle($request, \Closure $next)
    {
        $user = $request->user('admin');

        if (! $user || ! in_array($user->role, ['admin', 'manager'])) {
            abort(403);
        }

        return $next($request);
    }
}
