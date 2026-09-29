<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Commit ba5ef1c — the commit that flipped the order from deduction-first
     * to sorting-first. Transactions created before this were calculated with
     * the deduction-first logic.
     */
    private const SORTING_FIRST_COMMIT_AT = '2026-09-25 15:49:58';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->string('sorting_order', 20)
                ->default('sortiran_dulu')
                ->after('sorting_price_per_kg')
                ->comment('Urutan potong sortiran: sortiran_dulu | potongan_dulu');
        });

        DB::table('weighing_transactions')
            ->where('created_at', '<', self::SORTING_FIRST_COMMIT_AT)
            ->update(['sorting_order' => 'potongan_dulu']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->dropColumn('sorting_order');
        });
    }
};
