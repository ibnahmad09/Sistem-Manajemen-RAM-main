<?php

use App\Models\User;
use App\Models\WeighingTransaction;

test('finalizing an already printed transaction is rejected', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull();

    $first = $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    $first->assertRedirect();

    $draft->refresh();

    expect($draft->status)->toBe('printed');

    $second = $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    $second->assertRedirect()
        ->assertSessionHasErrors('error');

    expect(WeighingTransaction::count())->toBe(1);
});

test('finalize after update with action finalize is rejected on second call', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull();

    $update = $this->actingAs($cashier)->put(route('weighing.update', $draft), weighingFormData($farmer) + ['action' => 'finalize']);

    $update->assertRedirect();

    $draft->refresh();

    expect($draft->status)->toBe('printed');

    $second = $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    $second->assertRedirect()
        ->assertSessionHasErrors('error');
});

test('sequential finalize requests produce only one nota number', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $draft = WeighingTransaction::first();

    expect($draft)->not->toBeNull();

    $this->actingAs($cashier)->post(route('weighing.finalize', $draft));
    $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    expect(WeighingTransaction::whereNotNull('nota_number')->count())->toBe(1);
});
