<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashierCashEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'cashier_id',
        'cashier_name_snapshot',
        'type',
        'amount',
        'payment_method',
        'category',
        'description',
        'transaction_id',
        'entry_date',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'entry_date' => 'datetime',
    ];

    /**
     * Get the cashier (user) for this entry
     */
    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * Get the transaction associated with this entry (if any)
     */
    public function transaction()
    {
        return $this->belongsTo(WeighingTransaction::class, 'transaction_id');
    }

    /**
     * Get the user who created this entry
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
