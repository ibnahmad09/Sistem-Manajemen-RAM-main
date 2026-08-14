<?php

namespace App\Http\Controllers;

use App\Models\Farmer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FarmerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $farmers = Farmer::orderBy('name', 'asc')->get();

        return Inertia::render('Farmers/Index', [
            'farmers' => $farmers,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Farmers/Form');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $farmer = Farmer::create($validated);

        return redirect()->route('farmers.index')
            ->with('success', 'Petani berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Farmer $farmer)
    {
        $farmer->load(['weighingTransactions', 'debts']);

        return Inertia::render('Farmers/Show', [
            'farmer' => $farmer,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Farmer $farmer)
    {
        return Inertia::render('Farmers/Form', [
            'farmer' => $farmer,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Farmer $farmer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $farmer->update($validated);

        return redirect()->route('farmers.index')
            ->with('success', 'Data petani berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Farmer $farmer)
    {
        $farmer->delete();

        return redirect()->route('farmers.index')
            ->with('success', 'Petani berhasil dihapus.');
    }
}
