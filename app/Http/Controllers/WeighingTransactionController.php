<?php

namespace App\Http\Controllers;

use App\Models\CashierCashEntry;
use App\Models\Farmer;
use App\Models\FarmerDebt;
use App\Models\PalmPrice;
use App\Models\WeighingTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WeighingTransactionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = WeighingTransaction::with(['farmer', 'cashier'])
            ->where('is_latest_version', true)
            ->orderBy('transaction_date', 'desc');

        // Filter by farmer
        if ($request->has('farmer_id')) {
            $query->where('farmer_id', $request->farmer_id);
        }

        // Filter by date range
        if ($request->has('date_start')) {
            $query->whereDate('transaction_date', '>=', $request->date_start);
        }
        if ($request->has('date_end')) {
            $query->whereDate('transaction_date', '<=', $request->date_end);
        }

        $transactions = $query->paginate(20);

        return Inertia::render('Weighing/List', [
            'transactions' => $transactions,
            'filters' => $request->only(['farmer_id', 'date_start', 'date_end']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $farmers = Farmer::where('status', 'active')
            ->orderBy('name', 'asc')
            ->get();

        $latestPrice = PalmPrice::getLatestPrice();

        return Inertia::render('Weighing/Form', [
            'farmers' => $farmers,
            'latestPrice' => $latestPrice,
            'roundingMode' => 'none', // TODO: Get from settings
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'farmer_id' => 'required|exists:farmers,id',
            'transaction_date' => 'required|date',
            'gross_weight' => 'required|numeric|min:0',
            'tare_weight' => 'required|numeric|min:0',
            'has_deduction' => 'required|boolean',
            'deduction_percentage' => 'required|numeric|min:0|max:100',
            'palm_price_per_kg' => 'required|numeric|min:0',
            'has_sorting' => 'required|boolean',
            'sorting_weight' => 'nullable|numeric|min:0',
            'sorting_price_per_kg' => 'nullable|numeric|min:0',
            'debt_paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,transfer',
        ]);

        DB::beginTransaction();

        try {
            $farmer = Farmer::findOrFail($validated['farmer_id']);
            $user = $request->user();

            // Get current debt balance
            $currentDebt = $farmer->calculateDebtBalance();

            // Calculate transaction
            $calculation = WeighingTransaction::calculate([
                'gross_weight' => $validated['gross_weight'],
                'tare_weight' => $validated['tare_weight'],
                'has_deduction' => $validated['has_deduction'],
                'deduction_percentage' => $validated['deduction_percentage'],
                'palm_price_per_kg' => $validated['palm_price_per_kg'],
                'has_sorting' => $validated['has_sorting'],
                'sorting_weight' => $validated['sorting_weight'] ?? 0,
                'sorting_price_per_kg' => $validated['sorting_price_per_kg'] ?? 0,
                'previous_debt_amount' => $currentDebt,
                'debt_paid_amount' => $validated['debt_paid_amount'] ?? 0,
            ], 'none'); // TODO: Get rounding mode from settings

            // Generate nota number
            $today = new \DateTime($validated['transaction_date']);
            $todayTransactions = WeighingTransaction::whereDate('transaction_date', $today->format('Y-m-d'))->count();
            $notaNumber = WeighingTransaction::generateNotaNumber($today, $todayTransactions + 1);

            // Create transaction
            $transaction = WeighingTransaction::create([
                'nota_number' => $notaNumber,
                'farmer_id' => $farmer->id,
                'farmer_name_snapshot' => $farmer->name,
                'cashier_id' => $user->id,
                'cashier_name_snapshot' => $user->name,
                'transaction_date' => $validated['transaction_date'],
                'gross_weight' => $validated['gross_weight'],
                'tare_weight' => $validated['tare_weight'],
                'initial_weight' => $calculation['initial_weight'],
                'has_deduction' => $validated['has_deduction'],
                'deduction_percentage' => $validated['deduction_percentage'],
                'deduction_weight' => $calculation['deduction_weight'],
                'net_weight' => $calculation['net_weight'],
                'palm_price_per_kg' => $validated['palm_price_per_kg'],
                'palm_total_amount' => $calculation['palm_total_amount'],
                'has_sorting' => $validated['has_sorting'],
                'sorting_weight' => $validated['sorting_weight'] ?? 0,
                'sorting_price_per_kg' => $validated['sorting_price_per_kg'] ?? 0,
                'sorting_total_amount' => $calculation['sorting_total_amount'],
                'gross_total_amount' => $calculation['gross_total_amount'],
                'previous_debt_amount' => $currentDebt,
                'debt_paid_amount' => $validated['debt_paid_amount'] ?? 0,
                'remaining_debt_amount' => $calculation['remaining_debt_amount'],
                'final_paid_amount' => $calculation['final_paid_amount'],
                'final_paid_amount_rounded' => $calculation['final_paid_amount_rounded'],
                'payment_method' => $validated['payment_method'],
                'cashier_balance_deducted' => true,
                'status' => 'printed',
                'printed_at' => now(),
                'is_latest_version' => true,
                'revision_number' => 0,
                'created_by' => $user->id,
            ]);

            // Create debt payment record if any
            if (($validated['debt_paid_amount'] ?? 0) > 0) {
                FarmerDebt::create([
                    'farmer_id' => $farmer->id,
                    'farmer_name_snapshot' => $farmer->name,
                    'type' => 'payment',
                    'amount' => $validated['debt_paid_amount'],
                    'debt_date' => $validated['transaction_date'],
                    'description' => "Pelunasan via Nota #{$notaNumber}",
                    'transaction_id' => $transaction->id,
                    'created_by' => $user->id,
                ]);
            }

            // Create cash entry for farmer payment
            CashierCashEntry::create([
                'cashier_id' => $user->id,
                'cashier_name_snapshot' => $user->name,
                'type' => 'farmer_payment',
                'amount' => $calculation['final_paid_amount_rounded'],
                'payment_method' => $validated['payment_method'],
                'category' => 'bayar_petani',
                'description' => "Pembayaran Nota #{$notaNumber} - {$farmer->name}",
                'transaction_id' => $transaction->id,
                'entry_date' => $validated['transaction_date'],
                'created_by' => $user->id,
            ]);

            // Sync farmer balance
            $farmer->syncBalance();

            DB::commit();

            return redirect()->route('weighing.success', ['nota' => $notaNumber])
                ->with('success', 'Transaksi berhasil disimpan.');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal menyimpan transaksi: '.$e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(WeighingTransaction $weighingTransaction)
    {
        $weighingTransaction->load(['farmer', 'cashier', 'debts', 'cashEntries']);

        return Inertia::render('Weighing/Show', [
            'transaction' => $weighingTransaction,
        ]);
    }

    /**
     * Show success page with nota
     */
    public function success(Request $request)
    {
        $notaNumber = $request->query('nota');
        $transaction = WeighingTransaction::where('nota_number', $notaNumber)
            ->with(['farmer', 'cashier'])
            ->firstOrFail();

        return Inertia::render('Weighing/Success', [
            'transaction' => $transaction,
        ]);
    }

    /**
     * Get farmer debt balance
     */
    public function getFarmerDebt(Farmer $farmer)
    {
        return response()->json([
            'balance' => $farmer->calculateDebtBalance(),
        ]);
    }
}
