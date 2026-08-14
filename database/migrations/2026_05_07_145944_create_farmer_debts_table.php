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
        Schema::create('farmer_debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_id')->constrained('farmers')->onDelete('cascade');
            $table->string('farmer_name_snapshot');
            $table->enum('type', ['loan', 'payment', 'adjustment']);
            $table->decimal('amount', 15, 2);
            $table->timestamp('debt_date');
            $table->text('description')->nullable();
            $table->foreignId('transaction_id')->nullable()->constrained('weighing_transactions')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index('farmer_id');
            $table->index('debt_date');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('farmer_debts');
    }
};
