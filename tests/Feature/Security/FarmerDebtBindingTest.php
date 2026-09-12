<?php

use App\Models\Farmer;
use App\Models\FarmerDebt;
use App\Models\User;

function createFarmerDebt(User $cashier, array $overrides = []): FarmerDebt
{
    $farmer = Farmer::create([
        'name' => 'Petani Test',
        'phone' => null,
        'address' => null,
        'balance' => 0,
        'status' => 'active',
    ]);

    return FarmerDebt::create(array_merge([
        'farmer_id' => $farmer->id,
        'farmer_name_snapshot' => $farmer->name,
        'type' => 'loan',
        'amount' => 100000,
        'debt_date' => now(),
        'description' => 'Pinjaman Baru',
        'created_by' => $cashier->id,
    ], $overrides));
}

test('show returns debt data as json for a valid id', function () {
    $cashier = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $debt = createFarmerDebt($cashier);

    $response = $this->actingAs($cashier)->get(route('debts.show', $debt));

    $response->assertOk()
        ->assertJsonPath('id', $debt->id)
        ->assertJsonPath('farmer_id', $debt->farmer_id)
        ->assertJsonPath('farmer_name_snapshot', 'Petani Test')
        ->assertJsonPath('type', 'loan')
        ->assertJsonPath('amount', '100000.00');
});

test('show returns 404 for a non-existent debt', function () {
    $cashier = User::factory()->create(['role' => 'cashier', 'status' => 'active']);

    $this->actingAs($cashier)->get(route('debts.show', 99999))->assertNotFound();
});

test('destroy deletes the debt and redirects with success', function () {
    $cashier = User::factory()->create(['role' => 'cashier', 'status' => 'active']);
    $debt = createFarmerDebt($cashier);

    $response = $this->actingAs($cashier)->delete(route('debts.destroy', $debt));

    $response->assertRedirect()
        ->assertSessionHas('success', 'Data hutang berhasil dihapus.');

    expect(FarmerDebt::count())->toBe(0);
});
