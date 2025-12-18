<?php

namespace App\Policies;

use App\Models\TravelCase;
use App\Models\User;

final class TravelCasePolicy
{
    public function view(User $user, TravelCase $travelCase): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return $travelCase->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'user'], true);
    }
}
