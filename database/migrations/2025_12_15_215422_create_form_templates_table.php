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
        Schema::create('form_templates', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->foreignId('visa_type_id')->constrained();
            $table->foreignId('created_by')->constrained('users');

            $table->string('name');
            $table->json('schema')->nullable(); // пока пусто или черновик

            $table->string('status')->default('draft');
            // draft | active | archived

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_templates');
    }
};
