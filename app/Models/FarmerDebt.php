<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FarmerDebt extends Model
{
    use HasFactory;

    protected $fillable = [
        'farmer_id',
        'farmer_name_snapshot',
        'type',
        'amount',
        'debt_date',
        'description',
        'transaction_id',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'debt_date' => 'datetime',
    ];

    /**
     * Get the farmer that owns this debt
     */
    public function farmer()
    {
        return $this->belongsTo(Farmer::class);
    }

    /**
     * Get the transaction associated with this debt (if any)
     */
    public function transaction()
    {
        return $this->belongsTo(WeighingTransaction::class, 'transaction_id');
    }

    /**
     * Get the user who created this debt record
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
