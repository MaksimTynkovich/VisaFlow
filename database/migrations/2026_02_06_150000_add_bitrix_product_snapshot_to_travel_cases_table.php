<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('travel_cases', function (Blueprint $table) {
            $table->json('bitrix_product_snapshot')->nullable()->after('bitrix_deal_id');
        });
    }

    public function down(): void
    {
        Schema::table('travel_cases', function (Blueprint $table) {
            $table->dropColumn('bitrix_product_snapshot');
        });
    }
};
