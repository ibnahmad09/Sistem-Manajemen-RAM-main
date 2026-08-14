<?php

namespace App\Http\Controllers;

use App\Models\PalmPrice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PalmPriceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $prices = PalmPrice::with('creator')
            ->orderBy('effective_date', 'desc')
            ->get();

        return Inertia::render('PalmPrices/Index', [
            'prices' => $prices,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'price_per_kg' => 'required|numeric|min:0',
            'effective_date' => 'required|date',
            'note' => 'nullable|string',
        ]);

        $user = $request->user();

        PalmPrice::create([
            'price_per_kg' => $validated['price_per_kg'],
            'effective_date' => $validated['effective_date'],
            'note' => $validated['note'],
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Harga sawit berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(PalmPrice $palmPrice)
    {
        $palmPrice->load('creator');

        return response()->json($palmPrice);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PalmPrice $palmPrice)
    {
        $validated = $request->validate([
            'price_per_kg' => 'required|numeric|min:0',
            'effective_date' => 'required|date',
            'note' => 'nullable|string',
        ]);

        $palmPrice->update($validated);

        return back()->with('success', 'Harga sawit berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PalmPrice $palmPrice)
    {
        $palmPrice->delete();

        return back()->with('success', 'Harga sawit berhasil dihapus.');
    }

    /**
     * Get latest price
     */
    public function getLatest()
    {
        $latestPrice = PalmPrice::getLatestPrice();

        return response()->json($latestPrice);
    }
}
