<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Transaksi Timbangan Sawit</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { font-size: 14px; margin: 0 0 4px 0; }
        .header p { font-size: 11px; margin: 2px 0; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; }
        th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        td { font-size: 10px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { font-weight: bold; background-color: #f9f9f9; border-top: 2px solid #333; }
        .footer { margin-top: 20px; font-size: 9px; color: #666; }
        .footer .date { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LAPORAN TRANSAKSI TIMBANGAN SAWIT</h1>
        <p>{{ config('app.name', 'SISawit') }}</p>
        <p>Periode: {{ $dateStart ?: '—' }} s/d {{ $dateEnd ?: '—' }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:12%">No. Nota</th>
                <th style="width:10%">Tanggal</th>
                <th style="width:16%">Petani</th>
                <th style="width:14%">Kasir</th>
                <th style="width:9%" class="text-right">Tara (kg)</th>
                <th style="width:11%" class="text-right">Timbangan Kotor (kg)</th>
                <th style="width:11%" class="text-right">Timbangan Bersih (kg)</th>
                <th style="width:16%" class="text-right">Berat Sortiran (kg)</th>
                <th style="width:12%" class="text-right">Bayar Hutang (Rp)</th>
                <th style="width:13%" class="text-right">Diterima (Rp)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($transactions as $tx)
                <tr>
                    <td class="text-center">{{ $tx->nota_number }}</td>
                    <td class="text-center">{{ $tx->transaction_date instanceof \Carbon\Carbon ? $tx->transaction_date->format('d/m/Y') : date('d/m/Y', strtotime($tx->transaction_date)) }}</td>
                    <td>{{ $tx->farmer_name_snapshot }}</td>
                    <td>{{ $tx->cashier_name_snapshot }}</td>
                    <td class="text-right">{{ formatNumberId($tx->tare_weight) }}</td>
                    <td class="text-right">{{ formatNumberId($tx->initial_weight) }}</td>
                    <td class="text-right">{{ formatNumberId($tx->net_weight) }}</td>
                    <td class="text-right">@if($tx->has_sorting){{ formatNumberId($tx->sorting_weight) }}@else tidak ada sortiran @endif</td>
                    <td class="text-right">{{ $tx->debt_paid_amount > 0 ? 'Rp ' . number_format($tx->debt_paid_amount, 0, ',', '.') : '—' }}</td>
                    <td class="text-right">Rp {{ number_format($tx->final_paid_amount_rounded, 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="10" class="text-center">Tidak ada data transaksi untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>
        @if($summary)
        <tfoot>
            <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td class="text-right">{{ formatNumberId($summary['total_tare']) }}</td>
                <td class="text-right">{{ formatNumberId($summary['total_initial']) }}</td>
                <td class="text-right">{{ formatNumberId($summary['total_weight']) }}</td>
                <td class="text-right">{{ formatNumberId($summary['total_sorting']) }}</td>
                <td class="text-right">Rp {{ number_format($summary['total_debt_paid'], 0, ',', '.') }}</td>
                <td class="text-right">Rp {{ number_format($summary['total_paid_out'], 0, ',', '.') }}</td>
            </tr>
        </tfoot>
        @endif
    </table>

    <div class="footer">
        <p class="date">Dicetak: {{ now()->format('d/m/Y H:i') }}</p>
    </div>
</body>
</html>
