<?php

use App\Models\CashierCashEntry;
use App\Models\FarmerDebt;
use App\Models\User;
use App\Models\WeighingTransaction;

test('edit page renders latest printed transaction', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'finalize']);

    $transaction = WeighingTransaction::first();

    $this->actingAs($cashier)
        ->get(route('weighing.edit', $transaction))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Weighing/Form')
            ->where('transaction.nota_number', 'HND-'.now()->format('Ymd').'-0001'));
});

test('revisi transaksi final membuat nota baru + mengarsipkan lama', function () {
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
    ]) + ['action' => 'finalize']);

    $old = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->put(route('weighing.update', $old), weighingFormData($farmer, [
        'debt_paid_amount' => 200000,
    ]) + ['revision_reason' => 'Koreksi berat muatan']);

    $response->assertRedirect();

    $new = WeighingTransaction::where('is_latest_version', true)->first();

    expect($new)->not->toBeNull()
        ->and($new->id)->not->toBe($old->id)
        ->and($new->status)->toBe('printed')
        ->and($new->is_latest_version)->toBeTrue()
        ->and($new->revision_of)->toBe($old->id)
        ->and($new->revision_number)->toBe($old->revision_number + 1)
        ->and($new->revision_reason)->toBe('Koreksi berat muatan')
        ->and($new->nota_number)->toBe('HND-'.now()->format('Ymd').'-0002')
        ->and($new->nota_number)->not->toBe($old->nota_number);

    $old->refresh();

    expect($old->status)->toBe('revised')
        ->and($old->is_latest_version)->toBeFalse()
        ->and($old->cashier_balance_deducted)->toBeFalse();

    // Cash entries: original (+1902080) + reversal (-1902080) untuk tx lama, +1 untuk tx baru
    expect(CashierCashEntry::where('transaction_id', $old->id)->count())->toBe(2)
        ->and(CashierCashEntry::where('transaction_id', $new->id)->count())->toBe(1);

    expect(CashierCashEntry::where('transaction_id', $old->id)->where('amount', '<', 0)->first()->amount)->toBe('-1902080.00')
        ->and(CashierCashEntry::where('transaction_id', $new->id)->first()->amount)->toBe('1802080.00');

    // Debt: payment (+100000) + reversal (-100000) untuk tx lama, +1 payment untuk tx baru
    expect(FarmerDebt::where('transaction_id', $old->id)->where('type', 'payment')->count())->toBe(2)
        ->and(FarmerDebt::where('transaction_id', $new->id)->where('type', 'payment')->count())->toBe(1);

    expect(FarmerDebt::where('transaction_id', $old->id)->where('amount', '<', 0)->first()->amount)->toBe('-100000.00')
        ->and(FarmerDebt::where('transaction_id', $new->id)->where('type', 'payment')->first()->amount)->toBe('200000.00');

    // Balance = loan 500000 - payment baru (200000) = 300000
    expect($farmer->refresh()->balance)->toBe('300000.00');
});

test('revisi tanpa revision_reason ditolak tanpa membuat nota baru', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'finalize']);

    $old = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->put(route('weighing.update', $old), weighingFormData($farmer));

    $response->assertSessionHasErrors('error');

    $old->refresh();

    expect($old->status)->toBe('printed')
        ->and($old->is_latest_version)->toBeTrue()
        ->and(WeighingTransaction::count())->toBe(1);
});

test('revisi transaksi non-latest ditolak', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'finalize']);

    $old = WeighingTransaction::first();

    // Revisi pertama membuat row lama non-latest
    $this->actingAs($cashier)->put(route('weighing.update', $old), weighingFormData($farmer) + ['revision_reason' => 'Revisi pertama']);

    $old->refresh();

    $response = $this->actingAs($cashier)->put(route('weighing.update', $old), weighingFormData($farmer) + ['revision_reason' => 'Revisi kedua']);

    $response->assertSessionHasErrors('error');

    expect($old->status)->toBe('revised')
        ->and($old->is_latest_version)->toBeFalse()
        ->and(WeighingTransaction::count())->toBe(2);
});

test('void transaksi final membatalkan dan membalik keuangan', function () {
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
    ]) + ['action' => 'finalize']);

    $transaction = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->post(route('weighing.cancel', $transaction));

    $response->assertRedirect();

    $transaction->refresh();

    expect($transaction->status)->toBe('cancelled')
        ->and($transaction->is_latest_version)->toBeFalse()
        ->and($transaction->cashier_balance_deducted)->toBeFalse();

    // Cash: original (+1902080) + reversal (-1902080)
    expect(CashierCashEntry::where('transaction_id', $transaction->id)->count())->toBe(2);

    expect(CashierCashEntry::where('transaction_id', $transaction->id)->where('amount', '<', 0)->first()->amount)->toBe('-1902080.00');

    // Debt: payment (+100000) + reversal (-100000)
    expect(FarmerDebt::where('transaction_id', $transaction->id)->where('type', 'payment')->count())->toBe(2);

    expect(FarmerDebt::where('transaction_id', $transaction->id)->where('amount', '<', 0)->first()->amount)->toBe('-100000.00');

    // Balance kembali ke pinjaman saja (500000)
    expect($farmer->refresh()->balance)->toBe('500000.00');

    // Index tidak memuat row yang dibatalkan
    $this->actingAs($cashier)
        ->get(route('weighing.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Weighing/List')
            ->has('transactions.data', 0));
});

test('void transaksi draft tetap perilaku lama tanpa reversal', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->post(route('weighing.cancel', $draft));

    $response->assertRedirect();

    expect($draft->refresh()->status)->toBe('cancelled')
        ->and($draft->is_latest_version)->toBeFalse();

    expect(CashierCashEntry::count())->toBe(0)
        ->and(FarmerDebt::count())->toBe(0);
});

test('revisi dengan debt_paid_amount sama tetap menyimpan balance benar', function () {
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
    ]) + ['action' => 'finalize']);

    $old = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->put(route('weighing.update', $old), weighingFormData($farmer, [
        'debt_paid_amount' => 100000,
    ]) + ['revision_reason' => 'Koreksi berat']);

    $response->assertRedirect();

    // Balance = loan 500000 - payment baru 100000 = 400000
    // (reversal -100000 + payment baru +100000 saling meniadakan)
    expect($farmer->refresh()->balance)->toBe('400000.00');
});

test('void transaksi non-latest ditolak', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'finalize']);

    $old = WeighingTransaction::first();

    // Revisi pertama membuat row lama non-latest
    $this->actingAs($cashier)->put(route('weighing.update', $old), weighingFormData($farmer) + ['revision_reason' => 'Revisi pertama']);

    $old->refresh();

    $response = $this->actingAs($cashier)->post(route('weighing.cancel', $old));

    $response->assertStatus(422);

    expect($old->status)->toBe('revised')
        ->and($old->is_latest_version)->toBeFalse();
});
