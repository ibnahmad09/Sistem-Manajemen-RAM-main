import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, Filter, Scale, Search } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { formatKg, formatRupiah } from '@/lib/utils';
import * as weighingRoute from '@/routes/weighing';
import type {BreadcrumbItem, Farmer, PaginatedData, WeighingTransaction} from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Riwayat Timbangan', href: '/weighing' },
];

interface Props {
    transactions: PaginatedData<WeighingTransaction & { farmer: Farmer }>;
    filters: { farmer_id?: string; date_start?: string; date_end?: string };
}

const STATUS_BADGE: Record<string, string> = {
    printed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    revised: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
    printed: 'Selesai',
    draft: 'Draft',
    revised: 'Revisi',
    cancelled: 'Batal',
};

export default function WeighingList({ transactions, filters }: Props) {
    const [dateStart, setDateStart] = useState(filters.date_start ?? '');
    const [dateEnd, setDateEnd] = useState(filters.date_end ?? '');

    const applyFilter = () => {
        router.get(
            weighingRoute.index().url,
            { date_start: dateStart, date_end: dateEnd },
            { preserveState: true },
        );
    };

    const clearFilter = () => {
        setDateStart('');
        setDateEnd('');
        router.get(weighingRoute.index().url, {}, { preserveState: false });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Riwayat Timbangan" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Riwayat Timbangan</h1>
                        <p className="text-sm text-muted-foreground">
                            {transactions.total} total transaksi
                        </p>
                    </div>
                    <Link
                        href={weighingRoute.create()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                    >
                        <Scale className="h-4 w-4" />
                        Input Timbangan
                    </Link>
                </div>

                {/* Filter */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-sidebar-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Filter:
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Dari</label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="h-9 rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Sampai</label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="h-9 rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={applyFilter}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                        <Search className="h-3.5 w-3.5" />
                        Cari
                    </button>
                    {(filters.date_start || filters.date_end) && (
                        <button
                            onClick={clearFilter}
                            className="h-9 rounded-lg border border-sidebar-border/50 px-4 text-sm text-muted-foreground hover:text-foreground transition"
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-sidebar-border/30 bg-muted/30">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">No. Nota</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Petani</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Berat Bersih</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Bayar</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/20">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-sm italic text-muted-foreground">
                                            Belum ada transaksi timbangan.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-xs font-bold text-primary">{tx.nota_number}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                                                        {tx.farmer_name_snapshot.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{tx.farmer_name_snapshot}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span className="text-xs">
                                                        {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                                                            day: '2-digit', month: 'short', year: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="font-mono text-sm font-semibold">{formatKg(tx.net_weight)}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="font-mono text-sm font-bold text-emerald-600">
                                                    {formatRupiah(tx.final_paid_amount_rounded)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[tx.status] ?? ''}`}>
                                                    {STATUS_LABEL[tx.status] ?? tx.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <Link
                                                    href={weighingRoute.success({ query: { nota: tx.nota_number } }).url}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors"
                                                >
                                                    Nota
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {transactions.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {transactions.links.map((link, i) => (
                            <button
                                key={i}
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url)}
                                className={`h-9 min-w-[2.25rem] rounded-lg border px-3 text-sm transition ${
                                    link.active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-sidebar-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-40'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
