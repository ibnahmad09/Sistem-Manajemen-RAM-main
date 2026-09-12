import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectColumns, normalizeCodepageMapping } from '@/lib/printer-models';
import { buildReceipt } from '@/lib/receipt-builder';
import type { WeighingTransaction } from '@/types';

// --- Mocks for PrinterService tests (hoisted by Vitest) ---

const mockPrinterInstances: any[] = [];

vi.mock('@point-of-sale/webbluetooth-receipt-printer', () => ({
    default: vi.fn().mockImplementation(function () {
        const instance: any = {
            listeners: {} as Record<string, Array<(data?: any) => void>>,
            addEventListener: vi.fn(
                (event: string, handler: (data?: any) => void) => {
                    instance.listeners[event] ??= [];
                    instance.listeners[event].push(handler);
                },
            ),
            emit: (event: string, data?: any) => {
                (instance.listeners[event] ?? []).forEach(
                    (handler: (data?: any) => void) => handler(data),
                );
            },
            reconnect: vi.fn(),
            connect: vi.fn(),
            print: vi.fn(),
            disconnect: vi.fn(),
        };
        mockPrinterInstances.push(instance);

        return instance;
    }),
}));

vi.mock('@point-of-sale/receipt-printer-encoder', () => ({
    default: vi.fn().mockImplementation(function () {
        return {
            initialize: vi.fn().mockReturnThis(),
            align: vi.fn().mockReturnThis(),
            bold: vi.fn().mockReturnThis(),
            size: vi.fn().mockReturnThis(),
            text: vi.fn().mockReturnThis(),
            newline: vi.fn().mockReturnThis(),
            rule: vi.fn().mockReturnThis(),
            cut: vi.fn().mockReturnThis(),
            image: vi.fn().mockReturnThis(),
            encode: vi.fn(() => new Uint8Array([0x1d, 0x56, 0x41, 0x00])),
        };
    }),
}));

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

function createSampleTransaction(
    overrides: Partial<WeighingTransaction> = {},
): WeighingTransaction {
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
        sorting_deduction_percentage: 5,
        sorting_deduction_weight: 5,
        sorting_net_weight: 95,
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

// --- Helpers for PrinterService tests ---

const originalNavigator = globalThis.navigator;

function createLocalStorageStub(seed: Record<string, string> = {}) {
    const store = new Map(Object.entries(seed));

    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        clear: vi.fn(() => {
            store.clear();
        }),
        key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
        get length() {
            return store.size;
        },
    };
}

function setupNavigator(getDevices?: (() => Promise<unknown[]>) | null) {
    const bluetooth: Record<string, unknown> = {};

    if (getDevices !== null) {
        bluetooth.getDevices = getDevices ?? vi.fn(async () => []);
    }

    Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, bluetooth },
        configurable: true,
        writable: true,
    });
}

async function importService() {
    vi.resetModules();
    const mod = await import('@/services/printer-service');

    return mod.printerService;
}

