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
        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->decimal('sorting_deduction_percentage', 5, 2)->default(0.00);
            $table->decimal('sorting_deduction_weight', 10, 2)->default(0.00);
            $table->decimal('sorting_net_weight', 10, 2)->default(0.00);
        });

        Schema::table('weighing_loads', function (Blueprint $table) {
            $table->decimal('sorting_deduction_weight', 10, 2)->default(0.00);
            $table->decimal('sorting_net_weight', 10, 2)->default(0.00);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weighing_loads', function (Blueprint $table) {
            $table->dropColumn(['sorting_net_weight', 'sorting_deduction_weight']);
        });

        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->dropColumn(['sorting_net_weight', 'sorting_deduction_weight', 'sorting_deduction_percentage']);
        });
    }
};
