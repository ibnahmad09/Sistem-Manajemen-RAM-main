import { describe, it, expect, vi } from 'vitest';
import { detectColumns, normalizeCodepageMapping } from '@/lib/printer-models';
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

describe('detectColumns', () => {
    it('should return 32 for Epson TM-P20II (58mm)', () => {
        expect(detectColumns('TM-P20II')).toBe(32);
    });

    it('should return 32 for Star SM-L200 (58mm)', () => {
        expect(detectColumns('SM-L200')).toBe(32);
    });

    it('should return 32 for Star mPOP (58mm)', () => {
        expect(detectColumns('mPOP')).toBe(32);
    });

    it('should return 32 for Xprinter XP-N160II (58mm)', () => {
        expect(detectColumns('XP-N160II')).toBe(32);
    });

    it('should return 32 for POS-5890 (58mm)', () => {
        expect(detectColumns('POS-5890')).toBe(32);
    });

    it('should return 42 for Epson TM-T88VII (80mm, 180 DPI)', () => {
        expect(detectColumns('TM-T88VII')).toBe(42);
    });

    it('should return 48 for Epson TM-T20III (80mm, 203 DPI)', () => {
        expect(detectColumns('TM-T20III')).toBe(48);
    });

    it('should return 48 for Star TSP100III (80mm)', () => {
        expect(detectColumns('TSP100III')).toBe(48);
    });

    it('should return 32 for Paytren S85 (58mm)', () => {
        expect(detectColumns('S85')).toBe(32);
    });

    it('should return 32 for Paytren-branded device (58mm)', () => {
        expect(detectColumns('PayTren S85')).toBe(32);
    });

    it('should return 32 for iWare C-58BT (58mm)', () => {
        expect(detectColumns('C-58BT')).toBe(32);
    });

    it('should return 32 for iWare MP-58BB (58mm)', () => {
        expect(detectColumns('MP-58BB')).toBe(32);
    });

    it('should return 32 for iWare X-58MPII (58mm)', () => {
        expect(detectColumns('X-58MPII')).toBe(32);
    });

    it('should return 32 for iWare MP-58MPC (58mm)', () => {
        expect(detectColumns('MP-58MPC')).toBe(32);
    });

    it('should return 48 for iWare C-80BT (80mm)', () => {
        expect(detectColumns('C-80BT')).toBe(48);
    });

    it('should return 48 for iWare IW-80MPO (80mm)', () => {
        expect(detectColumns('IW-80MPO')).toBe(48);
    });

    it('should return 48 for Xprinter XP-80C (80mm)', () => {
        expect(detectColumns('XP-80C')).toBe(48);
    });

    it('should return 48 for POS-8360 (80mm)', () => {
        expect(detectColumns('POS-8360')).toBe(48);
    });

    it('should return 48 for generic BlueTooth Printer (fallback)', () => {
        expect(detectColumns('BlueTooth Printer')).toBe(48);
    });

    it('should return 48 for generic Printer001 (fallback)', () => {
        expect(detectColumns('Printer001')).toBe(48);
    });

    it('should return 48 for unknown printer (fallback)', () => {
        expect(detectColumns('My Custom Printer')).toBe(48);
    });

    it('should be case insensitive', () => {
        expect(detectColumns('tm-p20ii')).toBe(32);
        expect(detectColumns('TM-P20II')).toBe(32);
        expect(detectColumns('Tm-P20Ii')).toBe(32);
    });

    it('should handle partial name matches', () => {
        expect(detectColumns('Epson TM-P20II Thermal Printer')).toBe(32);
        expect(detectColumns('Star TSP100III ECO')).toBe(48);
    });
});

describe('normalizeCodepageMapping', () => {
    it('should keep a valid esc-pos mapping unchanged', () => {
        expect(normalizeCodepageMapping('esc-pos', 'epson')).toBe('epson');
        expect(normalizeCodepageMapping('esc-pos', 'xprinter')).toBe(
            'xprinter',
        );
        expect(normalizeCodepageMapping('esc-pos', 'pos-5890')).toBe('pos-5890');
    });

    it("should map 'zjiang' to 'pos-5890' for esc-pos", () => {
        // Cheap Chinese printers (e.g. Paytren S85) often report 'zjiang'.
        expect(normalizeCodepageMapping('esc-pos', 'zjiang')).toBe('pos-5890');
    });

    it('should fall back to epson for unknown esc-pos mapping', () => {
        expect(normalizeCodepageMapping('esc-pos', 'whatever')).toBe('epson');
        expect(normalizeCodepageMapping('esc-pos', '')).toBe('epson');
    });

    it('should keep non-esc-pos mappings unchanged', () => {
        expect(normalizeCodepageMapping('star-prnt', 'star')).toBe('star');
    });
});
