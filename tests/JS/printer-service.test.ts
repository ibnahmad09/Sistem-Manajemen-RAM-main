import { describe, it, expect, vi } from 'vitest';
import { buildReceipt } from '@/lib/receipt-builder';
import type { WeighingTransaction } from '@/types';

function createMockEncoder() {
    const calls: { method: string; args: unknown[] }[] = [];

    const record = (method: string) =>
        vi.fn((...args: unknown[]) => {
            calls.push({ method, args });

            return mock;
        });

    const mock = {
        calls,
        initialize: record('initialize'),
        align: record('align'),
        bold: record('bold'),
        size: record('size'),
        text: record('text'),
        newline: record('newline'),
        rule: record('rule'),
        cut: record('cut'),
        encode: vi.fn(() => new Uint8Array([0x1d, 0x56, 0x41, 0x00])),
    };

    return mock;
}

function createSampleTransaction(overrides: Partial<WeighingTransaction> = {}): WeighingTransaction {
    return {
        id: 1,
        nota_number: 'HND-20260510-0001',
        farmer_id: 1,
        farmer_name_snapshot: 'BUDI SANTOSO',
        cashier_id: 1,
        cashier_name_snapshot: 'KASIR 1',
        transaction_date: '2026-05-10T08:30:00.000Z',
        gross_weight: 1500,
        tare_weight: 200,
        initial_weight: 1300,
        has_deduction: true,
        deduction_percentage: 3,
        deduction_weight: 39,
        net_weight: 1261,
        palm_price_per_kg: 1750,
        palm_total_amount: 2206750,
        has_sorting: false,
        sorting_weight: 0,
        sorting_price_per_kg: 0,
        sorting_total_amount: 0,
        gross_total_amount: 2206750,
        previous_debt_amount: 0,
        debt_paid_amount: 0,
        remaining_debt_amount: 0,
        final_paid_amount: 2206750,
        final_paid_amount_rounded: 2206750,
        payment_method: 'cash',
        cashier_balance_deducted: true,
        status: 'printed',
        printed_at: '2026-05-10T08:35:00.000Z',
        revision_of: null,
        revision_number: 0,
        revision_reason: null,
        is_latest_version: true,
        created_by: 1,
        created_at: '2026-05-10T08:35:00.000Z',
        updated_at: '2026-05-10T08:35:00.000Z',
        ...overrides,
    };
}

describe('buildReceipt', () => {
    it('should return a Uint8Array', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        const result = buildReceipt(encoder, tx);
        expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should call initialize() first', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        expect(encoder.calls[0].method).toBe('initialize');
    });

    it('should call encode() and return Uint8Array', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        const result = buildReceipt(encoder, tx);
        expect(encoder.encode).toHaveBeenCalledOnce();
        expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should include header text', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        expect(texts).toContain('RAM SAWIT HND JAYA');
    });

    it('should include nota number', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        expect(texts).toContain(tx.nota_number);
    });

    it('should include farmer name', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        expect(texts).toContain(`PETANI: ${tx.farmer_name_snapshot}`);
    });

    it('should include gross weight', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        const found = texts.find((t) => String(t).startsWith('BRUTO:'));
        expect(found).toBeTruthy();
    });

    it('should include total diterima section', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        expect(texts).toContain('TOTAL DITERIMA');
    });

    it('should include payment method', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        expect(texts).toContain('METODE: TUNAI');
    });

    it('should show transfer for non-cash payments', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction({ payment_method: 'transfer' });
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => c.args[0]);
        expect(texts).toContain('METODE: TRANSFER BANK');
    });

    it('should include center alignment before header and total', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const aligns = encoder.calls
            .filter((c) => c.method === 'align')
            .map((c) => c.args[0]);
        expect(aligns).toEqual(['center', 'left', 'center', 'left']);
    });

    it('should draw lines for visual separation', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const rules = encoder.calls.filter((c) => c.method === 'rule');
        expect(rules.length).toBeGreaterThanOrEqual(3);
    });
});
