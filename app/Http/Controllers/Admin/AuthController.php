<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Resources\Admin\AdminUserResource;
use App\Services\Admin\AdminAuthService;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function __construct(private AdminAuthService $authService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            $result = $this->authService->login($data['email'], $data['password']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => [
                    'message' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'details' => [],
                ]
            ], $e->getCode() ?: 400);
        }

        return response()->json([
            'data' => [
                'user' => new AdminUserResource($result['user']),
                'token' => $result['token'],
            ],
        ]);
    }
}
