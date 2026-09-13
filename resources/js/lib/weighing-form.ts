import type { LoadInput } from '@/lib/utils';
import type { DeductionConfig, PalmPrice, WeighingTransaction } from '@/types';

export function emptyLoad(): LoadInput {
    return {
        gross_weight: 0,
        tare_weight: 0,
        has_sorting: false,
        sorting_weight: 0,
    };
}

export function buildInitialWeighingFormState({
    draft,
    latestPrice,
    deductionConfig,
}: {
    draft: WeighingTransaction | null | undefined;
    latestPrice: PalmPrice | null;
    deductionConfig: DeductionConfig | null;
}) {
    return {
        farmer_id: draft ? String(draft.farmer_id) : '',
        transaction_date: draft
            ? draft.transaction_date.slice(0, 10)
            : new Date().toISOString().split('T')[0],
        loads: draft?.loads?.length
            ? draft.loads.map((l) => ({
                  gross_weight: Number(l.gross_weight),
                  tare_weight: Number(l.tare_weight),
                  has_sorting: l.has_sorting,
                  sorting_weight: Number(l.sorting_weight),
              }))
            : [emptyLoad()],
        has_deduction: draft ? draft.has_deduction : true,
        deduction_percentage: draft
            ? Number(draft.deduction_percentage)
            : (deductionConfig?.percentage ?? 5),
        palm_price_per_kg: draft
            ? Number(draft.palm_price_per_kg)
            : (latestPrice?.price_per_kg ?? 0),
        sorting_price_per_kg: draft ? Number(draft.sorting_price_per_kg) : 0,
        sorting_deduction_percentage: draft
            ? Number(draft.sorting_deduction_percentage)
            : 5,
        debt_paid_amount: draft ? Number(draft.debt_paid_amount) : 0,
        payment_method: (draft ? draft.payment_method : 'cash') as
            | 'cash'
            | 'transfer',
    };
}
