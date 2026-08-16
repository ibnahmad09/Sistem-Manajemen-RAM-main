<?php

use App\Models\CashierCashEntry;
use App\Models\Farmer;
use App\Models\FarmerDebt;
use App\Models\User;
use App\Models\WeighingLoad;
use App\Models\WeighingTransaction;

function weighingFormData(Farmer $farmer, array $overrides = []): array
{
    return array_merge([
        'farmer_id' => $farmer->id,
        'transaction_date' => now()->format('Y-m-d'),
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
        'has_deduction' => true,
        'deduction_percentage' => 3,
        'palm_price_per_kg' => 2580,
        'sorting_price_per_kg' => 500,
        'debt_paid_amount' => 0,
        'payment_method' => 'cash',
    ], $overrides);
}

function createTestFarmer(): Farmer
{
    return Farmer::create([
        'name' => 'Petani Test',
        'phone' => null,
        'address' => null,
        'balance' => 0,
        'status' => 'active',
    ]);
}

test('single load can be finalized (backward compatible)', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'finalize']);

    $response->assertRedirect();

    $transaction = WeighingTransaction::first();

    expect($transaction)->not->toBeNull()
        ->and($transaction->status)->toBe('printed')
        ->and($transaction->nota_number)->toBe('HND-'.now()->format('Ymd').'-0001')
        ->and($transaction->initial_weight)->toBe('800.00')
        ->and($transaction->deduction_weight)->toBe('24.00')
        ->and($transaction->net_weight)->toBe('776.00')
        ->and($transaction->palm_total_amount)->toBe('2002080.00')
        ->and($transaction->gross_total_amount)->toBe('2002080.00')
        ->and($transaction->final_paid_amount_rounded)->toBe('2002080.00');

    expect(WeighingLoad::count())->toBe(1);

    expect(CashierCashEntry::where('type', 'farmer_payment')->first())
        ->not->toBeNull()
        ->and(CashierCashEntry::where('type', 'farmer_payment')->first()->amount)->toBe('2002080.00');

    expect(FarmerDebt::count())->toBe(0);
});

test('multi load finalizes as one nota with per-load totals', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
            ['gross_weight' => 800, 'tare_weight' => 150, 'has_sorting' => true, 'sorting_weight' => 50],
        ],
    ]) + ['action' => 'finalize']);

    $response->assertRedirect();

    $transaction = WeighingTransaction::first();

    expect($transaction->nota_number)->toBe('HND-'.now()->format('Ymd').'-0001')
        ->and($transaction->gross_weight)->toBe('1800.00')
        ->and($transaction->tare_weight)->toBe('350.00')
        ->and($transaction->net_weight)->toBe('1406.50')
        ->and($transaction->sorting_weight)->toBe('50.00')
        ->and($transaction->sorting_total_amount)->toBe('25000.00')
        ->and($transaction->palm_total_amount)->toBe('3628770.00')
        ->and($transaction->gross_total_amount)->toBe('3653770.00')
        ->and($transaction->final_paid_amount_rounded)->toBe('3653770.00');

    expect($transaction->loads->count())->toBe(2);

    $secondLoad = $transaction->loads->firstWhere('seq_no', 2);

    expect($secondLoad->initial_weight)->toBe('650.00')
        ->and($secondLoad->net_weight)->toBe('630.50')
        ->and($secondLoad->sorting_total_amount)->toBe('25000.00');

    expect(CashierCashEntry::where('type', 'farmer_payment')->first()->amount)->toBe('3653770.00');

    expect($transaction->farmer->balance)->toBe('0.00');
});

test('draft can be saved without nota number or cash entry', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $transaction = WeighingTransaction::first();

    expect($transaction->status)->toBe('draft')
        ->and($transaction->nota_number)->toBeNull()
        ->and($transaction->printed_at)->toBeNull()
        ->and($transaction->cashier_balance_deducted)->toBeFalse()
        ->and($transaction->debt_paid_amount)->toBe('0.00');

    expect(WeighingLoad::count())->toBe(1);

    expect(CashierCashEntry::count())->toBe(0)
        ->and(FarmerDebt::count())->toBe(0);
});

test('a farmer cannot have more than one active draft', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);

    $response->assertSessionHasErrors('farmer_id');

    expect(WeighingTransaction::where('status', 'draft')->count())->toBe(1);
});

