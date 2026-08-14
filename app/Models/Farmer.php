<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Farmer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'address',
        'balance',
        'status',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
    ];

    /**
     * Get all weighing transactions for this farmer
     */
    public function weighingTransactions()
    {
        return $this->hasMany(WeighingTransaction::class);
    }

    /**
     * Get all debts for this farmer
     */
    public function debts()
    {
        return $this->hasMany(FarmerDebt::class);
    }

    /**
     * Calculate current debt balance from debt records
     */
    public function calculateDebtBalance(): float
    {
        return $this->debts()
            ->get()
            ->reduce(function ($balance, $debt) {
                if ($debt->type === 'loan') {
                    return $balance + $debt->amount;
                } elseif ($debt->type === 'payment') {
                    return $balance - $debt->amount;
                } else { // adjustment
                    return $balance + $debt->amount;
                }
            }, 0);
    }

    /**
     * Sync balance with debt records
     */
    public function syncBalance(): void
    {
        $this->balance = $this->calculateDebtBalance();
        $this->save();
    }
}
