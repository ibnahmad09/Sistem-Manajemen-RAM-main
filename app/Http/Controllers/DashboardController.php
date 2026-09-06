<?php

namespace App\Http\Controllers;

use App\Models\CashierCashEntry;
use App\Models\Farmer;
use App\Models\WeighingTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * Super Admin Dashboard
     */
    public function superAdmin(Request $request)
    {
        $user = $request->user();

        // Statistics
        $totalFarmers = Farmer::where('status', 'active')->count();

        $todayScope = WeighingTransaction::whereDate('transaction_date', today())
            ->where('status', '!=', 'draft');

        $totalTransactionsToday = (clone $todayScope)->count();
        $totalRevenueToday = (clone $todayScope)->sum('gross_total_amount');
        $brutoWeightToday = (clone $todayScope)->sum('gross_weight');
        $nettoWeightToday = (clone $todayScope)->sum('initial_weight');
        $totalDebt = Farmer::sum('balance');

        // Recent transactions
        $recentTransactions = WeighingTransaction::with(['farmer', 'cashier'])
            ->where('is_latest_version', true)
            ->where('status', '!=', 'draft')
            ->orderBy('transaction_date', 'desc')
            ->limit(10)
            ->get();

        // Monthly revenue chart data
        $monthlyRevenue = WeighingTransaction::select(
            DB::raw($this->monthExpression().' as month'),
            DB::raw('SUM(gross_total_amount) as total')
        )
            ->where('transaction_date', '>=', now()->subMonths(6))
            ->where('status', '!=', 'draft')
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get();

        return Inertia::render('Dashboard/SuperAdmin', [
            'stats' => [
                'totalFarmers' => $totalFarmers,
                'totalTransactionsToday' => $totalTransactionsToday,
                'totalRevenueToday' => $totalRevenueToday,
                'brutoWeightToday' => (float) $brutoWeightToday,
                'nettoWeightToday' => (float) $nettoWeightToday,
                'totalDebt' => $totalDebt,
            ],
            'recentTransactions' => $recentTransactions,
            'monthlyRevenue' => $monthlyRevenue,
        ]);
    }

    /**
     * Cashier Dashboard
     */
    public function cashier(Request $request)
    {
        $user = $request->user();

        // Today's statistics
        $todayScope = WeighingTransaction::where('cashier_id', $user->id)
            ->whereDate('transaction_date', today())
            ->where('status', '!=', 'draft');

        $transactionsToday = (clone $todayScope)->count();
        $brutoWeightToday = (clone $todayScope)->sum('gross_weight');
        $nettoWeightToday = (clone $todayScope)->sum('initial_weight');
        $cashOutToday = (clone $todayScope)->sum('final_paid_amount_rounded');

        // Cash balance
        $cashIn = CashierCashEntry::where('cashier_id', $user->id)
            ->where('type', 'cash_in')
            ->sum('amount');

        $cashOut = CashierCashEntry::where('cashier_id', $user->id)
            ->whereIn('type', ['expense', 'farmer_payment'])
            ->sum('amount');

        $cashBalance = $cashIn - $cashOut;

        // Recent transactions
        $recentTransactions = WeighingTransaction::with('farmer')
            ->where('cashier_id', $user->id)
            ->where('is_latest_version', true)
            ->where('status', '!=', 'draft')
            ->orderBy('transaction_date', 'desc')
            ->limit(10)
            ->get();

        // Farmers with debt
        $farmersWithDebt = Farmer::where('status', 'active')
            ->where('balance', '>', 0)
            ->orderBy('balance', 'desc')
            ->limit(5)
            ->get();

        return Inertia::render('Dashboard/Cashier', [
            'stats' => [
                'transactionsToday' => $transactionsToday,
                'brutoWeightToday' => (float) $brutoWeightToday,
                'nettoWeightToday' => (float) $nettoWeightToday,
                'cashOutToday' => $cashOutToday,
                'cashBalance' => $cashBalance,
            ],
            'recentTransactions' => $recentTransactions,
            'farmersWithDebt' => $farmersWithDebt,
        ]);
    }

    /**
     * Owner Dashboard
     */
    public function owner(Request $request)
    {
        // Monthly revenue
        $monthlyRevenue = WeighingTransaction::select(
            DB::raw($this->monthExpression().' as month'),
            DB::raw('SUM(gross_total_amount) as revenue'),
            DB::raw('SUM(final_paid_amount_rounded) as paid_out'),
            DB::raw('COUNT(*) as transactions')
        )
            ->where('transaction_date', '>=', now()->subMonths(12))
            ->where('status', '!=', 'draft')
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->get();

        // Total statistics
        $totalScope = WeighingTransaction::where('status', '!=', 'draft');

        $totalRevenue = (clone $totalScope)->sum('gross_total_amount');
        $totalPaidOut = (clone $totalScope)->sum('final_paid_amount_rounded');
        $totalBrutoWeight = (clone $totalScope)->sum('gross_weight');
        $totalNettoWeight = (clone $totalScope)->sum('initial_weight');
        $totalTransactions = (clone $totalScope)->where('is_latest_version', true)->count();
        $totalDebt = Farmer::sum('balance');

        // Top farmers by transaction volume
        $topFarmers = WeighingTransaction::select(
            'farmer_id',
            'farmer_name_snapshot',
            DB::raw('COUNT(*) as transaction_count'),
            DB::raw('SUM(gross_total_amount) as total_revenue')
        )
            ->where('is_latest_version', true)
            ->where('status', '!=', 'draft')
            ->groupBy('farmer_id', 'farmer_name_snapshot')
            ->orderBy('total_revenue', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('Dashboard/Owner', [
            'stats' => [
                'totalRevenue' => $totalRevenue,
                'totalPaidOut' => $totalPaidOut,
                'totalTransactions' => $totalTransactions,
                'totalBrutoWeight' => (float) $totalBrutoWeight,
                'totalNettoWeight' => (float) $totalNettoWeight,
                'totalDebt' => $totalDebt,
            ],
            'monthlyRevenue' => $monthlyRevenue,
            'topFarmers' => $topFarmers,
        ]);
    }

    /**
     * Ekspresi SQL untuk ekstrak bulan (YYYY-MM) dari transaction_date,
     * kompatibel MySQL (DATE_FORMAT) dan SQLite (strftime).
     */
    private function monthExpression(): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', transaction_date)"
            : "DATE_FORMAT(transaction_date, '%Y-%m')";
    }
}