async function flushAsync() {
    await new Promise((resolve) => setTimeout(resolve, 0));
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
        const found = texts.find(
            (t) =>
                String(t).startsWith('PETANI:') &&
                String(t).includes(tx.farmer_name_snapshot),
        );
        expect(found).toBeTruthy();
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

    it('should keep every text line within 32 columns on 58mm', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx, 32);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => String(c.args[0]));
        const overlong = texts.filter((t) => t.length > 0 && t.length > 32);
        expect(overlong).toEqual([]);
    });

    it('should use single-size header on 32 columns', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx, 32);
        const firstSize = encoder.calls.find((c) => c.method === 'size');
        expect(firstSize?.args[0]).toBe(1);
    });

    it('should use double-size header on 48 columns', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx, 48);
        const firstSize = encoder.calls.find((c) => c.method === 'size');
        expect(firstSize?.args[0]).toBe(2);
    });

    it('should truncate a long farmer name within 32 columns', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction({
            farmer_name_snapshot: 'PETERNAKAN MAJU JAYA ABADI SENTOSA BERKAH',
        });
        buildReceipt(encoder, tx, 32);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => String(c.args[0]));
        const overlong = texts.filter((t) => t.length > 0 && t.length > 32);
        expect(overlong).toEqual([]);
        const petani = texts.find((t) => t.startsWith('PETANI:'));
        expect(petani).toBeTruthy();
    });

    it('should include the updated NB wording', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => String(c.args[0]));
        expect(texts.some((t) => t.includes('Harap hitung kembali uang'))).toBe(
            true,
        );
        expect(texts.some((t) => t.includes('dari RAMP.'))).toBe(true);
    });

    it('should right-anchor the farmer name value on 32 columns', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction();
        buildReceipt(encoder, tx, 32);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => String(c.args[0]));
        const petani = texts.find((t) => t.startsWith('PETANI:'));
        expect(petani).toBeTruthy();
        expect(petani!.endsWith(tx.farmer_name_snapshot)).toBe(true);
    });

    it('should include net sorting weight on SORTIRAN line', () => {
        const encoder = createMockEncoder();
        const tx = createSampleTransaction({
            has_sorting: true,
            sorting_weight: 100,
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
                    created_at: '2026-05-10T08:35:00.000Z',
                    updated_at: '2026-05-10T08:35:00.000Z',
                },
            ],
        });
        buildReceipt(encoder, tx);
        const texts = encoder.calls
            .filter((c) => c.method === 'text')
            .map((c) => String(c.args[0]));
        const sortiran = texts.find((t) => t.startsWith('#1 SORTIRAN:'));
        expect(sortiran).toBeTruthy();
        expect(sortiran).toContain('-95 kg');
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

    it('should return 32 for Rongta RPP02N (58mm, 384 dots)', () => {
        expect(detectColumns('RPP02N')).toBe(32);
    });

    it('should return 32 for RPP-02N variant (58mm)', () => {
        expect(detectColumns('RPP-02N')).toBe(32);
    });

    it('should return 32 for RPPO2N variant (58mm)', () => {
        expect(detectColumns('RPPO2N')).toBe(32);
    });

    it('should return 32 for iWare-branded RPP02N', () => {
        expect(detectColumns('iWare RPP02N')).toBe(32);
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
        expect(normalizeCodepageMapping('esc-pos', 'pos-5890')).toBe(
            'pos-5890',
        );
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

describe('PrinterService printReceipt auto-reconnect', () => {
    beforeEach(() => {
        mockPrinterInstances.length = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete (globalThis as any).localStorage;
        Object.defineProperty(globalThis, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true,
        });
    });

    it('should print directly when already connected without calling autoReconnect', async () => {
        const paired = [
            {
                id: 'printer-1',
                name: 'TM-P20II',
                language: 'esc-pos',
                codepageMapping: 'epson',
                columns: 32,
            },
        ];
        (globalThis as any).localStorage = createLocalStorageStub({
            paired_printers: JSON.stringify(paired),
            active_printer_id: 'printer-1',
        });
        setupNavigator();

        const service = await importService();
        const autoReconnectSpy = vi.spyOn(service, 'autoReconnect');

        // Establish a connection via reconnect() (mock emits 'connected').
        const reconnectPromise = service.reconnect('printer-1');
        await flushAsync();
        const instance = mockPrinterInstances.at(-1)!;
        instance.emit('connected', {
            type: 'bluetooth',
            name: 'TM-P20II',
            id: 'printer-1',
            language: 'esc-pos',
            codepageMapping: 'epson',
        });
        await reconnectPromise;

        expect(service.currentStatus).toBe('connected');

        await service.printReceipt(createSampleTransaction());

        expect(instance.print).toHaveBeenCalledOnce();
        expect(autoReconnectSpy).not.toHaveBeenCalled();
    });

    it('should auto-reconnect then throw the UI error when reconnect stays silent for 15s', async () => {
        const paired = [
            {
                id: 'printer-1',
                name: 'TM-P20II',
                language: 'esc-pos',
                codepageMapping: 'epson',
                columns: 32,
            },
        ];
        (globalThis as any).localStorage = createLocalStorageStub({
            paired_printers: JSON.stringify(paired),
            active_printer_id: 'printer-1',
        });
        setupNavigator();

        const service = await importService();
        const tx = createSampleTransaction();

        vi.useFakeTimers();
        const printPromise = service.printReceipt(tx);
        // Attach the rejection handler immediately so the eventual rejection
        // is never unhandled, then flush microtasks so the dynamic import
        // resolves and reconnect() schedules its 15s timeout, then fire it.
        const assertion = expect(printPromise).rejects.toThrow(
            'Printer tidak terhubung. Hubungkan printer terlebih dahulu.',
        );
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(15000);
        await assertion;

        const instance = mockPrinterInstances.at(-1)!;
        expect(instance.print).not.toHaveBeenCalled();
    });

    it('should throw immediately when getDevices is unavailable (no 15s wait)', async () => {
        const paired = [
            {
                id: 'printer-1',
                name: 'TM-P20II',
                language: 'esc-pos',
                codepageMapping: 'epson',
                columns: 32,
            },
        ];
        (globalThis as any).localStorage = createLocalStorageStub({
            paired_printers: JSON.stringify(paired),
            active_printer_id: 'printer-1',
        });
        setupNavigator(null);

        const service = await importService();
        const tx = createSampleTransaction();

        vi.useFakeTimers();
        const printPromise = service.printReceipt(tx);
        const assertion = expect(printPromise).rejects.toThrow(
            'Printer tidak terhubung. Hubungkan printer terlebih dahulu.',
        );
        await assertion;
        expect(vi.getTimerCount()).toBe(0);
    });
});
