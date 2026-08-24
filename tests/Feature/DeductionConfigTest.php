<?php

use App\Models\DeductionConfig;
use App\Models\User;

test('super admin can view deduction config page', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this->actingAs($user)->get(route('deduction-config.index'));

    $response->assertOk();
});

test('cashier can view deduction config page', function () {
    $user = User::factory()->create(['role' => 'cashier']);

    $response = $this->actingAs($user)->get(route('deduction-config.index'));

    $response->assertOk();
});

test('owner cannot view deduction config page', function () {
    $user = User::factory()->create(['role' => 'owner']);

    $response = $this->actingAs($user)->get(route('deduction-config.index'));

    $response->assertForbidden();
});

test('can create deduction config', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this->actingAs($user)->post(route('deduction-config.store'), [
        'percentage' => 5.5,
        'note' => 'Potongan standar',
    ]);

    $response->assertRedirect();

    $config = DeductionConfig::first();
    expect($config)->not->toBeNull()
        ->and($config->percentage)->toBe('5.50')
        ->and($config->note)->toBe('Potongan standar');
});

test('can update deduction config', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    DeductionConfig::create(['percentage' => 3, 'note' => null]);

    $response = $this->actingAs($user)->post(route('deduction-config.store'), [
        'percentage' => 4,
        'note' => 'Updated',
    ]);

    $response->assertRedirect();

    expect(DeductionConfig::count())->toBe(1);
    $config = DeductionConfig::first();
    expect($config->percentage)->toBe('4.00')
        ->and($config->note)->toBe('Updated');
});

test('can get active deduction config', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    DeductionConfig::create(['percentage' => 3.5, 'note' => 'Test']);

    $response = $this->actingAs($user)->get(route('deduction-config.active'));

    $response->assertOk()->assertJson([
        'percentage' => '3.50',
        'note' => 'Test',
    ]);
});

test('get active returns null when no config exists', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this->actingAs($user)->get(route('deduction-config.active'));

    $response->assertOk()->assertJsonMissing(['percentage']);
});

test('percentage validation requires numeric value', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this->actingAs($user)->post(route('deduction-config.store'), [
        'percentage' => 'not-a-number',
    ]);

    $response->assertSessionHasErrors('percentage');
});

test('percentage validation requires min 0', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this->actingAs($user)->post(route('deduction-config.store'), [
        'percentage' => -1,
    ]);

    $response->assertSessionHasErrors('percentage');
});

test('percentage validation requires max 100', function () {
    $user = User::factory()->create(['role' => 'super_admin']);

    $response = $this->actingAs($user)->post(route('deduction-config.store'), [
        'percentage' => 101,
    ]);

    $response->assertSessionHasErrors('percentage');
});
