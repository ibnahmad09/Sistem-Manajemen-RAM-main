import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { formatKg, formatRupiah } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Laporan', href: '/reports' }];

interface ReportTransaction {
    id: number;
    nota_number: string;
    farmer_name_snapshot: string;
    cashier_name_snapshot: string;
    transaction_date: string;
    net_weight: number;
    gross_total_amount: number;
    debt_paid_amount: number;
    final_paid_amount_rounded: number;
    payment_method: string;
}

interface ReportSummary {
    total_transactions: number;
    total_weight: number;
    total_revenue: number;
    total_paid_out: number;
    total_debt_paid: number;
}

interface Props {
    transactions?: ReportTransaction[] | null;
    summary?: ReportSummary | null;
    filters?: { date_start?: string; date_end?: string };
}

export default function ReportsIndex({
    transactions,
    summary,
    filters = {},
}: Props) {
    const safeTransactions = transactions ?? [];
    const [dateStart, setDateStart] = useState(filters.date_start ?? '');
    const [dateEnd, setDateEnd] = useState(filters.date_end ?? '');

    const runReport = () => {
        router.get(
            '/reports',
            { date_start: dateStart, date_end: dateEnd },
            { preserveState: true },
        );
    };

    const handlePrint = () => window.print();

    const handleExport = (format: 'pdf' | 'excel') => {
        const params = new URLSearchParams();

        if (dateStart) {
params.set('date_start', dateStart);
}

        if (dateEnd) {
params.set('date_end', dateEnd);
}

        window.open(`/reports/export/${format}?${params.toString()}`, '_blank');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Keuangan" />

            <div className="space-y-6 p-6 print:p-0">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Laporan Keuangan
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Cetak atau export laporan transaksi timbangan
                        </p>
                    </div>
                    {summary && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow transition hover:opacity-80">
                                    <Download className="h-4 w-4" />
                                    Ekspor
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handlePrint}>
                                    <Printer className="h-4 w-4" />
                                    Cetak (Print)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('pdf')}
                                >
                                    <FileText className="h-4 w-4" />
                                    Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('excel')}
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Download Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Filter */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-sidebar-border/50 bg-card p-4 print:hidden">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                            Dari Tanggal
                        </label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="h-9 rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                            Sampai
                        </label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="h-9 rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={runReport}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                        <Search className="h-3.5 w-3.5" />
                        Generate Laporan
                    </button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                        {[
                            {
                                label: 'Total Transaksi',
                                value: String(summary.total_transactions),
                            },
                            {
                                label: 'Total Berat Bersih',
                                value: formatKg(summary.total_weight),
                            },
                            {
                                label: 'Total Bruto',
                                value: formatRupiah(summary.total_revenue),
                            },
                            {
                                label: 'Total Dibayarkan',
                                value: formatRupiah(summary.total_paid_out),
                            },
                            {
                                label: 'Hutang Terbayar',
                                value: formatRupiah(summary.total_debt_paid),
                            },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="rounded-xl border border-sidebar-border/50 bg-card p-4 shadow-sm"
                            >
                                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                                    {s.label}
                                </p>
                                <p className="mt-1 font-mono text-base font-bold text-foreground">
                                    {s.value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Transactions Table */}
                {safeTransactions.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card">
                        {/* Print Header */}
                        <div className="hidden border-b border-sidebar-border/30 px-5 py-4 print:block">
                            <h2 className="text-center text-lg font-bold">
                                LAPORAN TRANSAKSI TIMBANGAN SAWIT
                            </h2>
                            <p className="text-center text-sm text-muted-foreground">
                                Periode: {dateStart || '—'} s/d {dateEnd || '—'}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-sidebar-border/30 bg-muted/30">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            No. Nota
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Tanggal
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Petani
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Kasir
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Berat Bersih
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Total Bruto
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Bayar Hutang
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Diterima
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/20">
                                    {safeTransactions.map((tx) => (
                                        <tr
                                            key={tx.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-4 py-2.5 font-mono text-xs font-bold text-primary">
                                                {tx.nota_number}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                {new Date(
                                                    tx.transaction_date,
                                                ).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium">
                                                {tx.farmer_name_snapshot}
                                            </td>
                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                {tx.cashier_name_snapshot}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono">
                                                {formatKg(tx.net_weight)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono">
                                                {formatRupiah(
                                                    tx.gross_total_amount,
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-red-600">
                                                {tx.debt_paid_amount > 0
                                                    ? formatRupiah(
                                                          tx.debt_paid_amount,
                                                      )
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">
                                                {formatRupiah(
                                                    tx.final_paid_amount_rounded,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Totals Row */}
                                {summary && (
                                    <tfoot className="border-t-2 border-sidebar-border/50 bg-muted/30">
                                        <tr className="font-bold">
                                            <td
                                                colSpan={4}
                                                className="px-4 py-3 text-sm"
                                            >
                                                TOTAL
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {formatKg(summary.total_weight)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {formatRupiah(
                                                    summary.total_revenue,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-red-600">
                                                {formatRupiah(
                                                    summary.total_debt_paid,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-600">
                                                {formatRupiah(
                                                    summary.total_paid_out,
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sidebar-border/50 py-16 text-center">
                        <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="font-semibold text-muted-foreground">
                            Laporan Belum Digenerate
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pilih rentang tanggal dan klik "Generate Laporan"
                        </p>
                    </div>
                )}

                {/* Print Styles */}
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            nav, aside, .print\\:hidden { display: none !important; }
                            .print\\:block { display: block !important; }
                            body { font-size: 11px; margin: 0; }
                            table { font-size: 10px; border-collapse: collapse; width: 100%; }
                            th, td { border: 1px solid #ccc; padding: 6px 8px; }
                            th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            @page { size: A4 landscape; margin: 12mm; }
                        }
                    `,
                    }}
                />
            </div>
        </AppLayout>
    );
}
