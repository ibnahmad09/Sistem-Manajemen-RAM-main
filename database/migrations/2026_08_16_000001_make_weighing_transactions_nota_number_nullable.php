<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
        $rows = DB::table('weighing_transactions')
            ->whereNull('nota_number')
            ->pluck('id');

        foreach ($rows as $i => $id) {
            DB::table('weighing_transactions')
                ->where('id', $id)
                ->update(['nota_number' => 'DRAFT-DELETED-'.$i]);
        }

        Schema::table('weighing_transactions', function (Blueprint $table) {
            $table->string('nota_number')->nullable(false)->change();
        });
    }
};
