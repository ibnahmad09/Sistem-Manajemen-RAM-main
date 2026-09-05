import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Bluetooth,
    BluetoothConnected,
    CheckCircle,
    Printer,
    PrinterIcon,
} from 'lucide-react';
import { useState } from 'react';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { formatKg, formatRupiah } from '@/lib/utils';
import * as weighingRoute from '@/routes/weighing';
import type { BreadcrumbItem, WeighingTransaction } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Timbangan', href: '/weighing' },
    { title: 'Nota', href: '#' },
];

interface Props {
    transaction: WeighingTransaction;
}

function Row({
    label,
    value,
    bold = false,
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

export default function WeighingSuccess({ transaction }: Props) {
    const { status, isSupported, activePrinter, connect, print, isConnecting } =
        usePrinter();
    const [printError, setPrintError] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false);

    const handleBluetoothPrint = async () => {
        setPrintError(null);
        setPrinting(true);

        try {
            await print(transaction);
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
                            {isBluetoothReady ? (
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
                            ) : (
                                <button
                                    onClick={connect}
                                    disabled={isConnecting}
                                    className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/30 disabled:opacity-60"
                                >
                                    {isConnecting ? (
                                        <>
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                                            Menghubungkan...
                                        </>
                                    ) : (
                                        <>
                                            <Bluetooth className="h-4 w-4" />
                                            Hubungkan Printer
                                        </>
                                    )}
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
                            Cetak Nota (80mm)
                        </button>
                    )}

                    {isBluetoothReady && activePrinter && (
                        <p className="w-full text-center text-xs text-emerald-600">
                            Terhubung ke {activePrinter.name}
                        </p>
                    )}
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

                {/* ── NOTA THERMAL 80mm ── */}
                <div
                    id="nota-thermal"
                    className="w-[80mm] border border-sidebar-border/50 bg-white p-4 font-mono text-[10px] leading-tight text-black uppercase shadow-sm print:border-none print:shadow-none"
                    style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                    {/* Header */}
                    <div className="mb-4 space-y-0.5 text-center">
                        <h1 className="text-sm font-black tracking-tighter">
                            RAM SAWIT HND JAYA
                        </h1>
                        <p className="text-[8px]">Jl. Parit 1 Siapi-api</p>
                        <p className="text-[8px]">Telp: 0812-xxxx-xxxx</p>
                        <Divider />
                        <h2 className="text-[9px] font-bold">
                            NOTA TIMBANGAN SAWIT
                        </h2>
                        <p className="text-[8px]">{transaction.nota_number}</p>
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
                            value={new Date(
                                transaction.created_at,
                            ).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        />
                        <Row
                            label="KASIR:"
                            value={transaction.cashier_name_snapshot}
                        />
                        <Row
                            label="PETANI:"
                            value={transaction.farmer_name_snapshot}
                            bold
                        />
                    </div>

                    <Divider />

                    {/* Weights */}
                    {transaction.loads?.length ? (
                        <div className="mb-3 space-y-0.5">
                            <p className="text-[8px] font-bold">
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
                                    <p className="text-[8px] font-bold">
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
                                            label="SORTIRAN:"
                                            value={`-${formatKg(
                                                load.sorting_weight,
                                            )}`}
                                        />
                                    )}
                                    <Row
                                        label="NETTO:"
                                        value={formatKg(load.net_weight)}
                                        bold
                                    />
                                </div>
                            ))}
                            {transaction.has_deduction && (
                                <Row
                                    label={`POTONGAN (${transaction.deduction_percentage}%):`}
                                    value={`-${formatKg(
                                        transaction.deduction_weight,
                                    )}`}
                                />
                            )}
                            <div className="border-t border-dotted border-black pt-1">
                                <Row
                                    label="NETTO BERSIH:"
                                    value={formatKg(transaction.net_weight)}
                                    bold
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="mb-3 space-y-0.5">
                            <Row
                                label="BRUTO:"
                                value={formatKg(transaction.gross_weight)}
                            />
                            <Row
                                label="TARE (MOBIL):"
                                value={formatKg(transaction.tare_weight)}
                            />
                            <Row
                                label="NETTO KOTOR:"
                                value={formatKg(transaction.initial_weight)}
                                bold
                            />
                            {transaction.has_deduction && (
                                <Row
                                    label={`POTONGAN (${transaction.deduction_percentage}%):`}
                                    value={`-${formatKg(
                                        transaction.deduction_weight,
                                    )}`}
                                />
                            )}
                            <div className="border-t border-dotted border-black pt-1">
                                <Row
                                    label="NETTO BERSIH:"
                                    value={formatKg(transaction.net_weight)}
                                    bold
                                />
                            </div>
                        </div>
                    )}

                    <Divider />

                    {/* Prices */}
                    <div className="mb-3 space-y-0.5">
                        <Row
                            label="HARGA/KG:"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.palm_price_per_kg,
                            )}
                        />
                        <Row
                            label="TOTAL SAWIT:"
                            value={new Intl.NumberFormat('id-ID').format(
                                transaction.palm_total_amount,
                            )}
                            bold
                        />
                        {transaction.has_sorting && (
                            <Row
                                label={`SORTIRAN (${formatKg(transaction.sorting_weight)}):`}
                                value={new Intl.NumberFormat('id-ID').format(
                                    transaction.sorting_total_amount,
                                )}
                            />
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
                    {transaction.debt_paid_amount > 0 && (
                        <>
                            <Divider />
                            <div className="mb-3 space-y-0.5">
                                <Row
                                    label="HUTANG SEBELUMNYA:"
                                    value={new Intl.NumberFormat(
                                        'id-ID',
                                    ).format(transaction.previous_debt_amount)}
                                />
                                <Row
                                    label="BAYAR HUTANG (-):"
                                    value={new Intl.NumberFormat(
                                        'id-ID',
                                    ).format(transaction.debt_paid_amount)}
                                    bold
                                />
                                <Row
                                    label="SISA HUTANG:"
                                    value={new Intl.NumberFormat(
                                        'id-ID',
                                    ).format(transaction.remaining_debt_amount)}
                                />
                            </div>
                        </>
                    )}

                    {/* Final Amount */}
                    <div className="my-3 border border-black p-2 text-center">
                        <p className="text-[8px] font-bold">TOTAL DITERIMA</p>
                        <p className="text-sm font-black">
                            {formatRupiah(
                                transaction.final_paid_amount_rounded,
                            )}
                        </p>
                        <p className="mt-0.5 text-[7px]">
                            METODE:{' '}
                            {transaction.payment_method === 'cash'
                                ? 'TUNAI'
                                : 'TRANSFER BANK'}
                        </p>
                    </div>

                    {/* Signatures */}
                    <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-[8px]">KASIR</p>
                            <div className="mt-8 border-t border-black pt-1">
                                <p className="text-[8px] font-bold">
                                    {transaction.cashier_name_snapshot}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[8px]">PETANI</p>
                            <div className="mt-8 border-t border-black pt-1">
                                <p className="text-[8px] font-bold">
                                    {transaction.farmer_name_snapshot}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Divider />
                    <p className="mt-2 text-center text-[7px] font-bold normal-case">
                        NB: Harap hitung kembali Bang anda, kami tidak menerima
                        komplain saat sudah keluar dari RAMP
                    </p>
                    <Divider />
                    <p className="mt-2 text-center text-[7px] normal-case">
                        Terima kasih atas kepercayaannya
                    </p>
                </div>

                {/* Print Styles */}
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page {
                                margin: 0;
                                size: 80mm auto;
                            }

                            * {
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                            }

                            body :not(#nota-thermal):not(#nota-thermal *) {
                                visibility: hidden;
                            }

                            #nota-thermal {
                                visibility: visible;
                                position: fixed;
                                left: 0;
                                top: 0;
                                width: 80mm;
                                padding: 4mm;
                                margin: 0;
                                border: none;
                                box-shadow: none;
                            }

                            #nota-thermal * {
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
