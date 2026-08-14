<?php

namespace App\Http\Controllers;

use App\Models\CashierCashEntry;
use App\Models\Farmer;
use App\Models\FarmerDebt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FarmerDebtController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $farmers = Farmer::where('status', 'active')
            ->orderBy('name', 'asc')
            ->get()
            ->map(function ($farmer) {
                return [
                    'id' => $farmer->id,
                    'name' => $farmer->name,
                    'phone' => $farmer->phone,
                    'address' => $farmer->address,
                    'balance' => $farmer->calculateDebtBalance(),
                ];
            });

        // Get all debts for history
        $debts = FarmerDebt::with(['farmer', 'creator'])
            ->orderBy('debt_date', 'desc')
            ->get();

        return Inertia::render('Debts/Index', [
            'farmers' => $farmers,
            'debts' => $debts,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'farmer_id' => 'required|exists:farmers,id',
            'type' => 'required|in:loan,payment,adjustment',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'debt_date' => 'nullable|date',
        ]);

        DB::beginTransaction();

        try {
            $farmer = Farmer::findOrFail($validated['farmer_id']);
            $user = $request->user();

            // Create debt record
            $debt = FarmerDebt::create([
                'farmer_id' => $farmer->id,
                'farmer_name_snapshot' => $farmer->name,
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'debt_date' => $validated['debt_date'] ?? now(),
                'description' => $validated['description'] ?? ($validated['type'] === 'loan' ? 'Pinjaman Baru' : 'Pelunasan Manual'),
                'created_by' => $user->id,
            ]);

            // Create corresponding cash entry
            $cashEntryType = $validated['type'] === 'loan' ? 'expense' : 'cash_in';
            $category = $validated['type'] === 'loan' ? 'lain_lain' : 'lain_lain';

            CashierCashEntry::create([
                'cashier_id' => $user->id,
                'cashier_name_snapshot' => $user->name,
                'type' => $cashEntryType,
                'amount' => $validated['amount'],
                'payment_method' => 'cash',
                'category' => $category,
                'description' => ($validated['type'] === 'loan' ? 'Pinjaman' : 'Pelunasan')." Petani: {$farmer->name}",
                'entry_date' => $validated['debt_date'] ?? now(),
                'created_by' => $user->id,
            ]);

            // Sync farmer balance
            $farmer->syncBalance();

            DB::commit();

            return back()->with('success', 'Data hutang berhasil disimpan.');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal menyimpan data: '.$e->getMessage()]);
        }
    }

    /**
     * Get debt history for specific farmer
     */
    public function getFarmerDebts(Farmer $farmer)
    {
        $debts = $farmer->debts()
            ->with(['creator', 'transaction'])
            ->orderBy('debt_date', 'desc')
            ->get();

        $balance = $farmer->calculateDebtBalance();

        return response()->json([
            'debts' => $debts,
            'balance' => $balance,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(FarmerDebt $farmerDebt)
    {
        $farmerDebt->load(['farmer', 'creator', 'transaction']);

        return response()->json($farmerDebt);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FarmerDebt $farmerDebt)
    {
        DB::beginTransaction();

        try {
            $farmer = $farmerDebt->farmer;

            $farmerDebt->delete();

            // Sync farmer balance after deletion
            $farmer->syncBalance();

            DB::commit();

            return back()->with('success', 'Data hutang berhasil dihapus.');

        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Gagal menghapus data: '.$e->getMessage()]);
        }
    }
}
