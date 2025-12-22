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
        Schema::create('form_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_response_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('field_id'); // ID поля из схемы формы
            $table->string('original_name'); // Оригинальное имя файла
            $table->string('file_path'); // Путь к файлу в storage
            $table->string('mime_type')->nullable(); // MIME тип файла
            $table->unsignedBigInteger('file_size')->nullable(); // Размер файла в байтах
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_files');
    }
};
