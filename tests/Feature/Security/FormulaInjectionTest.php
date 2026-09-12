<?php

use App\Exports\ReportsExport;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Bangun baris transaksi dengan bentuk yang sama seperti output
 * ReportsController::applyReportFilters() (array ternormalisasi).
 */
function formulaInjectionRow(array $overrides = []): array
{
    return array_merge([
        'type' => 'weighing',
        'nota_number' => 'HND-'.now()->format('Ymd').'-0001',
        'transaction_date' => now(),
        'farmer_name_snapshot' => 'Petani Normal',
        'kasir_name' => 'Kasir Normal',
        'tare_weight' => 150,
        'initial_weight' => 850,
        'net_weight' => 807.5,
        'sorting_weight' => 0,
        'debt_paid_amount' => 0,
        'final_paid_amount_rounded' => 2083350,
    ], $overrides);
}

/**
 * Export ke file xlsx lalu baca isi cell tertentu.
 * Excel::fake() hanya menangkap intent, jadi di sini dipakai
 * Excel::store() + IOFactory::load untuk memeriksa isi cell asli.
 */
function exportAndReadCell(Collection $transactions, string $cell): mixed
{
    Storage::fake('local');

    Excel::store(new ReportsExport($transactions, []), 'export.xlsx');

    $sheet = IOFactory::load(Storage::disk('local')->path('export.xlsx'))->getActiveSheet();

    return $sheet->getCell($cell)->getValue();
}

test('farmer name starting with = is sanitized with a leading apostrophe', function () {
    $value = exportAndReadCell(
        collect([formulaInjectionRow(['farmer_name_snapshot' => '=HYPERLINK("evil")'])]),
        'C2'
    );

    expect($value)->toBe("'=HYPERLINK(\"evil\")");
});

test('farmer name with = not at the first position is not modified', function () {
    $value = exportAndReadCell(
        collect([formulaInjectionRow(['farmer_name_snapshot' => 'Pak Budi = petani'])]),
        'C2'
    );

    expect($value)->toBe('Pak Budi = petani');
});

test('kasir name starting with = is sanitized with a leading apostrophe', function () {
    $value = exportAndReadCell(
        collect([formulaInjectionRow(['kasir_name' => '=SUM(1)'])]),
        'D2'
    );

    expect($value)->toBe("'=SUM(1)");
});
