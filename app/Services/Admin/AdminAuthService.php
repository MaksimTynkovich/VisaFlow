<?php

namespace App\Services\Admin;

use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\NotAdminException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminAuthService
{
    /**
     * Логин админа и получение токена.
     *
     * @param string $email
     * @param string $password
     * @return array{user: User, token: string}
     * @throws InvalidCredentialsException
     * @throws NotAdminException
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw new InvalidCredentialsException();
        }

        if (!in_array($user->role, ['admin', 'manager'], true)) {
            throw new NotAdminException();
        }

        $token = $user->createToken('admin')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
