import type { LoadInput, SortingOrder } from '@/lib/utils';
import type { DeductionConfig, PalmPrice, WeighingTransaction } from '@/types';

export const SORTING_ORDER_STORAGE_KEY = 'weighing.sortingOrder';

function isSortingOrder(value: unknown): value is SortingOrder {
    return value === 'sortiran_dulu' || value === 'potongan_dulu';
}

/**
 * Resolve the initial sorting order for the form.
 *
 * A stored draft or revision always wins — its mode is part of the transaction.
 * For a new transaction we fall back to whatever the cashier last chose, so the
 * common case does not need re-picking on every weighing.
 */
export function resolveInitialSortingOrder(
    draft?: WeighingTransaction | null,
): SortingOrder {
    if (isSortingOrder(draft?.sorting_order)) {
        return draft.sorting_order;
    }

    if (typeof window === 'undefined') {
        return 'sortiran_dulu';
    }

    const remembered = window.localStorage.getItem(SORTING_ORDER_STORAGE_KEY);

    return isSortingOrder(remembered) ? remembered : 'sortiran_dulu';
}

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
        sorting_order: resolveInitialSortingOrder(draft),
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
        revision_reason: '',
    };
}
