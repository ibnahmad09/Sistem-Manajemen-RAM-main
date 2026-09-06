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
            'Pinjaman (Rp)',
            'Bayar Hutang (Rp)',
            'Diterima (Rp)',
        ];
    }

    public function map($tx): array
    {
        if (($tx['type'] ?? null) === 'debt') {
            return $this->mapDebtRow($tx);
        }

        return [
            $tx['nota_number'] ?? null,
            $this->formatDate($tx['transaction_date']),
            $tx['farmer_name_snapshot'] ?? null,
            $tx['kasir_name'] ?? null,
            $tx['tare_weight'] ?? '',
            $tx['initial_weight'] ?? '',
            $tx['net_weight'] ?? '',
            empty($tx['sorting_weight']) ? '0' : $tx['sorting_weight'],
            '',
            ($tx['debt_paid_amount'] ?? 0) > 0 ? $tx['debt_paid_amount'] : '0',
            $tx['final_paid_amount_rounded'] ?? 0,
        ];
    }

    private function mapDebtRow(array $tx): array
    {
        $loanAmount = $tx['loan_amount'] ?? 0;
        $debtPaid = $tx['debt_paid_amount'] ?? 0;

        return [
            '—',
            $this->formatDate($tx['transaction_date']),
            $tx['farmer_name_snapshot'] ?? null,
            $tx['kasir_name'] ?? null,
            '',
            '',
            '',
            '',
            $loanAmount > 0 ? $loanAmount : '',
            $debtPaid > 0 ? $debtPaid : '',
            '',
        ];
    }

    private function formatDate($date): string
    {
        if ($date instanceof Carbon) {
            return $date->format('d/m/Y');
        }

        return date('d/m/Y', strtotime($date));
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
