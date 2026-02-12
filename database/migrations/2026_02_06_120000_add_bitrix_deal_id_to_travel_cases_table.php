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
        Schema::table('travel_cases', function (Blueprint $table) {
            $table->string('bitrix_deal_id')->nullable()->index()->after('public_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('travel_cases', function (Blueprint $table) {
            $table->dropColumn('bitrix_deal_id');
        });
    }
};
