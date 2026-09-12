<?php

use App\Models\FarmerDebt;
use App\Models\User;
use App\Models\WeighingTransaction;

test('store finalize rejects debt payment exceeding gross total', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'debt_paid_amount' => 3000000,
    ]) + ['action' => 'finalize']);

    $response->assertRedirect()
        ->assertSessionHasErrors('error');

    expect(WeighingTransaction::count())->toBe(0);
});

test('update draft rejects debt payment exceeding gross total', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull();

    $response = $this->actingAs($cashier)->put(route('weighing.update', $draft), weighingFormData($farmer, [
        'debt_paid_amount' => 3000000,
    ]) + ['action' => 'finalize']);

    $response->assertRedirect()
        ->assertSessionHasErrors('error');

    $draft->refresh();

    expect($draft->status)->toBe('draft')
        ->and($draft->debt_paid_amount)->toBe('0.00');
});

test('finalize draft rejects debt payment exceeding gross total', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull();

    // Simulate a legacy draft created before the guard existed (debt > gross).
    $draft->update(['debt_paid_amount' => 3000000]);

    $response = $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    $response->assertRedirect()
        ->assertSessionHasErrors('error');

    $draft->refresh();

    expect($draft->status)->toBe('draft');
});

test('store finalize succeeds when debt payment does not exceed gross total', function () {
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

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'debt_paid_amount' => 100000,
    ]) + ['action' => 'finalize']);

    $response->assertRedirect(route('weighing.success', ['nota' => 'HND-'.now()->format('Ymd').'-0001']));

    $transaction = WeighingTransaction::first();

    expect($transaction)->not->toBeNull()
        ->and($transaction->status)->toBe('printed')
        ->and($transaction->debt_paid_amount)->toBe('100000.00')
        ->and($transaction->remaining_debt_amount)->toBe('400000.00');
});
