<?php

namespace App\Http\Controllers;

use App\Models\WeighingTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportsController extends Controller
{
    /**
     * Display the reports index with optional filtering.
     */
    public function index(Request $request)
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

        $transactions = collect();
        $summary = null;

        if ($request->hasAny(['date_start', 'date_end'])) {
            $transactions = $query->get();

            $summary = [
                'total_transactions' => $transactions->count(),
                'total_weight' => $transactions->sum('net_weight'),
                'total_revenue' => $transactions->sum('gross_total_amount'),
                'total_paid_out' => $transactions->sum('final_paid_amount_rounded'),
                'total_debt_paid' => $transactions->sum('debt_paid_amount'),
            ];
        }

        return Inertia::render('Reports/Index', [
            'transactions' => $transactions,
            'summary' => $summary,
            'filters' => $request->only(['date_start', 'date_end']),
        ]);
    }
}
