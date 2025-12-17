<?php

namespace App\Http\Controllers\Auth;
use Controller;
use JsonResponse;
use User;

final class LogoutController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'data' => null,
        ]);
    }
}
