<?php

use App\Exports\ReportsExport;
use App\Models\Farmer;
use App\Models\FarmerDebt;
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

function createReportDebt(User $user, string $type, float $amount, array $overrides = []): FarmerDebt
{
    $farmer = Farmer::create([
        'name' => 'Petani Hutang '.$type,
        'phone' => null,
        'address' => null,
        'balance' => 0,
        'status' => 'active',
    ]);

    return FarmerDebt::create(array_merge([
        'farmer_id' => $farmer->id,
        'farmer_name_snapshot' => $farmer->name,
        'type' => $type,
        'amount' => $amount,
        'debt_date' => now(),
        'description' => $type === 'loan' ? 'Pinjaman Baru' : 'Pelunasan Manual',
        'transaction_id' => null,
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
            ->where('transactions.0.type', 'weighing')
            ->where('transactions.0.kasir_name', $user->name)
            ->where('transactions.0.tare_weight', '150.00')
            ->where('transactions.0.initial_weight', '850.00')
            ->where('transactions.0.net_weight', '807.50')
            ->where('transactions.0.has_sorting', false)
            ->where('transactions.0.sorting_weight', '0.00')
            ->where('transactions.0.loan_amount', 0)
            ->where('summary.total_tare', 150)
            ->where('summary.total_initial', 850)
            ->where('summary.total_weight', 807.5)
            ->where('summary.total_sorting', 0)
            ->where('summary.total_loan', 0));
});

test('it includes manual debt transactions in the report index page', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    createReportTransaction($user);
    createReportDebt($user, 'loan', 210000);
    createReportDebt($user, 'payment', 10000);

    $this->actingAs($user)
        ->get('/reports?date_start='.now()->format('Y-m-d'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->has('transactions', 3)
            ->where('summary.total_debt_paid', 10000)
            ->where('summary.total_loan', 210000)
            ->where('summary.total_transactions', 1));
});

test('manual debt outside the date range is not included', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    createReportDebt($user, 'loan', 99999, [
        'debt_date' => now()->subMonth(),
    ]);

    $this->actingAs($user)
        ->get('/reports?date_start='.now()->format('Y-m-d').'&date_end='.now()->format('Y-m-d'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Reports/Index')
            ->has('transactions', 0)
            ->where('summary.total_loan', 0));
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

            expect($headings)->toContain('Tara (kg)')
                ->toContain('Timbangan Kotor (kg)')
                ->toContain('Timbangan Bersih (kg)')
                ->toContain('Berat Sortiran (kg)')
                ->toContain('Pinjaman (Rp)')
                ->toContain('Bayar Hutang (Rp)')
                ->not->toContain('Bruto (kg)')
                ->not->toContain('Total Bruto (Rp)');

            $rows = $export->collection();

            expect($rows)->toHaveCount(1);

            $mapped = $export->map($rows->first());

            expect($mapped[4])->toBe('150.00')
                ->and($mapped[5])->toBe('850.00')
                ->and($mapped[6])->toBe('807.50')
                ->and($mapped[7])->toBe('0.00')
                ->and($mapped[8])->toBe('')
                ->and($mapped[9])->toBe('0');

            return true;
        }
    );
});

test('it maps manual debt rows in excel export', function () {
    $user = User::factory()->create(['role' => 'super_admin']);
    createReportDebt($user, 'loan', 150000);
    createReportDebt($user, 'payment', 75000);

    Excel::fake();

    $this->actingAs($user)
        ->get('/reports/export/excel?date_start='.now()->format('Y-m-d'))
        ->assertOk();

    Excel::assertDownloaded(
        'laporan-timbangan-'.now()->format('Y-m-d').'.xlsx',
        function (ReportsExport $export) {
            $rows = $export->collection();

            expect($rows)->toHaveCount(2);

            $loanRow = $rows->firstWhere('loan_amount', 150000.0);
            $paymentRow = $rows->firstWhere('debt_paid_amount', 75000.0);

            expect($loanRow)->not->toBeNull()
                ->and($paymentRow)->not->toBeNull();

            $loanMapped = $export->map($loanRow);
            $paymentMapped = $export->map($paymentRow);

            expect($loanMapped[0])->toBe('—')
                ->and($loanMapped[4])->toBe('')
                ->and($loanMapped[5])->toBe('')
                ->and($loanMapped[6])->toBe('')
                ->and($loanMapped[7])->toBe('')
                ->and($loanMapped[8])->toBe(150000.0)
                ->and($loanMapped[9])->toBe('')
                ->and($loanMapped[10])->toBe('');

            expect($paymentMapped[8])->toBe('')
                ->and($paymentMapped[9])->toBe(75000.0);

            return true;
        }
    );
});
