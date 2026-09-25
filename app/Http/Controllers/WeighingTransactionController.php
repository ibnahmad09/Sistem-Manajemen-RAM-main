<?php

namespace App\Http\Controllers;

use App\Models\CashierCashEntry;
use App\Models\DeductionConfig;
use App\Models\Farmer;
use App\Models\FarmerDebt;
use App\Models\PalmPrice;
use App\Models\WeighingLoad;
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
        $query = WeighingTransaction::with(['farmer', 'cashier', 'loads'])
            ->where('is_latest_version', true)
            ->where('status', '!=', 'draft')
            ->orderBy('transaction_date', 'desc');

        // Filter by farmer name search
        if ($request->filled('farmer_name')) {
            $query->whereHas('farmer', function ($q) use ($request) {
                $q->where('name', 'like', '%'.$request->farmer_name.'%');
            });
        }

        // Filter by date range
        if ($request->has('date_start')) {
            $query->whereDate('transaction_date', '>=', $request->date_start);
        }
        if ($request->has('date_end')) {
            $query->whereDate('transaction_date', '<=', $request->date_end);
        }

        // Hitung summary SEBELUM paginate: paginate() menerapkan limit/offset ke builder
        // (via forPage), dan agregat Laravel tidak membersihkan limit/offset — jika
        // dihitung setelahnya, total di halaman 2+ akan salah (0).
        $summary = [
            'total_bruto' => (float) (clone $query)->sum('gross_weight'),
            'total_timbangan_kotor' => (float) (clone $query)->sum('initial_weight'),
        ];

        $transactions = $query->paginate(20)->withQueryString();

        $activeDrafts = WeighingTransaction::activeDraft()
            ->with(['farmer', 'loads'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return Inertia::render('Weighing/List', [
            'transactions' => $transactions,
            'summary' => $summary,
            'activeDrafts' => $activeDrafts,
            'filters' => $request->only(['farmer_name', 'date_start', 'date_end']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $farmers = Farmer::where('status', 'active')
            ->orderBy('name', 'asc')
            ->get();

        $latestPrice = PalmPrice::getLatestPrice();
        $deductionConfig = DeductionConfig::getActiveConfig();

        $draft = null;
        if ($request->has('draft')) {
            $draft = WeighingTransaction::activeDraft()
                ->with(['farmer', 'loads'])
                ->findOrFail($request->query('draft'));
        }

        $activeDrafts = WeighingTransaction::activeDraft()
            ->with(['farmer', 'loads'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return Inertia::render('Weighing/Form', [
            'farmers' => $farmers,
            'latestPrice' => $latestPrice,
            'deductionConfig' => $deductionConfig,
            'roundingMode' => 'none', // TODO: Get from settings
            'draft' => $draft,
            'activeDrafts' => $activeDrafts,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(WeighingTransaction $weighing)
    {
        abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 404);

        $weighing->load(['farmer', 'loads']);

        $farmers = Farmer::where('status', 'active')
            ->orderBy('name', 'asc')
            ->get();

        $latestPrice = PalmPrice::getLatestPrice();
        $deductionConfig = DeductionConfig::getActiveConfig();

        return Inertia::render('Weighing/Form', [
            'transaction' => $weighing,
            'farmers' => $farmers,
            'latestPrice' => $latestPrice,
            'deductionConfig' => $deductionConfig,
            'roundingMode' => 'none', // TODO: Get from settings
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $this->validatedData($request);
        $action = $request->input('action', 'finalize');

        $farmer = Farmer::findOrFail($validated['farmer_id']);
        $user = $request->user();

        if ($action === 'save_draft' && WeighingTransaction::activeDraft()->where('farmer_id', $farmer->id)->exists()) {
            return back()->withErrors(['farmer_id' => 'Petani ini sudah punya draft aktif. Lanjutkan draft tersebut.']);
        }

        $loads = $this->normalizeLoads($validated['loads'], (float) ($validated['sorting_price_per_kg'] ?? 0));

        if ($loadError = $this->loadsError($loads)) {
            return back()->withErrors(['loads' => $loadError]);
        }

        DB::beginTransaction();

        try {
            $currentDebt = $farmer->calculateDebtBalance();
            $calculation = $this->calculate($validated, $loads, $currentDebt, $action);

            if (($validated['debt_paid_amount'] ?? 0) > $calculation['gross_total_amount']) {
                throw new \InvalidArgumentException('Pembayaran hutang tidak boleh melebihi total bruto.');
            }

            $transaction = new WeighingTransaction;
            $this->fillTransactionData($transaction, $farmer, $user, $validated, $loads, $calculation, $currentDebt, $action);

            if ($action === 'save_draft') {
                $this->applyDraftLifecycle($transaction);
            } else {
                $this->applyFinalizedLifecycle($transaction);
            }

            $transaction->save();

            $this->storeLoads($transaction, $loads, $calculation);

            if ($action === 'finalize') {
                $this->finalizeDraft($transaction, $farmer, $user, $validated);
            }

            DB::commit();

            if ($action === 'save_draft') {
                return redirect()->route('weighing.create', ['draft' => $transaction->id])
                    ->with('success', 'Muatan disimpan sebagai draft. Petani bisa lanjut kapan saja.');
            }

            return redirect()->route('weighing.success', ['nota' => $transaction->nota_number])
                ->with('success', 'Transaksi berhasil disimpan.');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal menyimpan transaksi: '.$e->getMessage()]);
        }
    }

    /**
     * Update a draft transaction (resume / tambah muatan / koreksi).
     */
    public function update(Request $request, WeighingTransaction $weighing)
    {
        $validated = $this->validatedData($request);
        $action = $request->input('action', 'finalize');

        $farmer = Farmer::findOrFail($validated['farmer_id']);
        $user = $request->user();

        $loads = $this->normalizeLoads($validated['loads'], (float) ($validated['sorting_price_per_kg'] ?? 0));

        if ($loadError = $this->loadsError($loads)) {
            return back()->withErrors(['loads' => $loadError]);
        }

        DB::beginTransaction();

        try {
            $weighing = WeighingTransaction::query()->whereKey($weighing->id)->lockForUpdate()->firstOrFail();

            if ($weighing->status !== 'draft') {
                abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 422);

                $request->validate(['revision_reason' => 'required|string|max:255']);

                $action = 'finalize';

                $currentDebt = $farmer->calculateDebtBalance();
                $calculation = $this->calculate($validated, $loads, $currentDebt, $action);

                if (($validated['debt_paid_amount'] ?? 0) > $calculation['gross_total_amount']) {
                    throw new \InvalidArgumentException('Pembayaran hutang tidak boleh melebihi total bruto.');
                }

                // Archive old transaction
                $weighing->update([
                    'is_latest_version' => false,
                    'status' => 'revised',
                    'cashier_balance_deducted' => false,
                ]);

                // Create new revision row
                $txn = new WeighingTransaction;
                $this->fillTransactionData($txn, $farmer, $user, $validated, $loads, $calculation, $currentDebt, 'finalize');
                $txn->status = 'printed';
                $txn->printed_at = now();
                $txn->is_latest_version = true;
                $txn->cashier_balance_deducted = true;
                $txn->revision_of = $weighing->id;
                $txn->revision_number = $weighing->revision_number + 1;
                $txn->revision_reason = $request->revision_reason;
                $txn->save();

                $this->storeLoads($txn, $loads, $calculation);

                // Reverse old transaction's financials BEFORE generating nota
                $this->reverseTransactionFinancials($weighing, $user);

                // Generate nota number
                $today = new \DateTime($validated['transaction_date']);
                $seq = WeighingTransaction::whereDate('transaction_date', $today->format('Y-m-d'))
                    ->where('status', '!=', 'draft')
                    ->where('id', '!=', $txn->id)
                    ->count();
                $nota = WeighingTransaction::generateNotaNumber($today, $seq + 1);
                $txn->update(['nota_number' => $nota]);

                // Create financial entries for the new transaction
                $this->createFinancialEntries($txn, $farmer, $user, $validated);

                DB::commit();

                return redirect()->route('weighing.success', ['nota' => $txn->nota_number])
                    ->with('success', 'Revisi transaksi berhasil disimpan.');
            }

            $currentDebt = $farmer->calculateDebtBalance();
            $calculation = $this->calculate($validated, $loads, $currentDebt, $action);

            if (($validated['debt_paid_amount'] ?? 0) > $calculation['gross_total_amount']) {
                throw new \InvalidArgumentException('Pembayaran hutang tidak boleh melebihi total bruto.');
            }

            $this->fillTransactionData($weighing, $farmer, $user, $validated, $loads, $calculation, $currentDebt, $action);
            $weighing->save();

            $weighing->loads()->delete();
            $this->storeLoads($weighing, $loads, $calculation);

            if ($action === 'finalize') {
                $this->finalizeDraft($weighing, $farmer, $user, $validated);
            }

            DB::commit();

            if ($action === 'save_draft') {
                return redirect()->route('weighing.create', ['draft' => $weighing->id])
                    ->with('success', 'Draft berhasil disimpan.');
            }

            return redirect()->route('weighing.success', ['nota' => $weighing->nota_number])
                ->with('success', 'Transaksi berhasil disimpan.');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal menyimpan draft: '.$e->getMessage()]);
        }
    }

    /**
     * Finalize a draft directly (dari daftar Timbangan Berjalan).
     */
    public function finalize(Request $request, WeighingTransaction $weighing)
    {
        $user = $request->user();

        DB::beginTransaction();

        try {
            $weighing = WeighingTransaction::query()->with('loads')->whereKey($weighing->id)->lockForUpdate()->firstOrFail();

            if ($weighing->status !== 'draft') {
                DB::rollBack();

                return back()->withErrors(['error' => 'Hanya transaksi draft yang bisa difinalisasi.']);
            }

            $farmer = $weighing->farmer;

            $loads = $weighing->loads
                ->map(fn ($load) => [
                    'gross_weight' => $load->gross_weight,
                    'tare_weight' => $load->tare_weight,
                    'has_sorting' => $load->has_sorting,
                    'sorting_weight' => $load->sorting_weight,
                    'sorting_price_per_kg' => $load->sorting_price_per_kg,
                ])
                ->values()
                ->toArray();

            $validated = [
                'farmer_id' => $weighing->farmer_id,
                'transaction_date' => $weighing->transaction_date->format('Y-m-d'),
                'has_deduction' => $weighing->has_deduction,
                'deduction_percentage' => $weighing->deduction_percentage,
                'palm_price_per_kg' => $weighing->palm_price_per_kg,
                'sorting_price_per_kg' => $weighing->sorting_price_per_kg,
                'sorting_deduction_percentage' => $weighing->sorting_deduction_percentage,
                'debt_paid_amount' => $weighing->debt_paid_amount,
                'payment_method' => $weighing->payment_method,
            ];

            // Guard untuk draft lama (tersimpan sebelum guard ada): tolak muatan
            // yang berat sortirannya melebihi netto kotor agar tidak difinalisasi
            // dengan netto negatif.
            foreach ($weighing->loads as $i => $load) {
                if ($load->has_sorting && $load->sorting_weight > $load->gross_weight - $load->tare_weight) {
                    DB::rollBack();

                    return back()->withErrors(['error' => 'Tidak bisa finalisasi: berat sortiran melebihi netto kotor muatan #'.($i + 1).'.']);
                }
            }

            $currentDebt = $farmer->calculateDebtBalance();
            $calculation = $this->calculate($validated, $loads, $currentDebt, 'finalize');

            if (($validated['debt_paid_amount'] ?? 0) > $calculation['gross_total_amount']) {
                throw new \InvalidArgumentException('Pembayaran hutang tidak boleh melebihi total bruto.');
            }

            $this->fillTransactionData($weighing, $farmer, $user, $validated, $loads, $calculation, $currentDebt, 'finalize');
            $weighing->save();

            $this->finalizeDraft($weighing, $farmer, $user, $validated);

            DB::commit();

            return redirect()->route('weighing.success', ['nota' => $weighing->nota_number])
                ->with('success', 'Transaksi berhasil difinalisasi.');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal memfinalisasi transaksi: '.$e->getMessage()]);
        }
    }

    /**
     * Cancel a weighing transaction — draft or final (void).
     */
    public function cancel(Request $request, WeighingTransaction $weighing)
    {
        $user = $request->user();

        if ($weighing->status === 'draft') {
            $weighing->update([
                'status' => 'cancelled',
                'is_latest_version' => false,
            ]);

            return back()->with('success', 'Draft dibatalkan.');
        }

        abort_unless($weighing->is_latest_version && in_array($weighing->status, ['printed', 'revised']), 422, 'Hanya transaksi final terbaru yang bisa dibatalkan.');

        DB::beginTransaction();
        try {
            $this->reverseTransactionFinancials($weighing, $user);
            $weighing->update([
                'status' => 'cancelled',
                'is_latest_version' => false,
                'cashier_balance_deducted' => false,
            ]);
            $weighing->farmer->syncBalance();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal membatalkan transaksi: '.$e->getMessage()]);
        }

        return back()->with('success', 'Transaksi dibatalkan. Saldo kasir & petani dikoreksi otomatis.');
    }

    /**
     * Display the specified resource.
     */
    public function show(WeighingTransaction $weighing)
    {
        $weighing->load(['farmer', 'cashier', 'debts', 'cashEntries', 'loads']);

        return Inertia::render('Weighing/Show', [
            'transaction' => $weighing,
        ]);
    }

    /**
     * Show success page with nota
     */
    public function success(Request $request)
    {
        $notaNumber = $request->query('nota');
        $transaction = WeighingTransaction::where('nota_number', $notaNumber)
            ->with(['farmer', 'cashier', 'loads'])
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

    /**
     * Validate and return the transaction input data.
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'farmer_id' => 'required|exists:farmers,id',
            'transaction_date' => 'required|date',
            'loads' => 'required|array|min:1',
            'loads.*.gross_weight' => 'required|numeric|min:0',
            'loads.*.tare_weight' => 'required|numeric|min:0',
            'loads.*.has_sorting' => 'sometimes|boolean',
            'loads.*.sorting_weight' => 'nullable|numeric|min:0',
            'has_deduction' => 'required|boolean',
            'deduction_percentage' => 'required|numeric|min:0|max:100',
            'palm_price_per_kg' => 'required|numeric|min:0',
            'sorting_price_per_kg' => 'nullable|numeric|min:0',
            'sorting_deduction_percentage' => 'nullable|numeric|min:0|max:100',
            'debt_paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,transfer',
        ]);
    }

    /**
     * Normalize submitted loads into a uniform structure.
     */
    private function normalizeLoads(array $loads, float $sortingPricePerKg): array
    {
        $result = [];

        foreach ($loads as $load) {
            $result[] = [
                'gross_weight' => (float) $load['gross_weight'],
                'tare_weight' => (float) $load['tare_weight'],
                'has_sorting' => (bool) ($load['has_sorting'] ?? false),
                'sorting_weight' => (float) ($load['sorting_weight'] ?? 0),
                'sorting_price_per_kg' => $sortingPricePerKg,
            ];
        }

        return $result;
    }

    /**
     * Ensure every load has gross weight greater than tare weight.
     *
     * @return string|null Error message, or null when valid
     */
    private function loadsError(array $loads): ?string
    {
        foreach ($loads as $index => $load) {
            if ($load['gross_weight'] <= $load['tare_weight']) {
                return 'Berat bruto muatan #'.($index + 1).' harus lebih besar dari berat tara.';
            }

            if ($load['has_sorting'] && $load['sorting_weight'] > $load['gross_weight'] - $load['tare_weight']) {
                return 'Berat sortiran muatan #'.($index + 1).' tidak boleh melebihi netto kotor.';
            }
        }

        return null;
    }

    /**
     * Apply lifecycle fields for a saved (non-finalized) draft.
     */
    private function applyDraftLifecycle(WeighingTransaction $transaction): void
    {
        $transaction->status = 'draft';
        $transaction->printed_at = null;
        $transaction->is_latest_version = true;
        $transaction->revision_number = 0;
        $transaction->cashier_balance_deducted = false;
    }

    /**
     * Apply lifecycle fields for a finalized (printed) transaction.
     */
    private function applyFinalizedLifecycle(WeighingTransaction $transaction): void
    {
        $transaction->status = 'printed';
        $transaction->printed_at = now();
        $transaction->is_latest_version = true;
        $transaction->revision_number = 0;
        $transaction->cashier_balance_deducted = true;
    }

    /**
     * Run the multi-load calculation for a transaction.
     */
    private function calculate(array $validated, array $loads, float $currentDebt, string $action): array
    {
        return WeighingTransaction::calculateLoads($loads, [
            'has_deduction' => $validated['has_deduction'],
            'deduction_percentage' => $validated['deduction_percentage'],
            'palm_price_per_kg' => $validated['palm_price_per_kg'],
            'sorting_deduction_percentage' => $validated['sorting_deduction_percentage'] ?? 0,
            'previous_debt_amount' => $currentDebt,
            'debt_paid_amount' => $validated['debt_paid_amount'] ?? 0,
        ], 'none'); // TODO: Get rounding mode from settings
    }

    /**
     * Fill a transaction record with computed data.
     */
    private function fillTransactionData(
        WeighingTransaction $transaction,
        Farmer $farmer,
        $user,
        array $validated,
        array $loads,
        array $calculation,
        float $currentDebt,
        string $action = 'finalize'
    ): void {
        $transaction->fill([
            'farmer_id' => $farmer->id,
            'farmer_name_snapshot' => $farmer->name,
            'cashier_id' => $user->id,
            'cashier_name_snapshot' => $user->name,
            'transaction_date' => $validated['transaction_date'],
            'gross_weight' => $calculation['gross_weight'],
            'tare_weight' => $calculation['tare_weight'],
            'initial_weight' => $calculation['initial_weight'],
            'has_deduction' => $validated['has_deduction'],
            'deduction_percentage' => $validated['deduction_percentage'],
            'deduction_weight' => $calculation['deduction_weight'],
            'net_weight' => $calculation['net_weight'],
            'palm_price_per_kg' => $validated['palm_price_per_kg'],
            'palm_total_amount' => $calculation['palm_total_amount'],
            'has_sorting' => $calculation['has_sorting'],
            'sorting_weight' => $calculation['sorting_weight'],
            'sorting_price_per_kg' => $validated['sorting_price_per_kg'] ?? 0,
            'sorting_deduction_percentage' => $validated['sorting_deduction_percentage'] ?? 0,
            'sorting_deduction_weight' => $calculation['sorting_deduction_weight'],
            'sorting_net_weight' => $calculation['sorting_net_weight'],
            'sorting_total_amount' => $calculation['sorting_total_amount'],
            'gross_total_amount' => $calculation['gross_total_amount'],
            'previous_debt_amount' => $currentDebt,
            'debt_paid_amount' => $validated['debt_paid_amount'] ?? 0,
            'remaining_debt_amount' => $calculation['remaining_debt_amount'],
            'final_paid_amount' => $calculation['final_paid_amount'],
            'final_paid_amount_rounded' => $calculation['final_paid_amount_rounded'],
            'payment_method' => $validated['payment_method'],
            'created_by' => $user->id,
        ]);
    }

    /**
     * Persist the loads of a transaction.
     */
    private function storeLoads(WeighingTransaction $transaction, array $loads, array $calculation): void
    {
        foreach ($loads as $i => $load) {
            $perLoad = $calculation['loads'][$i];

            WeighingLoad::create([
                'weighing_transaction_id' => $transaction->id,
                'seq_no' => $i + 1,
                'gross_weight' => $load['gross_weight'],
                'tare_weight' => $load['tare_weight'],
                'initial_weight' => $perLoad['initial_weight'],
                'deduction_weight' => $perLoad['deduction_weight'],
                'net_weight' => $perLoad['net_weight'],
                'has_sorting' => $load['has_sorting'],
                'sorting_weight' => $load['sorting_weight'],
                'sorting_price_per_kg' => $load['sorting_price_per_kg'],
                'sorting_deduction_weight' => $perLoad['sorting_deduction_weight'],
                'sorting_net_weight' => $perLoad['sorting_net_weight'],
                'sorting_total_amount' => $perLoad['sorting_total_amount'],
            ]);
        }
    }

    /**
     * Finalize a draft: nota number, printed status, debt payment, cash entry.
     */
    private function finalizeDraft(WeighingTransaction $transaction, Farmer $farmer, $user, array $validated): void
    {
        $today = new \DateTime($validated['transaction_date']);
        $todayTransactions = WeighingTransaction::whereDate('transaction_date', $today->format('Y-m-d'))
            ->where('status', '!=', 'draft')
            ->where('id', '!=', $transaction->id)
            ->count();
        $notaNumber = WeighingTransaction::generateNotaNumber($today, $todayTransactions + 1);

        $transaction->update([
            'nota_number' => $notaNumber,
            'status' => 'printed',
            'printed_at' => now(),
            'is_latest_version' => true,
            'revision_number' => 0,
            'cashier_balance_deducted' => true,
        ]);

        $this->createFinancialEntries($transaction, $farmer, $user, $validated);
    }

    /**
     * Create financial entries (FarmerDebt + CashierCashEntry) for a finalized transaction.
     */
    private function createFinancialEntries(WeighingTransaction $transaction, Farmer $farmer, $user, array $validated): void
    {
        if (($validated['debt_paid_amount'] ?? 0) > 0) {
            FarmerDebt::create([
                'farmer_id' => $farmer->id,
                'farmer_name_snapshot' => $farmer->name,
                'type' => 'payment',
                'amount' => $validated['debt_paid_amount'],
                'debt_date' => $validated['transaction_date'],
                'description' => "Pelunasan via Nota #{$transaction->nota_number}",
                'transaction_id' => $transaction->id,
                'created_by' => $user->id,
            ]);
        }

        CashierCashEntry::create([
            'cashier_id' => $user->id,
            'cashier_name_snapshot' => $user->name,
            'type' => 'farmer_payment',
            'amount' => $transaction->final_paid_amount_rounded,
            'payment_method' => $validated['payment_method'],
            'category' => 'bayar_petani',
            'description' => "Pembayaran Nota #{$transaction->nota_number} - {$farmer->name}",
            'transaction_id' => $transaction->id,
            'entry_date' => $validated['transaction_date'],
            'created_by' => $user->id,
        ]);

        Farmer::find($transaction->farmer_id)->syncBalance();
    }

    /**
     * Reverse financial entries for a transaction being revised.
     * Creates negative CashierCashEntry and FarmerDebt entries to undo the original.
     */
    private function reverseTransactionFinancials(WeighingTransaction $transaction, $user): void
    {
        CashierCashEntry::create([
            'cashier_id' => $transaction->cashier_id,
            'cashier_name_snapshot' => $transaction->cashier_name_snapshot,
            'type' => 'farmer_payment',
            'amount' => -$transaction->final_paid_amount_rounded,
            'payment_method' => $transaction->payment_method,
            'category' => 'bayar_petani',
            'description' => "Pembatalan Nota #{$transaction->nota_number} - {$transaction->farmer_name_snapshot}",
            'transaction_id' => $transaction->id,
            'entry_date' => $transaction->transaction_date,
            'created_by' => $user->id,
        ]);

        if ($transaction->debt_paid_amount > 0) {
            FarmerDebt::create([
                'farmer_id' => $transaction->farmer_id,
                'farmer_name_snapshot' => $transaction->farmer_name_snapshot,
                'type' => 'payment',
                'amount' => -$transaction->debt_paid_amount,
                'debt_date' => $transaction->transaction_date,
                'description' => "Pembatalan pelunasan via Nota #{$transaction->nota_number}",
                'transaction_id' => $transaction->id,
                'created_by' => $user->id,
            ]);
        }

        Farmer::find($transaction->farmer_id)->syncBalance();
    }
}