test('draft can be resumed, extended with another load, then finalized', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);
    $draft = WeighingTransaction::first();

    // Resume: add a second load and save again as draft
    $this->actingAs($cashier)->put(route('weighing.update', $draft), weighingFormData($farmer, [
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
            ['gross_weight' => 800, 'tare_weight' => 150, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'save_draft']);

    $draft->refresh();

    expect($draft->loads->count())->toBe(2)
        ->and($draft->gross_weight)->toBe('1800.00')
        ->and($draft->status)->toBe('draft');

    // Finalize through update
    $response = $this->actingAs($cashier)->put(route('weighing.update', $draft), weighingFormData($farmer, [
        'loads' => [
            ['gross_weight' => 1000, 'tare_weight' => 200, 'has_sorting' => false, 'sorting_weight' => 0],
            ['gross_weight' => 800, 'tare_weight' => 150, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    $response->assertRedirect(route('weighing.success', ['nota' => 'HND-'.now()->format('Ymd').'-0001']));

    $draft->refresh();

    expect($draft->status)->toBe('printed')
        ->and($draft->nota_number)->toBe('HND-'.now()->format('Ymd').'-0001')
        ->and($draft->gross_total_amount)->toBe('3628770.00')
        ->and($draft->loads->count())->toBe(2);

    expect(CashierCashEntry::where('type', 'farmer_payment')->first()->amount)->toBe('3628770.00');
});

test('draft can be finalized from the list route', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);
    $draft = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->post(route('weighing.finalize', $draft));

    $response->assertRedirect(route('weighing.success', ['nota' => 'HND-'.now()->format('Ymd').'-0001']));

    $draft->refresh();

    expect($draft->status)->toBe('printed')
        ->and($draft->nota_number)->toBe('HND-'.now()->format('Ymd').'-0001');

    expect(CashierCashEntry::where('type', 'farmer_payment')->first()->amount)->toBe('2002080.00');
});

test('abandoned draft can be cancelled', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);
    $draft = WeighingTransaction::first();

    $response = $this->actingAs($cashier)->post(route('weighing.cancel', $draft));

    $response->assertRedirect();

    expect($draft->refresh()->status)->toBe('cancelled')
        ->and(WeighingTransaction::activeDraft()->count())->toBe(0);

    expect(CashierCashEntry::count())->toBe(0);
});

test('draft with debt payment records debt and updates farmer balance', function () {
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

    $response->assertRedirect();

    $transaction = WeighingTransaction::first();

    expect($transaction->previous_debt_amount)->toBe('500000.00')
        ->and($transaction->debt_paid_amount)->toBe('100000.00')
        ->and($transaction->remaining_debt_amount)->toBe('400000.00')
        ->and($transaction->final_paid_amount_rounded)->toBe('1902080.00');

    expect(FarmerDebt::where('type', 'payment')->first()->amount)->toBe('100000.00')
        ->and($farmer->refresh()->balance)->toBe('400000.00');

    expect(CashierCashEntry::where('type', 'farmer_payment')->first()->amount)->toBe('1902080.00');
});

test('rejects loads where gross weight is not greater than tare weight', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'loads' => [
            ['gross_weight' => 200, 'tare_weight' => 300, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    $response->assertSessionHasErrors('loads');

    expect(WeighingTransaction::count())->toBe(0);
});

test('requires at least one load', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $response = $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer, [
        'loads' => [],
    ]) + ['action' => 'finalize']);

    $response->assertSessionHasErrors('loads');

    expect(WeighingTransaction::count())->toBe(0);
});

test('weighing list excludes drafts and exposes active drafts', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);
    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 500, 'tare_weight' => 100, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    $response = $this->actingAs($cashier)->get(route('weighing.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Weighing/List')
            ->has('transactions.data', 1)
            ->has('activeDrafts', 1)
            ->where('activeDrafts.0.status', 'draft'));
});

test('draft does not affect reports', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $farmer = createTestFarmer();

    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData($farmer) + ['action' => 'save_draft']);
    $this->actingAs($cashier)->post(route('weighing.store'), weighingFormData(createTestFarmer(), [
        'loads' => [
            ['gross_weight' => 500, 'tare_weight' => 100, 'has_sorting' => false, 'sorting_weight' => 0],
        ],
    ]) + ['action' => 'finalize']);

    $response = $this->actingAs($cashier)->get(route('reports.index', [
        'date_start' => now()->format('Y-m-d'),
        'date_end' => now()->format('Y-m-d'),
    ]));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('transactions', 1));
});
