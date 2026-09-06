<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create(['role' => 'cashier']);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('dashboard.cashier'));

    $response = $this->get(route('dashboard.cashier'));
    $response->assertOk();
});

test('cashier dashboard shows today bruto and netto weight scoped to the cashier', function () {
    $cashierA = User::factory()->create(['role' => 'cashier']);
    $cashierB = User::factory()->create(['role' => 'cashier']);

    // Today by cashier A: gross 1000, initial 800
    $this->actingAs($cashierA)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    // Today by cashier B: gross 500, initial 400
    $this->actingAs($cashierB)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 500, 'tare_weight' => 100, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    // 30 days ago by cashier A: gross 2000, initial 1700
    $this->actingAs($cashierA)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'transaction_date' => now()->subDays(30)->format('Y-m-d'),
        'loads' => [
            ['gross_weight' => 2000, 'tare_weight' => 300, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    $this->actingAs($cashierA)
        ->get(route('dashboard.cashier'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard/Cashier')
            ->where('stats.brutoWeightToday', fn ($value) => $value == 1000.0)
            ->where('stats.nettoWeightToday', fn ($value) => $value == 800.0)
            ->where('stats.transactionsToday', 1));
});

test('super admin dashboard shows today bruto and netto weight across all cashiers', function () {
    $cashierA = User::factory()->create(['role' => 'cashier']);
    $cashierB = User::factory()->create(['role' => 'cashier']);

    // Today by cashier A: gross 1000, initial 800
    $this->actingAs($cashierA)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    // Today by cashier B: gross 500, initial 400
    $this->actingAs($cashierB)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 500, 'tare_weight' => 100, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    // 30 days ago by cashier A: gross 2000, initial 1700 (must NOT count)
    $this->actingAs($cashierA)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'transaction_date' => now()->subDays(30)->format('Y-m-d'),
        'loads' => [
            ['gross_weight' => 2000, 'tare_weight' => 300, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    $superAdmin = User::factory()->create(['role' => 'super_admin']);

    $this->actingAs($superAdmin)
        ->get(route('dashboard.super-admin'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard/SuperAdmin')
            ->where('stats.brutoWeightToday', fn ($value) => $value == 1500.0)
            ->where('stats.nettoWeightToday', fn ($value) => $value == 1200.0));
});

test('owner dashboard shows all-time bruto and netto weight excluding drafts', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $owner = User::factory()->create(['role' => 'owner']);

    // Finalized today: gross 1000, initial 800
    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    // Finalized 30 days ago: gross 500, initial 400
    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'transaction_date' => now()->subDays(30)->format('Y-m-d'),
        'loads' => [
            ['gross_weight' => 500, 'tare_weight' => 100, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    // Draft with a different farmer to avoid active draft conflict
    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData(createTestFarmer()) + ['action' => 'save_draft']);

    $this->actingAs($owner)
        ->get(route('dashboard.owner'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard/Owner')
            ->where('stats.totalBrutoWeight', fn ($value) => $value == 1500.0)
            ->where('stats.totalNettoWeight', fn ($value) => $value == 1200.0));
});
