<?php

namespace App\Http\Controllers;

use App\Models\DeductionConfig;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeductionConfigController extends Controller
{
    /**
     * Display the deduction config page.
     */
    public function index()
    {
        $config = DeductionConfig::latest()->first();

        return Inertia::render('Settings/DeductionConfig', [
            'config' => $config,
        ]);
    }

    /**
     * Store or update the deduction config.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'percentage' => 'required|numeric|min:0|max:100',
            'note' => 'nullable|string',
        ]);

        $config = DeductionConfig::latest()->first();

        if ($config) {
            $config->update($validated);
        } else {
            DeductionConfig::create($validated);
        }

        return back()->with('success', 'Pengaturan potongan berhasil disimpan.');
    }

    /**
     * Get active deduction config
     */
    public function getActive()
    {
        $config = DeductionConfig::getActiveConfig();

        return response()->json($config);
    }
}
