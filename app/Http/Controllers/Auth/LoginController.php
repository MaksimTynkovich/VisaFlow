<?php

final class LoginController extends Controller
{
    public function __invoke(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->validated())) {
            return response()->json([
                'error' => [
                    'message' => 'Invalid credentials',
                    'code' => 401,
                    'details' => [],
                ],
            ], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ]);
    }
}
