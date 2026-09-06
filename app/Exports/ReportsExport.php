<?php

namespace App\Exports;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReportsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(
        private readonly Collection $transactions,
        private readonly array $summary,
    ) {}

    public function collection(): Collection
    {
        return $this->transactions;
    }

    public function headings(): array
    {
        return [
            'No. Nota',
            'Tanggal',
            'Petani',
            'Kasir',
            'Tara (kg)',
            'Timbangan Kotor (kg)',
            'Timbangan Bersih (kg)',
            'Berat Sortiran (kg)',
            'Bayar Hutang (Rp)',
            'Diterima (Rp)',
        ];
    }

    public function map($tx): array
    {
        return [
            $tx->nota_number,
            $tx->transaction_date instanceof Carbon
                ? $tx->transaction_date->format('d/m/Y')
                : date('d/m/Y', strtotime($tx->transaction_date)),
            $tx->farmer_name_snapshot,
            $tx->cashier_name_snapshot,
            $tx->tare_weight,
            $tx->initial_weight,
            $tx->net_weight,
            $tx->sorting_weight,
            $tx->debt_paid_amount > 0 ? $tx->debt_paid_amount : 0,
            $tx->final_paid_amount_rounded,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $lastRow = $this->transactions->count() + 2;

        return [
            1 => ['font' => ['bold' => true]],
            $lastRow => ['font' => ['bold' => true]],
        ];
    }
}
