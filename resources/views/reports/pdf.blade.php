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
                <th style="width:9%" class="text-right">Bruto (kg)</th>
                <th style="width:9%" class="text-right">Tara (kg)</th>
                <th style="width:9%" class="text-right">Neto (kg)</th>
                <th style="width:12%" class="text-right">Bruto Sblm Potongan (kg)</th>
                <th style="width:13%" class="text-right">Total Bruto (Rp)</th>
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
                    <td class="text-right">{{ number_format($tx->gross_weight, 2, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($tx->tare_weight, 2, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($tx->net_weight, 2, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($tx->initial_weight, 2, ',', '.') }}</td>
                    <td class="text-right">Rp {{ number_format($tx->gross_total_amount, 0, ',', '.') }}</td>
                    <td class="text-right">{{ $tx->debt_paid_amount > 0 ? 'Rp ' . number_format($tx->debt_paid_amount, 0, ',', '.') : '—' }}</td>
                    <td class="text-right">Rp {{ number_format($tx->final_paid_amount_rounded, 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="11" class="text-center">Tidak ada data transaksi untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>
        @if($summary)
        <tfoot>
            <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td class="text-right">{{ number_format($summary['total_gross'], 2, ',', '.') }}</td>
                <td class="text-right">{{ number_format($summary['total_tare'], 2, ',', '.') }}</td>
                <td class="text-right">{{ number_format($summary['total_weight'], 2, ',', '.') }}</td>
                <td class="text-right">{{ number_format($summary['total_initial'], 2, ',', '.') }}</td>
                <td class="text-right">Rp {{ number_format($summary['total_revenue'], 0, ',', '.') }}</td>
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
