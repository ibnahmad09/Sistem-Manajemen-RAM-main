import { describe, expect, it } from 'vitest';
import { buildInitialWeighingFormState, emptyLoad } from '@/lib/weighing-form';
import type { WeighingTransaction } from '@/types';

const draftWithDebt: WeighingTransaction = {
    id: 1,
    nota_number: 'HND-20260913-0001',
    farmer_id: 42,
    farmer_name_snapshot: 'Pak Tani',
    cashier_id: 1,
    cashier_name_snapshot: 'Kasir',
    transaction_date: '2026-09-13T00:00:00.000000Z',
    gross_weight: 1000,
    tare_weight: 200,
    initial_weight: 800,
    has_deduction: true,
    deduction_percentage: 3,
    deduction_weight: 24,
    net_weight: 776,
    palm_price_per_kg: 2580,
    palm_total_amount: 2002080,
    has_sorting: true,
    sorting_weight: 100,
    sorting_price_per_kg: 500,
    sorting_deduction_percentage: 5,
    sorting_deduction_weight: 5,
    sorting_net_weight: 95,
    sorting_total_amount: 47500,
    gross_total_amount: 2049580,
    previous_debt_amount: 500000,
    debt_paid_amount: 100000,
    remaining_debt_amount: 400000,
    final_paid_amount: 1949580,
    final_paid_amount_rounded: 1949580,
    payment_method: 'transfer',
    cashier_balance_deducted: false,
    status: 'draft',
    printed_at: null,
    revision_of: null,
    revision_number: 0,
    revision_reason: null,
    is_latest_version: true,
    created_by: 1,
    loads: [
        {
            id: 1,
            weighing_transaction_id: 1,
            seq_no: 1,
            gross_weight: 1000,
            tare_weight: 200,
            initial_weight: 800,
            deduction_weight: 24,
            net_weight: 776,
            has_sorting: true,
            sorting_weight: 100,
            sorting_price_per_kg: 500,
            sorting_deduction_weight: 5,
            sorting_net_weight: 95,
            sorting_total_amount: 47500,
            created_at: '2026-09-13T00:00:00.000000Z',
            updated_at: '2026-09-13T00:00:00.000000Z',
        },
    ],
    created_at: '2026-09-13T00:00:00.000000Z',
    updated_at: '2026-09-13T00:00:00.000000Z',
};

const draftWithZeroDebt: WeighingTransaction = {
    ...draftWithDebt,
    id: 2,
    debt_paid_amount: 0,
};

const baseOptions = {
    latestPrice: null,
    deductionConfig: null,
};

describe('buildInitialWeighingFormState', () => {
    it('keeps debt_paid_amount from draft when it is nonzero', () => {
        const state = buildInitialWeighingFormState({
            draft: draftWithDebt,
            ...baseOptions,
        });

        expect(state.debt_paid_amount).toBe(100000);
    });

    it('defaults debt_paid_amount to 0 when there is no draft', () => {
        const state = buildInitialWeighingFormState({
            draft: null,
            ...baseOptions,
        });

        expect(state.debt_paid_amount).toBe(0);
    });

    it('keeps debt_paid_amount as 0 when draft has zero debt paid', () => {
        const state = buildInitialWeighingFormState({
            draft: draftWithZeroDebt,
            ...baseOptions,
        });

        expect(state.debt_paid_amount).toBe(0);
    });

    it('maps farmer_id to string from draft, or empty string without draft', () => {
        const withDraft = buildInitialWeighingFormState({
            draft: draftWithDebt,
            ...baseOptions,
        });
        const withoutDraft = buildInitialWeighingFormState({
            draft: null,
            ...baseOptions,
        });

        expect(withDraft.farmer_id).toBe('42');
        expect(withoutDraft.farmer_id).toBe('');
    });

    it('maps loads from draft, or a single empty load without draft', () => {
        const withDraft = buildInitialWeighingFormState({
            draft: draftWithDebt,
            ...baseOptions,
        });
        const withoutDraft = buildInitialWeighingFormState({
            draft: null,
            ...baseOptions,
        });

        expect(withDraft.loads).toEqual([
            {
                gross_weight: 1000,
                tare_weight: 200,
                has_sorting: true,
                sorting_weight: 100,
            },
        ]);
        expect(withoutDraft.loads).toEqual([emptyLoad()]);
    });

    it('uses payment_method from draft, or cash without draft', () => {
        const withDraft = buildInitialWeighingFormState({
            draft: draftWithDebt,
            ...baseOptions,
        });
        const withoutDraft = buildInitialWeighingFormState({
            draft: null,
            ...baseOptions,
        });

        expect(withDraft.payment_method).toBe('transfer');
        expect(withoutDraft.payment_method).toBe('cash');
    });
});