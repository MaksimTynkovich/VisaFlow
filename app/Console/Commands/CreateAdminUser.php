<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create {email} {password}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Создать или обновить пользователя с правами админа';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');
        $password = $this->argument('password');

        // Проверяем, существует ли уже пользователь с таким email
        $user = User::withTrashed()->where('email', $email)->first();

        if ($user) {
            // Восстанавливаем, если был удалён
            if ($user->trashed()) {
                $user->restore();
            }

            // Обновляем существующего пользователя
            $user->update([
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make($password),
                'role' => 'admin',
            ]);
            $this->info("Пользователь {$email} обновлён с правами админа");
        } else {
            // Создаём нового пользователя
            User::create([
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'admin',
            ]);
            $this->info("Пользователь {$email} создан с правами админа");
        }

        return Command::SUCCESS;
    }
}
