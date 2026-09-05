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
     * Get the weighing loads (muatan) for this transaction
     */
    public function loads()
    {
        return $this->hasMany(WeighingLoad::class)->orderBy('seq_no');
    }

    /**
     * Scope: only active draft transactions (belum difinalisasi)
     */
    public function scopeActiveDraft($query)
    {
        return $query->where('status', 'draft')->where('is_latest_version', true);
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
        $result = self::calculateLoads([
            [
                'gross_weight' => $data['gross_weight'],
                'tare_weight' => $data['tare_weight'],
                'has_sorting' => $data['has_sorting'] ?? false,
                'sorting_weight' => $data['sorting_weight'] ?? 0,
                'sorting_price_per_kg' => $data['sorting_price_per_kg'] ?? 0,
            ],
        ], $data, $roundingMode);

        return [
            'initial_weight' => $result['initial_weight'],
            'deduction_weight' => $result['deduction_weight'],
            'net_weight' => $result['net_weight'],
            'palm_total_amount' => $result['palm_total_amount'],
            'sorting_total_amount' => $result['sorting_total_amount'],
            'gross_total_amount' => $result['gross_total_amount'],
            'remaining_debt_amount' => $result['remaining_debt_amount'],
            'final_paid_amount' => $result['final_paid_amount'],
            'final_paid_amount_rounded' => $result['final_paid_amount_rounded'],
        ];
    }

    /**
     * Calculate a multi-load transaction (one nota = many loads).
     *
     * Each load is calculated individually (netto kotor, potongan, netto bersih,
     * sortiran), then aggregated. Debt and final payment are computed from the total.
     *
     * @param  array  $loads  List of loads, each with gross_weight, tare_weight,
     *                        has_sorting, sorting_weight, sorting_price_per_kg
     * @param  array  $data  Global input data (has_deduction, deduction_percentage,
     *                       palm_price_per_kg, previous_debt_amount, debt_paid_amount)
     * @param  string  $roundingMode  Rounding mode (none, nearest_100, nearest_500, nearest_1000)
     * @return array Calculated values including per-load breakdown
     */
    public static function calculateLoads(array $loads, array $data, string $roundingMode = 'none'): array
    {
        $hasDeduction = $data['has_deduction'] ?? true;
        $deductionPercentage = $data['deduction_percentage'] ?? 5;
        $palmPricePerKg = $data['palm_price_per_kg'];

        $loadResults = [];
        $totalGross = 0;
        $totalTare = 0;
        $totalInitial = 0;
        $totalDeduction = 0;
        $totalNet = 0;
        $totalSortingWeight = 0;
        $totalSortingAmount = 0;
        $palmTotalAmount = 0;
        $hasSortingAny = false;

        foreach ($loads as $i => $load) {
            $gross = (float) ($load['gross_weight'] ?? 0);
            $tare = (float) ($load['tare_weight'] ?? 0);
            $initial = $gross - $tare;
            $deductionWeight = $hasDeduction ? $initial * ($deductionPercentage / 100) : 0;
            $net = $initial - $deductionWeight;
            $loadHasSorting = (bool) ($load['has_sorting'] ?? false);
            $sortingWeight = (float) ($load['sorting_weight'] ?? 0);
            $sortingPricePerKg = (float) ($load['sorting_price_per_kg'] ?? 0);
            $sortingTotal = $loadHasSorting ? $sortingWeight * $sortingPricePerKg : 0;

            $totalGross += $gross;
            $totalTare += $tare;
            $totalInitial += $initial;
            $totalDeduction += $deductionWeight;
            $totalNet += $net;
            $totalSortingWeight += $sortingWeight;
            $totalSortingAmount += $sortingTotal;
            $palmTotalAmount += $net * $palmPricePerKg;
            $hasSortingAny = $hasSortingAny || $loadHasSorting;

            $loadResults[] = [
                'seq_no' => $i + 1,
                'gross_weight' => round($gross, 2),
                'tare_weight' => round($tare, 2),
                'initial_weight' => round($initial, 2),
                'deduction_weight' => round($deductionWeight, 2),
                'net_weight' => round($net, 2),
                'has_sorting' => $loadHasSorting,
                'sorting_weight' => round($sortingWeight, 2),
                'sorting_price_per_kg' => round($sortingPricePerKg, 2),
                'sorting_total_amount' => round($sortingTotal, 2),
            ];
        }

        $grossTotalAmount = $palmTotalAmount + $totalSortingAmount;

        $debtPaidAmount = $data['debt_paid_amount'] ?? 0;
        $previousDebtAmount = $data['previous_debt_amount'] ?? 0;
        $remainingDebtAmount = max(0, $previousDebtAmount - $debtPaidAmount);

        $finalPaidAmount = $grossTotalAmount - $debtPaidAmount;

        $finalPaidAmountRounded = self::applyRounding($finalPaidAmount, $roundingMode);

        return [
            'loads' => $loadResults,
            'gross_weight' => round($totalGross, 2),
            'tare_weight' => round($totalTare, 2),
            'initial_weight' => round($totalInitial, 2),
            'deduction_weight' => round($totalDeduction, 2),
            'net_weight' => round($totalNet, 2),
            'has_sorting' => $hasSortingAny,
            'sorting_weight' => round($totalSortingWeight, 2),
            'sorting_total_amount' => round($totalSortingAmount, 2),
            'palm_total_amount' => round($palmTotalAmount, 2),
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
