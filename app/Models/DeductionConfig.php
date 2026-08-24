<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeductionConfig extends Model
{
    protected $fillable = [
        'percentage',
        'note',
    ];

    protected $casts = [
        'percentage' => 'decimal:2',
    ];

    /**
     * Get the active deduction config
     */
    public static function getActiveConfig(): ?self
    {
        return self::latest()->first();
    }
}
