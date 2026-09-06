<?php

namespace App\Http\Controllers;

use App\Exports\ReportsExport;
use App\Models\FarmerDebt;
use App\Models\WeighingTransaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ReportsController extends Controller
{
    /**
     * Ambil transaksi timbangan + transaksi hutang manual (tanpa nota)
     * dalam periode, lalu gabung menjadi satu koleksi baris yang
     * dinormalisasi dan diurutkan berdasarkan tanggal (desc).
     */
    private function applyReportFilters(Request $request)
    {
        $transactions = WeighingTransaction::where('is_latest_version', true)
            ->where('status', '!=', 'draft');

        if ($request->filled('date_start')) {
            $transactions->whereDate('transaction_date', '>=', $request->date_start);
        }

        if ($request->filled('date_end')) {
            $transactions->whereDate('transaction_date', '<=', $request->date_end);
        }

        $transactionRows = $transactions->get()->map(fn ($tx) => [
            'type' => 'weighing',
            'debt_type' => null,
            'nota_number' => $tx->nota_number,
            'transaction_date' => $tx->transaction_date,
            'farmer_name_snapshot' => $tx->farmer_name_snapshot,
            'kasir_name' => $tx->cashier_name_snapshot,
            'tare_weight' => $tx->tare_weight,
            'initial_weight' => $tx->initial_weight,
            'net_weight' => $tx->net_weight,
            'has_sorting' => $tx->has_sorting,
            'sorting_weight' => $tx->sorting_weight,
            'loan_amount' => 0,
            'debt_paid_amount' => (float) $tx->debt_paid_amount,
            'final_paid_amount_rounded' => $tx->final_paid_amount_rounded,
        ]);

        $debts = FarmerDebt::with('creator')
            ->whereNull('transaction_id');

        if ($request->filled('date_start')) {
            $debts->whereDate('debt_date', '>=', $request->date_start);
        }

        if ($request->filled('date_end')) {
            $debts->whereDate('debt_date', '<=', $request->date_end);
        }

        $debtRows = $debts->get()->map(fn ($debt) => [
            'type' => 'debt',
            'debt_type' => $debt->type,
            'nota_number' => null,
            'transaction_date' => $debt->debt_date,
            'farmer_name_snapshot' => $debt->farmer_name_snapshot,
            'kasir_name' => $debt->creator?->name ?? '—',
            'tare_weight' => null,
            'initial_weight' => null,
            'net_weight' => null,
            'has_sorting' => false,
            'sorting_weight' => 0,
            'loan_amount' => $debt->type === 'loan' ? (float) $debt->amount : 0,
            'debt_paid_amount' => $debt->type === 'payment' ? (float) $debt->amount : 0,
            'final_paid_amount_rounded' => 0,
        ]);

        return $transactionRows->concat($debtRows)
            ->sortByDesc('transaction_date')
            ->values();
    }

    private function buildSummary($rows)
    {
        return [
            'total_transactions' => $rows->where('type', 'weighing')->count(),
            'total_weight' => $rows->where('type', 'weighing')->sum('net_weight'),
            'total_tare' => $rows->where('type', 'weighing')->sum('tare_weight'),
            'total_initial' => $rows->where('type', 'weighing')->sum('initial_weight'),
            'total_sorting' => $rows->where('type', 'weighing')->sum('sorting_weight'),
            'total_paid_out' => $rows->where('type', 'weighing')->sum('final_paid_amount_rounded'),
            'total_debt_paid' => $rows->sum('debt_paid_amount'),
            'total_loan' => $rows->sum('loan_amount'),
        ];
    }

    public function index(Request $request)
    {
        $transactions = collect();
        $summary = null;

        if ($request->hasAny(['date_start', 'date_end'])) {
            $transactions = $this->applyReportFilters($request);
            $summary = $this->buildSummary($transactions);
        }

        return Inertia::render('Reports/Index', [
            'transactions' => $transactions,
            'summary' => $summary,
            'filters' => $request->only(['date_start', 'date_end']),
        ]);
    }

    public function exportPdf(Request $request)
    {
        $transactions = $this->applyReportFilters($request);

        $pdf = Pdf::loadView('reports.pdf', [
            'transactions' => $transactions,
            'summary' => $this->buildSummary($transactions),
            'dateStart' => $request->date_start,
            'dateEnd' => $request->date_end,
        ])->setPaper('a4', 'landscape');

        $filename = 'laporan-timbangan'
            .($request->date_start ? '-'.$request->date_start : '')
            .($request->date_end ? '-sampai-'.$request->date_end : '')
            .'.pdf';

        return $pdf->download($filename);
    }

    public function exportExcel(Request $request)
    {
        $transactions = $this->applyReportFilters($request);

        $export = new ReportsExport($transactions, $this->buildSummary($transactions));

        $filename = 'laporan-timbangan'
            .($request->date_start ? '-'.$request->date_start : '')
            .($request->date_end ? '-sampai-'.$request->date_end : '')
            .'.xlsx';

        return Excel::download($export, $filename);
    }
}
