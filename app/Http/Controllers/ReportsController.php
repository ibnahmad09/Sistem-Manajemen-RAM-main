<?php

namespace App\Http\Controllers;

use App\Exports\ReportsExport;
use App\Models\WeighingTransaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ReportsController extends Controller
{
    private function applyReportFilters(Request $request)
    {
        $query = WeighingTransaction::where('is_latest_version', true)
            ->where('status', '!=', 'draft')
            ->orderBy('transaction_date', 'desc');

        if ($request->filled('date_start')) {
            $query->whereDate('transaction_date', '>=', $request->date_start);
        }

        if ($request->filled('date_end')) {
            $query->whereDate('transaction_date', '<=', $request->date_end);
        }

        return $query->get();
    }

    private function buildSummary($transactions)
    {
        return [
            'total_transactions' => $transactions->count(),
            'total_weight' => $transactions->sum('net_weight'),
            'total_revenue' => $transactions->sum('gross_total_amount'),
            'total_paid_out' => $transactions->sum('final_paid_amount_rounded'),
            'total_debt_paid' => $transactions->sum('debt_paid_amount'),
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
