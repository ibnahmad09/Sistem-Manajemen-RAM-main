<?php

use App\Models\CashierCashEntry;
use App\Models\User;

function makeCashFlowEntry(User $cashier, array $overrides = []): CashierCashEntry
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

test('cashier cannot update a cash entry owned by another cashier', function () {
    $cashierA = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $cashierB = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $entryB = makeCashFlowEntry($cashierB);

    $this->actingAs($cashierA)
        ->put(route('cash-flow.update', $entryB), [
            'type' => 'expense',
            'amount' => 50000,
            'payment_method' => 'transfer',
            'category' => 'lain_lain',
            'description' => 'Beli ATK',
            'entry_date' => now()->format('Y-m-d'),
        ])
        ->assertForbidden();

    $entryB->refresh();

    expect($entryB->type)->toBe('cash_in')
        ->and($entryB->amount)->toBe('100000.00')
        ->and($entryB->cashier_id)->toBe($cashierB->id);
});

test('cashier cannot delete a cash entry owned by another cashier', function () {
    $cashierA = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $cashierB = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $entryB = makeCashFlowEntry($cashierB);

    $this->actingAs($cashierA)
        ->delete(route('cash-flow.destroy', $entryB))
        ->assertForbidden();

    expect(CashierCashEntry::find($entryB->id))->not->toBeNull();
});

test('cashier cannot view a cash entry owned by another cashier', function () {
    $cashierA = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $cashierB = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $entryB = makeCashFlowEntry($cashierB);

    $this->actingAs($cashierA)
        ->get(route('cash-flow.show', $entryB))
        ->assertForbidden();
});

test('cashier can update their own cash entry', function () {
    $cashierA = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $entryA = makeCashFlowEntry($cashierA);

    $this->actingAs($cashierA)
        ->put(route('cash-flow.update', $entryA), [
            'type' => 'expense',
            'amount' => 50000,
            'payment_method' => 'transfer',
            'category' => 'lain_lain',
            'description' => 'Beli ATK',
            'entry_date' => now()->format('Y-m-d'),
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Entri kas berhasil diperbarui.');

    expect($entryA->refresh()->type)->toBe('expense')
        ->and($entryA->amount)->toBe('50000.00');
});

test('super admin can update and delete a cash entry owned by a cashier', function () {
    $superAdmin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
    $cashierA = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $entryA = makeCashFlowEntry($cashierA);

    $this->actingAs($superAdmin)
        ->put(route('cash-flow.update', $entryA), [
            'type' => 'expense',
            'amount' => 75000,
            'payment_method' => 'cash',
            'category' => 'lain_lain',
            'description' => 'Update oleh super admin',
            'entry_date' => now()->format('Y-m-d'),
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Entri kas berhasil diperbarui.');

    expect($entryA->refresh()->type)->toBe('expense')
        ->and($entryA->amount)->toBe('75000.00');

    $this->actingAs($superAdmin)
        ->delete(route('cash-flow.destroy', $entryA))
        ->assertRedirect()
        ->assertSessionHas('success', 'Entri kas berhasil dihapus.');

    expect(CashierCashEntry::find($entryA->id))->toBeNull();
});
