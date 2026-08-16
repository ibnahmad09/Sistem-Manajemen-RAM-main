<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('weighing_loads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weighing_transaction_id')->constrained('weighing_transactions')->onDelete('cascade');
            $table->unsignedInteger('seq_no')->default(1);

            // Weight measurements (per load)
            $table->decimal('gross_weight', 10, 2)->comment('Berat Bruto muatan');
            $table->decimal('tare_weight', 10, 2)->comment('Berat Tara muatan');
            $table->decimal('initial_weight', 10, 2)->comment('Netto Kotor (Bruto - Tara)');
            $table->decimal('deduction_weight', 10, 2)->default(0)->comment('Potongan (kg) muatan');
            $table->decimal('net_weight', 10, 2)->comment('Berat Bersih muatan');

            // Sorting (per load, optional)
            $table->boolean('has_sorting')->default(false);
            $table->decimal('sorting_weight', 10, 2)->default(0);
            $table->decimal('sorting_price_per_kg', 10, 2)->default(0);
            $table->decimal('sorting_total_amount', 15, 2)->default(0);

            $table->timestamps();

            $table->index('weighing_transaction_id');
        });

        // Backfill existing single-load transactions into weighing_loads
        $transactions = DB::table('weighing_transactions')->get();

        foreach ($transactions as $tx) {
            DB::table('weighing_loads')->insert([
                'weighing_transaction_id' => $tx->id,
                'seq_no' => 1,
                'gross_weight' => $tx->gross_weight,
                'tare_weight' => $tx->tare_weight,
                'initial_weight' => $tx->initial_weight,
                'deduction_weight' => $tx->deduction_weight,
                'net_weight' => $tx->net_weight,
                'has_sorting' => $tx->has_sorting,
                'sorting_weight' => $tx->sorting_weight,
                'sorting_price_per_kg' => $tx->sorting_price_per_kg,
                'sorting_total_amount' => $tx->sorting_total_amount,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weighing_loads');
    }
};
