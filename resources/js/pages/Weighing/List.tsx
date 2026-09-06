import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Clock, Filter, Scale, Search } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { formatKg, formatRupiah } from '@/lib/utils';
import * as weighingRoute from '@/routes/weighing';
import type {
    BreadcrumbItem,
    Farmer,
    PaginatedData,
    WeighingLoad,
    WeighingTransaction,
} from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Riwayat Timbangan', href: '/weighing' },
];

interface Props {
    transactions: PaginatedData<WeighingTransaction & { farmer: Farmer }>;
    filters: { farmer_id?: string; date_start?: string; date_end?: string };
    summary: { total_bruto: number; total_neto: number };
    activeDrafts: (WeighingTransaction & {
        farmer?: Farmer;
        loads?: WeighingLoad[];
    })[];
}

const STATUS_BADGE: Record<string, string> = {
    printed:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
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

export default function WeighingList({
    transactions,
    filters,
    summary,
    activeDrafts,
}: Props) {
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
                        <h1 className="text-2xl font-bold text-foreground">
                            Riwayat Timbangan
                        </h1>
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

                {/* Timbangan Berjalan */}
                {activeDrafts.length > 0 && (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-950/20">
                        <div className="mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <h2 className="text-sm font-bold text-foreground">
                                Timbangan Berjalan
                            </h2>
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                {activeDrafts.length} draft
                            </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {activeDrafts.map((draft) => (
                                <div
                                    key={draft.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-yellow-200/70 bg-card p-3 dark:border-yellow-900/30"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {draft.farmer?.name ??
                                                draft.farmer_name_snapshot}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatKg(draft.net_weight)} ·{' '}
                                            {draft.loads?.length ?? 1} muatan ·{' '}
                                            {new Date(
                                                draft.updated_at,
                                            ).toLocaleString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Link
                                            href={weighingRoute.create({
                                                query: { draft: draft.id },
                                            })}
                                            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                                        >
                                            Lanjutkan
                                        </Link>
                                        <button
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        `Batalkan draft untuk "${draft.farmer?.name ?? draft.farmer_name_snapshot}"?`,
                                                    )
                                                ) {
                                                    router.post(
                                                        weighingRoute.cancel(
                                                            draft.id,
                                                        ).url,
                                                    );
                                                }
                                            }}
                                            className="inline-flex h-8 items-center rounded-lg border border-sidebar-border/50 px-3 text-xs font-medium text-muted-foreground transition hover:border-red-400/60 hover:text-red-500"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-sidebar-border/50 bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        Filter:
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                            Dari
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
                        onClick={applyFilter}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                        <Search className="h-3.5 w-3.5" />
                        Cari
                    </button>
                    {(filters.date_start || filters.date_end) && (
                        <button
                            onClick={clearFilter}
                            className="h-9 rounded-lg border border-sidebar-border/50 px-4 text-sm text-muted-foreground transition hover:text-foreground"
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* Ringkasan */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-sidebar-border/50 bg-card p-4 shadow-sm">
                        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Total Bruto
                        </p>
                        <p className="mt-1 font-mono text-xl font-bold text-foreground">
                            {formatKg(summary.total_bruto)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/50 bg-card p-4 shadow-sm">
                        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Total Neto
                        </p>
                        <p className="mt-1 font-mono text-xl font-bold text-foreground">
                            {formatKg(summary.total_neto)}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-sidebar-border/30 bg-muted/30">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        No. Nota
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Petani
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Tanggal
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Bruto
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Neto
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Berat Bersih
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Total Bayar
                                    </th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/20">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-12 text-center text-sm text-muted-foreground italic"
                                        >
                                            Belum ada transaksi timbangan.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((tx) => (
                                        <tr
                                            key={tx.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-5 py-3">
                                                <span className="font-mono text-xs font-bold text-primary">
                                                    {tx.nota_number}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                                                        {tx.farmer_name_snapshot.charAt(
                                                            0,
                                                        )}
                                                    </div>
                                                    <span className="font-medium">
                                                        {
                                                            tx.farmer_name_snapshot
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span className="text-xs">
                                                        {new Date(
                                                            tx.transaction_date,
                                                        ).toLocaleDateString(
                                                            'id-ID',
                                                            {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="font-mono text-sm">
                                                    {formatKg(tx.gross_weight)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="font-mono text-sm">
                                                    {formatKg(
                                                        tx.initial_weight,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="font-mono text-sm font-semibold">
                                                    {formatKg(tx.net_weight)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="font-mono text-sm font-bold text-emerald-600">
                                                    {formatRupiah(
                                                        tx.final_paid_amount_rounded,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[tx.status] ?? ''}`}
                                                >
                                                    {STATUS_LABEL[tx.status] ??
                                                        tx.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <Link
                                                    href={
                                                        weighingRoute.success({
                                                            query: {
                                                                nota: tx.nota_number,
                                                            },
                                                        }).url
                                                    }
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
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
                                onClick={() =>
                                    link.url && router.visit(link.url)
                                }
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
