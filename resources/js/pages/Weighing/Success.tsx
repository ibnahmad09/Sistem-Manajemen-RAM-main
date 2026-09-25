import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Bluetooth,
    BluetoothConnected,
    CheckCircle,
    Printer,
    PrinterIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { cn, formatKg, formatRupiah } from '@/lib/utils';
import * as weighingRoute from '@/routes/weighing';
import type { BreadcrumbItem, WeighingTransaction } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Timbangan', href: '/weighing' },
    { title: 'Nota', href: '#' },
];

interface Props {
    transaction: WeighingTransaction;
}

const PAPER_CLASSES = {
    '80': {
        wrap: 'w-[80mm] p-4 text-[10px]',
        brand: 'text-sm',
        sub: 'text-[8px] font-semibold',
        heading: 'text-[9px]',
        row: 'text-[8px] font-semibold',
        totalBox: 'p-2',
        totalAmount: 'text-sm',
        totalLabel: 'text-[8px]',
        metode: 'text-[7px]font-semibold',
        sigName: 'text-[8px]font-semibold',
        sigGap: 'mt-8 font-semibold',
        note: 'text-[7px] font-semibold',
    },
    '57': {
        wrap: 'w-[57mm] p-2 text-[9px]',
        brand: 'text-[16px]',
        sub: 'text-[11px]font-semibold',
        heading: 'text-[12px]',
        row: 'text-[10px] font-semibold',
        totalBox: 'p-1.5',
        totalAmount: 'text-[14px]',
        totalLabel: 'text-[9px]',
        metode: 'text-[8px] font-semibold',
        sigName: 'text-[9px] font-semibold',
        sigGap: 'mt-6 font-semibold',
        note: 'text-[10px] font-semibold',
    },
} as const;

