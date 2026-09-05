<?php

use App\Models\PalmPrice;
use App\Models\User;

function createPalmPrice(User $user, array $overrides = []): PalmPrice
{
    return PalmPrice::create(array_merge([
        'price_per_kg' => 2580,
        'effective_date' => now()->addDay(),
        'note' => 'Harga baru',
        'created_by' => $user->id,
    ], $overrides));
}

test('cashier can update a palm price', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $price = createPalmPrice($cashier);

    $response = $this->actingAs($cashier)->put(route('palm-prices.update', $price), [
        'price_per_kg' => 2750,
        'effective_date' => now()->addDays(2)->format('Y-m-d'),
        'note' => 'Update harga',
    ]);

    $response->assertRedirect()
        ->assertSessionHas('success', 'Harga sawit berhasil diperbarui.');

    $price->refresh();

    expect($price->price_per_kg)->toBe('2750.00')
        ->and($price->effective_date->format('Y-m-d'))->toBe(now()->addDays(2)->format('Y-m-d'))
        ->and($price->note)->toBe('Update harga')
        ->and($price->created_by)->toBe($cashier->id);
});

test('palm price update validates required fields', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $price = createPalmPrice($cashier);

    $response = $this->actingAs($cashier)->put(route('palm-prices.update', $price), [
        'price_per_kg' => '',
        'effective_date' => '',
    ]);

    $response->assertSessionHasErrors(['price_per_kg', 'effective_date']);

    $price->refresh();

    expect($price->price_per_kg)->toBe('2580.00');
});

test('palm price can be destroyed', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $price = createPalmPrice($cashier);

    $response = $this->actingAs($cashier)->delete(route('palm-prices.destroy', $price));

    $response->assertRedirect()
        ->assertSessionHas('success', 'Harga sawit berhasil dihapus.');

    expect(PalmPrice::count())->toBe(0);
});

test('palm price index lists history with creator', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    createPalmPrice($cashier);
    createPalmPrice($cashier, [
        'price_per_kg' => 2750,
        'effective_date' => now()->addDays(2),
        'note' => 'Harga kedua',
    ]);

    $response = $this->actingAs($cashier)->get(route('palm-prices.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('PalmPrices/Index')
            ->has('prices', 2)
            ->where('prices.0.price_per_kg', '2750.00')
            ->where('prices.0.creator.name', $cashier->name));
});
