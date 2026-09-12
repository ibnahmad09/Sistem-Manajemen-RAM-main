<?php

use App\Models\FarmerDebt;
use App\Models\User;
use App\Models\WeighingTransaction;

test('draft preserves debt_paid_amount instead of zeroing it', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'debt_paid_amount' => 100000,
    ]) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull()
        ->and($draft->status)->toBe('draft')
        ->and($draft->debt_paid_amount)->toBe('100000.00');
});

test('finalizing a draft with preserved debt creates the payment record', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    FarmerDebt::create([
        'farmer_id' => $farmer->id,
        'farmer_name_snapshot' => $farmer->name,
        'type' => 'loan',
        'amount' => 500000,
        'debt_date' => now(),
        'description' => 'Pinjaman awal',
        'created_by' => $cashier->id,
    ]);

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'debt_paid_amount' => 100000,
    ]) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft->debt_paid_amount)->toBe('100000.00');

    $response = $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    $response->assertRedirect();

    $draft->refresh();

    expect($draft->status)->toBe('printed')
        ->and($draft->debt_paid_amount)->toBe('100000.00');

    expect(FarmerDebt::where('type', 'payment')->latest()->first()->amount)->toBe('100000.00');
});

test('draft without debt payment keeps debt_paid_amount at zero', function ($debtPaidAmount) {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'debt_paid_amount' => $debtPaidAmount,
    ]) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull()
        ->and($draft->debt_paid_amount)->toBe('0.00');
})->with([
    'zero' => 0,
    'null' => null,
]);
