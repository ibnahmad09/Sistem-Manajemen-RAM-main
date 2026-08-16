<?php

use App\Http\Controllers\CashFlowController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FarmerController;
use App\Http\Controllers\FarmerDebtController;
use App\Http\Controllers\PalmPriceController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\WeighingTransactionController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard routes based on role
    Route::get('dashboard', function () {
        $user = auth()->user();

        return match ($user->role) {
            'super_admin' => redirect()->route('dashboard.super-admin'),
            'cashier' => redirect()->route('dashboard.cashier'),
            'owner' => redirect()->route('dashboard.owner'),
            default => abort(403),
        };
    })->name('dashboard');

    // Super Admin Dashboard
    Route::middleware(['role:super_admin'])->group(function () {
        Route::get('dashboard/super-admin', [DashboardController::class, 'superAdmin'])
            ->name('dashboard.super-admin');
    });

    // Cashier Dashboard
    Route::middleware(['role:cashier,super_admin'])->group(function () {
        Route::get('dashboard/cashier', [DashboardController::class, 'cashier'])
            ->name('dashboard.cashier');
    });

    // Owner Dashboard
    Route::middleware(['role:owner,super_admin'])->group(function () {
        Route::get('dashboard/owner', [DashboardController::class, 'owner'])
            ->name('dashboard.owner');
    });

    // Farmers - Accessible by super_admin and cashier
    Route::middleware(['role:super_admin,cashier'])->group(function () {
        Route::resource('farmers', FarmerController::class);
    });

    // Weighing Transactions - Accessible by super_admin and cashier
    Route::middleware(['role:super_admin,cashier'])->group(function () {
        // Must be before resource route to avoid conflict with weighing/{weighing}
        Route::get('weighing/success', [WeighingTransactionController::class, 'success'])
            ->name('weighing.success');

        Route::resource('weighing', WeighingTransactionController::class)
            ->except(['edit', 'destroy']);

        Route::post('weighing/{weighing}/finalize', [WeighingTransactionController::class, 'finalize'])
            ->name('weighing.finalize');

        Route::post('weighing/{weighing}/cancel', [WeighingTransactionController::class, 'cancel'])
            ->name('weighing.cancel');

        Route::get('farmers/{farmer}/debt', [WeighingTransactionController::class, 'getFarmerDebt'])
            ->name('farmers.debt');
    });

    // Farmer Debts - Accessible by super_admin and cashier
    Route::middleware(['role:super_admin,cashier'])->group(function () {
        Route::resource('debts', FarmerDebtController::class)
            ->except(['create', 'edit', 'update']);

        Route::get('farmers/{farmer}/debts', [FarmerDebtController::class, 'getFarmerDebts'])
            ->name('farmers.debts');
    });

    // Palm Prices - Accessible by super_admin and cashier
    Route::middleware(['role:super_admin,cashier'])->group(function () {
        Route::resource('palm-prices', PalmPriceController::class);

        Route::get('palm-prices/latest/get', [PalmPriceController::class, 'getLatest'])
            ->name('palm-prices.latest');
    });

    // Cash Flow - Accessible by super_admin and cashier
    Route::middleware(['role:super_admin,cashier'])->group(function () {
        Route::resource('cash-flow', CashFlowController::class)
            ->except(['create', 'edit', 'update']);

        Route::get('cash-flow/balance/get', [CashFlowController::class, 'getBalance'])
            ->name('cash-flow.balance');
    });

    // Reports - Accessible by all roles
    Route::get('reports', [ReportsController::class, 'index'])->name('reports.index');
});

require __DIR__.'/settings.php';
