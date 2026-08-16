<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WeighingLoad extends Model
{
    use HasFactory;

    protected $fillable = [
        'weighing_transaction_id',
        'seq_no',
        'gross_weight',
        'tare_weight',
        'initial_weight',
        'deduction_weight',
        'net_weight',
        'has_sorting',
        'sorting_weight',
        'sorting_price_per_kg',
        'sorting_total_amount',
    ];

    protected $casts = [
        'gross_weight' => 'decimal:2',
        'tare_weight' => 'decimal:2',
        'initial_weight' => 'decimal:2',
        'deduction_weight' => 'decimal:2',
        'net_weight' => 'decimal:2',
        'has_sorting' => 'boolean',
        'sorting_weight' => 'decimal:2',
        'sorting_price_per_kg' => 'decimal:2',
        'sorting_total_amount' => 'decimal:2',
    ];

    /**
     * Get the weighing transaction that owns this load
     */
    public function weighingTransaction()
    {
        return $this->belongsTo(WeighingTransaction::class);
    }
}
