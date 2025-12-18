<?php

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminAuthService
{
    /**
     * Логин админа и получение токена
     *
     * @param string $email
     * @param string $password
     * @return array
     * @throws \Exception
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw new \Exception('Invalid credentials', 401);
        }

        if (! in_array($user->role, ['admin', 'manager'])) {
            throw new \Exception('Not an admin', 403);
        }

        $token = $user->createToken('admin')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
