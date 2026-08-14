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
        Schema::create('weighing_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('nota_number')->unique();
            $table->foreignId('farmer_id')->constrained('farmers')->onDelete('cascade');
            $table->string('farmer_name_snapshot');
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            $table->string('cashier_name_snapshot');
            $table->timestamp('transaction_date');

            // Weight measurements
            $table->decimal('gross_weight', 10, 2)->comment('Berat Bruto');
            $table->decimal('tare_weight', 10, 2)->comment('Berat Tara');
            $table->decimal('initial_weight', 10, 2)->comment('Netto Kotor (Bruto - Tara)');

            // Deduction
            $table->boolean('has_deduction')->default(true);
            $table->decimal('deduction_percentage', 5, 2)->default(3.00);
            $table->decimal('deduction_weight', 10, 2)->default(0);
            $table->decimal('net_weight', 10, 2)->comment('Berat Bersih setelah potongan');

            // Palm pricing
            $table->decimal('palm_price_per_kg', 10, 2);
            $table->decimal('palm_total_amount', 15, 2);

            // Sorting (optional)
            $table->boolean('has_sorting')->default(false);
            $table->decimal('sorting_weight', 10, 2)->default(0);
            $table->decimal('sorting_price_per_kg', 10, 2)->default(0);
            $table->decimal('sorting_total_amount', 15, 2)->default(0);

            // Total calculation
            $table->decimal('gross_total_amount', 15, 2)->comment('Total Kotor (Palm + Sorting)');

            // Debt handling
            $table->decimal('previous_debt_amount', 15, 2)->default(0);
            $table->decimal('debt_paid_amount', 15, 2)->default(0);
            $table->decimal('remaining_debt_amount', 15, 2)->default(0);

            // Final payment
            $table->decimal('final_paid_amount', 15, 2)->comment('Total - Debt Paid');
            $table->decimal('final_paid_amount_rounded', 15, 2)->comment('After rounding');
            $table->enum('payment_method', ['cash', 'transfer'])->default('cash');
            $table->boolean('cashier_balance_deducted')->default(true);

            // Status & revision
            $table->enum('status', ['draft', 'printed', 'revised', 'cancelled'])->default('printed');
            $table->timestamp('printed_at')->nullable();
            $table->foreignId('revision_of')->nullable()->constrained('weighing_transactions')->onDelete('set null');
            $table->integer('revision_number')->default(0);
            $table->text('revision_reason')->nullable();
            $table->boolean('is_latest_version')->default(true);

            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Indexes
            $table->index('farmer_id');
            $table->index('cashier_id');
            $table->index('transaction_date');
            $table->index('status');
            $table->index('nota_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weighing_transactions');
    }
};