function Row({
    label,
    value,
    bold = true,
}: {
    label: string;
    value: string;
    bold?: boolean;
}) {
    return (
        <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function Divider() {
    return <div className="my-2 border-b border-dashed border-black" />;
}

function SolidDivider() {
    return <div className="my-2 border-b border-solid border-black" />;
}

function NotaThermal({
    id,
    paper,
    transaction,
}: {
    id: string;
    paper: '80' | '57';
    transaction: WeighingTransaction;
}) {
    const c = PAPER_CLASSES[paper];
    const pct = transaction.sorting_deduction_percentage ?? 0;
    // prettier-ignore
    const showDebt = transaction.previous_debt_amount > 0 || transaction.debt_paid_amount > 0;

    return (
        <div
            id={id}
            className={cn(
                'border border-sidebar-border/50 bg-white font-mono leading-tight text-black uppercase shadow-sm print:border-none print:shadow-none',
                c.wrap,
            )}
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
            {/* Header */}
            <div className="mb-4 space-y-0.5 text-center">
                <h1 className={cn('font-black tracking-tighter', c.brand)}>
                    RAM SAWIT HND JAYA
                </h1>
                <p className={c.sub}>Jl. Parit 1 Api-Api</p>
                <p className={c.sub}>Telp: 0822-6429-0744</p>
                <Divider />
                <h2 className={cn('font-bold', c.heading)}>
                    NOTA TIMBANGAN SAWIT
                </h2>
                <p className={c.sub}>{transaction.nota_number}</p>
            </div>

            {/* Info */}
            <div className="mb-3 space-y-0.5">
                <Row
                    label="TANGGAL:"
                    value={new Date(
                        transaction.transaction_date,
                    ).toLocaleDateString('id-ID')}
                />
                <Row
                    label="JAM:"
                    value={new Date(transaction.created_at).toLocaleTimeString(
                        'id-ID',
                        {
                            hour: '2-digit',
                            minute: '2-digit',
                        },
                    )}
                />
                <Row label="KASIR:" value={transaction.cashier_name_snapshot} />
                <Row
                    label="PETANI:"
                    value={transaction.farmer_name_snapshot}
                    bold
                />
            </div>

            <SolidDivider />

            {/* Weights */}
            {transaction.loads?.length ? (
                <>
                    <div className="mb-3 space-y-0.5">
                        <p className={cn('font-bold', c.heading)}>
                            RINCIAN MUATAN:
                        </p>
                        {transaction.loads.map((load, i) => (
                            <div
                                key={load.id}
                                className={
                                    i > 0
                                        ? 'mt-1 space-y-0.5 border-t border-dotted border-black pt-1'
                                        : 'space-y-0.5'
                                }
                            >
                                <p className={cn('font-bold', c.heading)}>
                                    MUATAN #{load.seq_no}
                                </p>
                                <Row
                                    label="BRUTO:"
                                    value={formatKg(load.gross_weight)}
                                />
                                <Row
                                    label="TARE:"
                                    value={formatKg(load.tare_weight)}
                                />
                                {load.has_sorting && (
                                    <Row
                                        label={
                                            pct > 0
                                                ? `SORTIRAN ${pct}%:`
                                                : 'SORTIRAN:'
                                        }
                                        value={`-${formatKg(load.sorting_weight)}`}
                                    />
                                )}
                                <Row
                                    label="NETTO:"
                                    value={formatKg(load.net_weight)}
                                    bold
                                />
                            </div>
                        ))}
                    </div>
                    <Divider />
                    <div className="mb-3 space-y-0.5">
                        <p className={cn('font-bold', c.heading)}>BERAT (KG)</p>
                        <Row
                            label="BRUTO:"
                            value={formatKg(transaction.gross_weight)}
                            bold={false}
                        />
                        <Row
                            label="TARE (MOBIL):"
                            value={formatKg(transaction.tare_weight)}
                            bold={false}
                        />
                        {transaction.has_sorting && (
                            <Row
                                label={
                                    pct > 0
                                        ? `SORTIRAN (${pct}%):`
                                        : 'SORTIRAN:'
                                }
                                value={`-${formatKg(transaction.sorting_weight)}`}
                                bold={false}
                            />
                        )}
                        <Row
                            label="BERAT SAWIT:"
                            value={formatKg(transaction.initial_weight)}
                            bold={false}
                        />
                        {transaction.has_deduction && (
                            <Row
                                label={`POTONGAN (${transaction.deduction_percentage}%):`}
                                value={`-${formatKg(transaction.deduction_weight)}`}
                                bold={false}
                            />
                        )}
                        <Row
                            label="NETTO SAWIT:"
                            value={formatKg(transaction.net_weight)}
                            bold
                        />
                    </div>
                </>
            ) : (
                <div className="mb-3 space-y-0.5">
                    <p className={cn('font-bold', c.heading)}>BERAT (KG)</p>
                    <Row
                        label="BRUTO:"
                        value={formatKg(transaction.gross_weight)}
                        bold={false}
                    />
                    <Row
                        label="TARE (MOBIL):"
                        value={formatKg(transaction.tare_weight)}
                        bold={false}
                    />
                    {transaction.has_sorting && (
                        <Row
                            label={
                                pct > 0 ? `SORTIRAN (${pct}%):` : 'SORTIRAN:'
                            }
                            value={`-${formatKg(transaction.sorting_weight)}`}
                            bold={false}
                        />
                    )}
                    <Row
                        label="BERAT SAWIT:"
                        value={formatKg(transaction.initial_weight)}
                        bold={false}
                    />
                    {transaction.has_deduction && (
                        <Row
                            label={`POTONGAN (${transaction.deduction_percentage}%):`}
                            value={`-${formatKg(transaction.deduction_weight)}`}
                            bold={false}
                        />
                    )}
                    <Row
                        label="NETTO SAWIT:"
                        value={formatKg(transaction.net_weight)}
                        bold
                    />
                </div>
            )}

            <SolidDivider />

            {/* Prices */}
            <div className="mb-3 space-y-0.5">
                <p className={cn('font-bold', c.heading)}>HARGA (RP)</p>
                <Row
                    label="HARGA SAWIT:"
                    value={new Intl.NumberFormat('id-ID').format(
                        transaction.palm_price_per_kg,
                    )}
                    bold={false}
                />
                <Row
                    label="TOTAL SAWIT:"
                    value={new Intl.NumberFormat('id-ID').format(
                        transaction.palm_total_amount,
                    )}
                    bold={false}
                />
                {transaction.has_sorting && (
                    <>
                        <Row
                            label="HARGA SORTIRAN:"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.sorting_price_per_kg,
                            )}
                            bold={false}
                        />
                        <Row
                            label="TOTAL SORTIRAN:"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.sorting_total_amount,
                            )}
                            bold={false}
                        />
                    </>
                )}
                <div className="border-t border-dotted border-black pt-1">
                    <Row
                        label="TOTAL KOTOR:"
                        value={new Intl.NumberFormat('id-ID').format(
                            transaction.gross_total_amount,
                        )}
                        bold
                    />
                </div>
            </div>

            {/* Debt section - only if applicable */}
            {showDebt && (
                <>
                    <SolidDivider />
                    <div className="mb-3 space-y-0.5">
                        <p className={cn('font-bold', c.heading)}>HUTANG</p>
                        <Row
                            label="HUTANG SEBELUMNYA:"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.previous_debt_amount,
                            )}
                            bold={false}
                        />
                        <Row
                            label="BAYAR HUTANG (-):"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.debt_paid_amount,
                            )}
                            bold={false}
                        />
                        <Row
                            label="SISA HUTANG:"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.remaining_debt_amount,
                            )}
                        />
                    </div>
                </>
            )}

            <SolidDivider />

            {/* Final Amount */}
            <div
                className={cn(
                    'my-3 border border-black text-center',
                    c.totalBox,
                )}
            >
                <p className={cn('font-bold', c.totalLabel)}>TOTAL DITERIMA</p>
                <p className={cn('font-black', c.totalAmount)}>
                    {formatRupiah(transaction.final_paid_amount_rounded)}
                </p>
                <p className={cn('mt-0.5', c.metode)}>
                    METODE:{' '}
                    {transaction.payment_method === 'cash'
                        ? 'TUNAI'
                        : 'TRANSFER BANK'}
                </p>
            </div>

            {/* Signatures */}
            <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className={c.sigName}>KASIR</p>
                    <div className={cn('border-t border-black pt-1', c.sigGap)}>
                        <p className={cn('font-bold', c.sigName)}>
                            {transaction.cashier_name_snapshot}
                        </p>
                    </div>
                </div>
                <div>
                    <p className={c.sigName}>PETANI</p>
                    <div className={cn('border-t border-black pt-1', c.sigGap)}>
                        <p className={cn('font-bold', c.sigName)}>
                            {transaction.farmer_name_snapshot}
                        </p>
                    </div>
                </div>
            </div>

            <Divider />
            <p className={cn('mt-2 text-center font-bold normal-case', c.note)}>
                NB: Harap hitung kembali uang anda, kami tidak menerima komplain
                saat sudah keluar dari RAMP
            </p>
            <Divider />
            <p className={cn('mt-2 text-center normal-case', c.note)}>
                Terima kasih atas kepercayaannya
            </p>
        </div>
    );
}

