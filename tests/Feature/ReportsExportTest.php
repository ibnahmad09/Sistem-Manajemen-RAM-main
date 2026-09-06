<?php

use App\Exports\ReportsExport;
use App\Models\Farmer;
use App\Models\User;
use App\Models\WeighingTransaction;
use Inertia\Testing\AssertableInertia as Assert;
use Maatwebsite\Excel\Facades\Excel;

function createReportTransaction(User $user, array $overrides = []): WeighingTransaction
{
    $farmer = Farmer::create([
        'name' => 'Petani Laporan',
        'phone' => null,
        'address' => null,
        'balance' => 0,
        'status' => 'active',
    ]);

    return WeighingTransaction::create(array_merge([
        'nota_number' => 'HND-'.now()->format('Ymd').'-RPT-'.uniqid(),
        'farmer_id' => $farmer->id,
        'farmer_name_snapshot' => $farmer->name,
        'cashier_id' => $user->id,
        'cashier_name_snapshot' => $user->name,
        'transaction_date' => now(),
        'gross_weight' => 1000,
        'tare_weight' => 150,
        'initial_weight' => 850,
        'deduction_weight' => 42.5,
        'net_weight' => 807.5,
        'has_deduction' => true,
        'deduction_percentage' => 5,
        'palm_price_per_kg' => 2580,
        'palm_total_amount' => 2083350,
        'gross_total_amount' => 2083350,
        'debt_paid_amount' => 0,
        'final_paid_amount' => 2083350,
        'final_paid_amount_rounded' => 2083350,
        'status' => 'printed',
        'is_latest_version' => true,
        'created_by' => $user->id,
    ], $overrides));
}

test('it includes weight columns in the report index page', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    createReportTransaction($user);

    $this->actingAs($user)
        ->get('/reports?date_start='.now()->format('Y-m-d'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->has('transactions', 1)
            ->where('summary.total_gross', 1000)
            ->where('summary.total_tare', 150)
            ->where('summary.total_initial', 850)
            ->where('summary.total_weight', 807.5));
});

test('it maps weight columns in excel export', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    createReportTransaction($user);

    Excel::fake();

    $this->actingAs($user)
        ->get('/reports/export/excel?date_start='.now()->format('Y-m-d'))
        ->assertOk();

    Excel::assertDownloaded(
        'laporan-timbangan-'.now()->format('Y-m-d').'.xlsx',
        function (ReportsExport $export) {
            $headings = $export->headings();

            expect($headings)->toContain('Bruto (kg)')
                ->toContain('Tara (kg)')
                ->toContain('Neto (kg)')
                ->toContain('Bruto Sblm Potongan (kg)')
                ->not->toContain('Berat Bersih (kg)');

            $rows = $export->collection();

            expect($rows)->toHaveCount(1);

            $mapped = $export->map($rows->first());

            expect($mapped[4])->toBe('1000.00')
                ->and($mapped[5])->toBe('150.00')
                ->and($mapped[6])->toBe('807.50')
                ->and($mapped[7])->toBe('850.00');

            return true;
        }
    );
});
