<?php

use App\Models\CashierCashEntry;
use App\Models\Farmer;
use App\Models\User;
use App\Models\WeighingTransaction;

function createCashEntry(User $cashier, array $overrides = []): CashierCashEntry
{
    return CashierCashEntry::create(array_merge([
        'cashier_id' => $cashier->id,
        'cashier_name_snapshot' => $cashier->name,
        'type' => 'cash_in',
        'amount' => 100000,
        'payment_method' => 'cash',
        'category' => 'modal_kasir',
        'description' => 'Modal awal shift pagi',
        'entry_date' => now(),
        'created_by' => $cashier->id,
    ], $overrides));
}

test('cashier can update their own cash entry', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $entry = createCashEntry($cashier);

    $response = $this->actingAs($cashier)->put(route('cash-flow.update', $entry), [
        'type' => 'expense',
        'amount' => 50000,
        'payment_method' => 'transfer',
        'category' => 'lain_lain',
        'description' => 'Beli ATK',
        'entry_date' => now()->format('Y-m-d'),
    ]);

    $response->assertRedirect()
        ->assertSessionHas('success', 'Entri kas berhasil diperbarui.');

    $entry->refresh();

    expect($entry->type)->toBe('expense')
        ->and($entry->amount)->toBe('50000.00')
        ->and($entry->payment_method)->toBe('transfer')
        ->and($entry->category)->toBe('lain_lain')
        ->and($entry->description)->toBe('Beli ATK')
        ->and($entry->cashier_id)->toBe($cashier->id)
        ->and($entry->created_by)->toBe($cashier->id);
});

test('cashier can update their own entry into farmer payment type', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $entry = createCashEntry($cashier, ['type' => 'cash_in']);

    $response = $this->actingAs($cashier)->put(route('cash-flow.update', $entry), [
        'type' => 'farmer_payment',
        'amount' => 250000,
        'payment_method' => 'cash',
        'category' => 'bayar_petani',
        'description' => 'Bayar petani',
        'entry_date' => now()->format('Y-m-d'),
    ]);

    $response->assertRedirect()
        ->assertSessionHas('success');

    expect($entry->refresh()->type)->toBe('farmer_payment')
        ->and($entry->amount)->toBe('250000.00');
});

test('cash flow update validates required fields', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $entry = createCashEntry($cashier);

    $response = $this->actingAs($cashier)->put(route('cash-flow.update', $entry), [
        'type' => 'invalid_type',
        'amount' => -5,
        'payment_method' => 'cheque',
        'category' => '',
    ]);

    $response->assertSessionHasErrors(['type', 'amount', 'payment_method', 'category']);

    $entry->refresh();

    expect($entry->amount)->toBe('100000.00')
        ->and($entry->type)->toBe('cash_in');
});

test('unlinked cash entry can be destroyed', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $entry = createCashEntry($cashier);

    $response = $this->actingAs($cashier)->delete(route('cash-flow.destroy', $entry));

    $response->assertRedirect()
        ->assertSessionHas('success', 'Entri kas berhasil dihapus.');

    expect(CashierCashEntry::count())->toBe(0);
});

test('cash entry linked to a transaction cannot be destroyed', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = Farmer::create([
        'name' => 'Petani Test',
        'phone' => null,
        'address' => null,
        'balance' => 0,
        'status' => 'active',
    ]);

    $transaction = WeighingTransaction::create([
        'farmer_id' => $farmer->id,
        'farmer_name_snapshot' => $farmer->name,
        'cashier_id' => $cashier->id,
        'cashier_name_snapshot' => $cashier->name,
        'transaction_date' => now(),
        'gross_weight' => 1000,
        'tare_weight' => 200,
        'initial_weight' => 800,
        'has_deduction' => true,
        'deduction_percentage' => 3,
        'deduction_weight' => 24,
        'net_weight' => 776,
        'palm_price_per_kg' => 2580,
        'palm_total_amount' => 2002080,
        'gross_total_amount' => 2002080,
        'final_paid_amount' => 2002080,
        'final_paid_amount_rounded' => 2002080,
        'payment_method' => 'cash',
        'cashier_balance_deducted' => true,
        'status' => 'printed',
        'created_by' => $cashier->id,
    ]);

    $entry = createCashEntry($cashier, [
        'type' => 'farmer_payment',
        'amount' => 2002080,
        'category' => 'bayar_petani',
        'transaction_id' => $transaction->id,
    ]);

    $response = $this->actingAs($cashier)->delete(route('cash-flow.destroy', $entry));

    $response->assertRedirect()
        ->assertSessionHasErrors('error');

    expect(CashierCashEntry::count())->toBe(1);
});