export default function WeighingSuccess({ transaction }: Props) {
    const {
        status,
        isSupported,
        activePrinter,
        pairedDevices,
        connect,
        print,
        isConnecting,
        autoReconnect,
    } = usePrinter();
    const [printError, setPrintError] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false);
    const [paperSize, setPaperSize] = useState<'80' | '57'>(() =>
        activePrinter?.columns === 32 ? '57' : '80',
    );

    // Page-load silent auto-reconnect: jika ada printer tersimpan tapi belum
    // terhubung, coba sambungkan kembali tanpa membuka chooser (D-3).
    // StrictMode double-fire aman karena reconnect() di service dedupe
    // in-flight (T2).
    useEffect(() => {
        if (status !== 'connected' && pairedDevices.length > 0) {
            autoReconnect().catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleBluetoothPrint = async () => {
        setPrintError(null);
        setPrinting(true);

        try {
            const notaEl = document.getElementById(
                paperSize === '57' ? 'nota-thermal-57' : 'nota-thermal',
            );
            await print(transaction, notaEl);
        } catch (err) {
            setPrintError(
                err instanceof Error ? err.message : 'Gagal mencetak.',
            );
        } finally {
            setPrinting(false);
        }
    };

    const handleBrowserPrint = () => {
        window.print();
    };

    const isBluetoothReady = isSupported && status === 'connected';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Nota ${transaction.nota_number}`} />

            <div className="flex flex-col items-center p-6">
                {/* Buttons - hidden on print */}
                <div className="mb-8 flex flex-wrap items-center gap-3 print:hidden">
                    <Link
                        href={weighingRoute.create()}
                        className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Timbangan Baru
                    </Link>

                    {isSupported ? (
                        <>
                            {isConnecting ? (
                                <button
                                    disabled
                                    className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition disabled:opacity-60"
                                >
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                                    Menghubungkan...
                                </button>
                            ) : status === 'connected' ? (
                                <button
                                    onClick={handleBluetoothPrint}
                                    disabled={printing}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {printing ? (
                                        <>
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Mencetak...
                                        </>
                                    ) : (
                                        <>
                                            <BluetoothConnected className="h-4 w-4" />
                                            Cetak Nota via Bluetooth
                                        </>
                                    )}
                                </button>
                            ) : pairedDevices.length > 0 ? (
                                <>
                                    <button
                                        onClick={handleBluetoothPrint}
                                        disabled={printing}
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        {printing ? (
                                            <>
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Mencetak...
                                            </>
                                        ) : (
                                            <>
                                                <BluetoothConnected className="h-4 w-4" />
                                                Cetak Nota via Bluetooth
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={connect}
                                        className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/30"
                                    >
                                        <Bluetooth className="h-4 w-4" />
                                        Hubungkan Printer
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={connect}
                                    disabled={isConnecting}
                                    className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/30 disabled:opacity-60"
                                >
                                    <Bluetooth className="h-4 w-4" />
                                    Hubungkan Printer
                                </button>
                            )}

                            {printError && (
                                <p className="w-full text-xs text-red-500">
                                    {printError}
                                </p>
                            )}

                            <span className="text-xs text-muted-foreground">
                                atau
                            </span>

                            <button
                                onClick={handleBrowserPrint}
                                className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/30"
                                title="Gunakan dialog print browser (ESC/POS tidak aktif)"
                            >
                                <PrinterIcon className="h-4 w-4" />
                                Cetak via Browser
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleBrowserPrint}
                            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow transition hover:opacity-80"
                        >
                            <Printer className="h-4 w-4" />
                            Cetak Nota ({paperSize === '57' ? '57mm' : '80mm'})
                        </button>
                    )}

                    {isBluetoothReady && activePrinter && (
                        <p className="w-full text-center text-xs text-emerald-600">
                            Terhubung ke {activePrinter.name}
                        </p>
                    )}
                </div>

                {/* Paper size toggle */}
                <div className="mb-4 flex items-center gap-2 print:hidden">
                    <span className="text-xs font-medium text-muted-foreground">
                        Ukuran Kertas:
                    </span>
                    <button
                        onClick={() => setPaperSize('80')}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-semibold',
                            paperSize === '80'
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-sidebar-border/50 text-muted-foreground hover:bg-muted/30',
                        )}
                    >
                        80mm
                    </button>
                    <button
                        onClick={() => setPaperSize('57')}
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-semibold',
                            paperSize === '57'
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-sidebar-border/50 text-muted-foreground hover:bg-muted/30',
                        )}
                    >
                        57mm
                    </button>
                </div>

                {/* Success Banner - hidden on print */}
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 dark:border-emerald-900/40 dark:bg-emerald-900/10 print:hidden">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                    <div>
                        <p className="font-bold text-emerald-800 dark:text-emerald-400">
                            Transaksi Berhasil Disimpan!
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-500">
                            Nota:{' '}
                            <span className="font-mono font-bold">
                                {transaction.nota_number}
                            </span>
                        </p>
                    </div>
                </div>

                {/* ── NOTA THERMAL ── */}
                {paperSize === '80' ? (
                    <NotaThermal
                        id="nota-thermal"
                        paper="80"
                        transaction={transaction}
                    />
                ) : (
                    <NotaThermal
                        id="nota-thermal-57"
                        paper="57"
                        transaction={transaction}
                    />
                )}

                {/* Print Styles */}
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page {
                                margin: 0;
                                size: ${paperSize === '57' ? '57mm' : '80mm'} auto;
                            }

                            * {
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                            }

                            body :not(#nota-thermal):not(#nota-thermal *):not(#nota-thermal-57):not(#nota-thermal-57 *) {
                                visibility: hidden;
                            }

                            #nota-thermal, #nota-thermal-57 {
                                visibility: visible;
                                position: fixed;
                                left: 0;
                                top: 0;
                                width: ${paperSize === '57' ? '57mm' : '80mm'};
                                padding: ${paperSize === '57' ? '3mm' : '4mm'};
                                margin: 0;
                                border: none;
                                box-shadow: none;
                            }

                            #nota-thermal *, #nota-thermal-57 * {
                                visibility: visible;
                            }
                        }
                    `,
                    }}
                />
            </div>
        </AppLayout>
    );
}
