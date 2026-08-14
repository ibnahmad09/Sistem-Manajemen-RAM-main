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
        Schema::create('cashier_cash_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            $table->string('cashier_name_snapshot');
            $table->enum('type', ['cash_in', 'expense', 'farmer_payment']);
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['cash', 'transfer']);
            $table->string('category'); // modal_kasir, bayar_petani, admin_bank, lain_lain
            $table->text('description')->nullable();
            $table->foreignId('transaction_id')->nullable()->constrained('weighing_transactions')->onDelete('set null');
            $table->timestamp('entry_date');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index('cashier_id');
            $table->index('entry_date');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_cash_entries');
    }
};
