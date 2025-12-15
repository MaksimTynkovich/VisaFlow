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
        Schema::create('case_accesses', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->foreignId('travel_case_id')->constrained();
            $table->foreignId('user_id')->constrained();

            $table->string('role');
            // owner | admin | manager

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['travel_case_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('case_accesses');
    }
};
