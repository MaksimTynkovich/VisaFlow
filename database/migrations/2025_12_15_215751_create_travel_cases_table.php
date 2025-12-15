<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('travel_cases', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            // сейчас null, позже self-service

            $table->foreignId('created_by')->constrained('users');
            // админ сейчас, пользователь позже

            $table->foreignId('visa_type_id')->constrained();
            $table->foreignId('form_template_id')->constrained();

            $table->string('public_token')->unique();

            $table->string('status')->default('new');
            // new | filled | archived (пока минимум)

            $table->timestamp('filled_at')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('travel_cases');
    }
};
