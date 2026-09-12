<?php

use App\Models\Farmer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

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
