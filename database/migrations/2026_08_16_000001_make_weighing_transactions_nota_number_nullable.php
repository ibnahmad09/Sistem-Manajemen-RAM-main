<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Draft transactions do not have a nota number yet.
     */
    public function up(): void
    {
        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->string('nota_number')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->string('nota_number')->nullable(false)->change();
        });
    }
};
