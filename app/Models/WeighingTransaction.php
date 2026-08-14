<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WeighingTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'nota_number',
        'farmer_id',
        'farmer_name_snapshot',
        'cashier_id',
        'cashier_name_snapshot',
        'transaction_date',
        'gross_weight',
        'tare_weight',
        'initial_weight',
        'has_deduction',
        'deduction_percentage',
        'deduction_weight',
        'net_weight',
        'palm_price_per_kg',
        'palm_total_amount',
        'has_sorting',
        'sorting_weight',
        'sorting_price_per_kg',
        'sorting_total_amount',
        'gross_total_amount',
        'previous_debt_amount',
        'debt_paid_amount',
        'remaining_debt_amount',
        'final_paid_amount',
        'final_paid_amount_rounded',
        'payment_method',
        'cashier_balance_deducted',
        'status',
        'printed_at',
        'revision_of',
        'revision_number',
        'revision_reason',
        'is_latest_version',
        'created_by',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'gross_weight' => 'decimal:2',
        'tare_weight' => 'decimal:2',
        'initial_weight' => 'decimal:2',
        'has_deduction' => 'boolean',
        'deduction_percentage' => 'decimal:2',
        'deduction_weight' => 'decimal:2',
        'net_weight' => 'decimal:2',
        'palm_price_per_kg' => 'decimal:2',
        'palm_total_amount' => 'decimal:2',
        'has_sorting' => 'boolean',
        'sorting_weight' => 'decimal:2',
        'sorting_price_per_kg' => 'decimal:2',
        'sorting_total_amount' => 'decimal:2',
        'gross_total_amount' => 'decimal:2',
        'previous_debt_amount' => 'decimal:2',
        'debt_paid_amount' => 'decimal:2',
        'remaining_debt_amount' => 'decimal:2',
        'final_paid_amount' => 'decimal:2',
        'final_paid_amount_rounded' => 'decimal:2',
        'cashier_balance_deducted' => 'boolean',
        'printed_at' => 'datetime',
        'is_latest_version' => 'boolean',
    ];

    /**
     * Get the farmer for this transaction
     */
    public function farmer()
    {
        return $this->belongsTo(Farmer::class);
    }

    /**
     * Get the cashier (user) for this transaction
     */
    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * Get the user who created this transaction
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the original transaction if this is a revision
     */
    public function originalTransaction()
    {
        return $this->belongsTo(WeighingTransaction::class, 'revision_of');
    }

    /**
     * Get all revisions of this transaction
     */
    public function revisions()
    {
        return $this->hasMany(WeighingTransaction::class, 'revision_of');
    }

    /**
     * Get debt records associated with this transaction
     */
    public function debts()
    {
        return $this->hasMany(FarmerDebt::class, 'transaction_id');
    }

    /**
     * Get cash entries associated with this transaction
     */
    public function cashEntries()
    {
        return $this->hasMany(CashierCashEntry::class, 'transaction_id');
    }

    /**
     * Calculate transaction based on business logic
     *
     * @param  array  $data  Input data
     * @param  string  $roundingMode  Rounding mode (none, nearest_100, nearest_500, nearest_1000)
     * @return array Calculated values
     */
    public static function calculate(array $data, string $roundingMode = 'none'): array
    {
        // 1. Netto = Bruto - Tara
        $initialWeight = $data['gross_weight'] - $data['tare_weight'];

        // 2. Potongan (Kg) = Netto * (Persen_Potongan / 100)
        $deductionWeight = 0;
        if ($data['has_deduction'] ?? true) {
            $deductionWeight = $initialWeight * (($data['deduction_percentage'] ?? 3) / 100);
        }

        // 3. Berat_Bersih = Netto - Potongan
        $netWeight = $initialWeight - $deductionWeight;

        // 4. Total_Bayar_Sawit = Berat_Bersih * Harga_Per_Kg
        $palmTotalAmount = $netWeight * $data['palm_price_per_kg'];

        // 5. Sortiran (optional)
        $sortingTotalAmount = 0;
        if ($data['has_sorting'] ?? false) {
            $sortingTotalAmount = ($data['sorting_weight'] ?? 0) * ($data['sorting_price_per_kg'] ?? 0);
        }

        // 6. Total Kotor
        $grossTotalAmount = $palmTotalAmount + $sortingTotalAmount;

        // 7. Debt handling
        $debtPaidAmount = $data['debt_paid_amount'] ?? 0;
        $previousDebtAmount = $data['previous_debt_amount'] ?? 0;
        $remainingDebtAmount = max(0, $previousDebtAmount - $debtPaidAmount);

        // 8. Final payment
        $finalPaidAmount = $grossTotalAmount - $debtPaidAmount;

        // 9. Rounding
        $finalPaidAmountRounded = self::applyRounding($finalPaidAmount, $roundingMode);

        return [
            'initial_weight' => round($initialWeight, 2),
            'deduction_weight' => round($deductionWeight, 2),
            'net_weight' => round($netWeight, 2),
            'palm_total_amount' => round($palmTotalAmount, 2),
            'sorting_total_amount' => round($sortingTotalAmount, 2),
            'gross_total_amount' => round($grossTotalAmount, 2),
            'remaining_debt_amount' => round($remainingDebtAmount, 2),
            'final_paid_amount' => round($finalPaidAmount, 2),
            'final_paid_amount_rounded' => round($finalPaidAmountRounded, 2),
        ];
    }

    /**
     * Apply rounding based on mode
     */
    private static function applyRounding(float $amount, string $mode): float
    {
        switch ($mode) {
            case 'nearest_100':
                return round($amount / 100) * 100;
            case 'nearest_500':
                return round($amount / 500) * 500;
            case 'nearest_1000':
                return round($amount / 1000) * 1000;
            default:
                return $amount;
        }
    }

    /**
     * Generate nota number
     * Format: HND-YYYYMMDD-XXXX
     */
    public static function generateNotaNumber(\DateTime $date, int $sequence): string
    {
        return sprintf(
            'HND-%s-%04d',
            $date->format('Ymd'),
            $sequence
        );
    }
}
