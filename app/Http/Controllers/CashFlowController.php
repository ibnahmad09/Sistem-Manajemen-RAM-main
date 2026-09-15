<?php

namespace App\Http\Controllers;

use App\Models\CashierCashEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CashFlowController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Filter by cashier (super_admin can see all)
        $query = CashierCashEntry::with(['cashier', 'transaction']);

        if ($user->role !== 'super_admin') {
            $query->where('cashier_id', $user->id);
        }

        // Filter by date range
        if ($request->has('date_start')) {
            $query->whereDate('entry_date', '>=', $request->date_start);
        }
        if ($request->has('date_end')) {
            $query->whereDate('entry_date', '<=', $request->date_end);
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $entries = $query->orderBy('entry_date', 'desc')->paginate(50);

        // Scope totals to the selected range — or "today" when no range is
        // set.  Each new day therefore starts from Rp0 while the table below
        // keeps the full history visible.
        $scoped = function (array $types) use ($user, $request) {
            return CashierCashEntry::whereIn('type', $types)
                ->when(
                    $user->role !== 'super_admin',
                    fn ($q) => $q->where('cashier_id', $user->id),
                )
                ->when(
                    $request->has('date_start') || $request->has('date_end'),
                    fn ($q) => $q
                        ->when(
                            $request->has('date_start'),
                            fn ($q2) => $q2->whereDate('entry_date', '>=', $request->date_start),
                        )
                        ->when(
                            $request->has('date_end'),
                            fn ($q2) => $q2->whereDate('entry_date', '<=', $request->date_end),
                        ),
                    fn ($q) => $q->whereDate('entry_date', now()->toDateString()),
                );
        };

        $cashIn = $scoped(['cash_in'])->sum('amount');
        $cashOut = $scoped(['expense', 'farmer_payment'])->sum('amount');
        $balance = $cashIn - $cashOut;

        // Summary by category — same cashier + date scope as the balance.
        $summary = $scoped(['cash_in', 'expense', 'farmer_payment'])
            ->select(
                'category',
                'type',
                DB::raw('SUM(amount) as total'),
                DB::raw('COUNT(*) as count'),
            )
            ->groupBy('category', 'type')
            ->get();

        return Inertia::render('CashFlow/Index', [
            'entries' => $entries,
            'balance' => [
                'cash_in' => $cashIn,
                'cash_out' => $cashOut,
                'balance' => $balance,
            ],
            'summary' => $summary,
            'filters' => $request->only(['date_start', 'date_end', 'type']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:cash_in,expense,farmer_payment',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,transfer',
            'category' => 'required|string',
            'description' => 'nullable|string',
            'entry_date' => 'nullable|date',
        ]);

        $user = $request->user();

        CashierCashEntry::create([
            'cashier_id' => $user->id,
            'cashier_name_snapshot' => $user->name,
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'category' => $validated['category'],
            'description' => $validated['description'],
            'entry_date' => $validated['entry_date'] ?? now(),
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Entri kas berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CashierCashEntry $cashFlow)
    {
        abort_if(
            $cashFlow->cashier_id !== $request->user()->id && $request->user()->role !== 'super_admin',
            403,
            'Anda tidak memiliki akses ke entri kas ini.'
        );

        $validated = $request->validate([
            'type' => 'required|in:cash_in,expense,farmer_payment',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,transfer',
            'category' => 'required|string',
            'description' => 'nullable|string',
            'entry_date' => 'nullable|date',
        ]);

        $cashFlow->update([
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'category' => $validated['category'],
            'description' => $validated['description'],
            'entry_date' => $validated['entry_date'] ?? $cashFlow->entry_date,
        ]);

        return back()->with('success', 'Entri kas berhasil diperbarui.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, CashierCashEntry $cashFlow)
    {
        abort_if(
            $cashFlow->cashier_id !== $request->user()->id && $request->user()->role !== 'super_admin',
            403,
            'Anda tidak memiliki akses ke entri kas ini.'
        );

        $cashFlow->load(['cashier', 'transaction', 'creator']);

        return response()->json($cashFlow);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, CashierCashEntry $cashFlow)
    {
        abort_if(
            $cashFlow->cashier_id !== $request->user()->id && $request->user()->role !== 'super_admin',
            403,
            'Anda tidak memiliki akses ke entri kas ini.'
        );

        // Only allow deletion if not linked to transaction
        if ($cashFlow->transaction_id) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus entri yang terkait dengan transaksi.']);
        }

        $cashFlow->delete();

        return back()->with('success', 'Entri kas berhasil dihapus.');
    }

    /**
     * Get cash balance for current user
     */
    public function getBalance(Request $request)
    {
        $user = $request->user();

        $cashIn = CashierCashEntry::where('cashier_id', $user->id)
            ->where('type', 'cash_in')
            ->sum('amount');

        $cashOut = CashierCashEntry::where('cashier_id', $user->id)
            ->whereIn('type', ['expense', 'farmer_payment'])
            ->sum('amount');

        return response()->json([
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'balance' => $cashIn - $cashOut,
        ]);
    }
}
