<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PalmPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'price_per_kg',
        'effective_date',
        'note',
        'created_by',
    ];

    protected $casts = [
        'price_per_kg' => 'decimal:2',
        'effective_date' => 'datetime',
    ];

    /**
     * Get the user who created this price
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the latest active price
     */
    public static function getLatestPrice()
    {
        return self::orderBy('effective_date', 'desc')->first();
    }
}
