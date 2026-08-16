import { Head, router, useForm } from '@inertiajs/react';
import { DollarSign, Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import CurrencyInput from '@/components/currency-input';
import AppLayout from '@/layouts/app-layout';
import { cn, formatRupiah } from '@/lib/utils';
import * as cashFlowRoute from '@/routes/cash-flow';
import type { BreadcrumbItem, CashierCashEntry, PaginatedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Arus Kas', href: '/cash-flow' },
];

const CATEGORIES = [
    { value: 'modal_kasir', label: 'Modal Kasir' },
    { value: 'bayar_petani', label: 'Bayar Petani' },
    { value: 'admin_bank', label: 'Admin Bank' },
    { value: 'lain_lain', label: 'Lain-lain' },
];

const TYPE_LABEL: Record<string, string> = {
    cash_in: 'Kas Masuk',
    expense: 'Pengeluaran',
    farmer_payment: 'Bayar Petani',
};

interface Props {
    entries: PaginatedData<
        CashierCashEntry & { cashier: { id: number; name: string } }
    >;
    balance: { cash_in: number; cash_out: number; balance: number };
    filters: Record<string, string>;
}

export default function CashFlowIndex({ entries, balance }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entryType, setEntryType] = useState<'cash_in' | 'expense'>(
        'cash_in',
    );

    const { data, setData, post, processing, reset, errors } = useForm({
        type: 'cash_in' as 'cash_in' | 'expense',
        amount: '',
        payment_method: 'cash' as 'cash' | 'transfer',
        category: 'modal_kasir',
        description: '',
        entry_date: new Date().toISOString().split('T')[0],
    });

    const openModal = (type: 'cash_in' | 'expense') => {
        setEntryType(type);
        setData({
            type,
            amount: '',
            payment_method: 'cash',
            category: type === 'cash_in' ? 'modal_kasir' : 'lain_lain',
            description: '',
            entry_date: new Date().toISOString().split('T')[0],
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(cashFlowRoute.store().url, {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Arus Kas Kasir" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Arus Kas Kasir
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Monitoring saldo dan transaksi kas
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => openModal('cash_in')}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
                        >
                            <Plus className="h-4 w-4" />
                            Kas Masuk
                        </button>
                        <button
                            onClick={() => openModal('expense')}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700"
                        >
                            <Minus className="h-4 w-4" />
                            Pengeluaran
                        </button>
                    </div>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                        <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                            Total Kas Masuk
                        </p>
                        <p className="mt-1 font-mono text-2xl font-black text-emerald-800 dark:text-emerald-300">
                            {formatRupiah(balance.cash_in)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
                        <p className="text-xs font-bold tracking-widest text-red-700 uppercase dark:text-red-400">
                            Total Kas Keluar
                        </p>
                        <p className="mt-1 font-mono text-2xl font-black text-red-800 dark:text-red-300">
                            {formatRupiah(balance.cash_out)}
                        </p>
                    </div>
                    <div
                        className={cn(
                            'rounded-xl border p-4',
                            balance.balance >= 0
                                ? 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10'
                                : 'border-red-300 bg-red-100 dark:border-red-900/40 dark:bg-red-900/20',
                        )}
                    >
                        <p
                            className={cn(
                                'text-xs font-bold tracking-widest uppercase',
                                balance.balance >= 0
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-red-700 dark:text-red-400',
                            )}
                        >
                            Saldo Bersih
                        </p>
                        <p
                            className={cn(
                                'mt-1 font-mono text-2xl font-black',
                                balance.balance >= 0
                                    ? 'text-blue-800 dark:text-blue-300'
                                    : 'text-red-800 dark:text-red-300',
                            )}
                        >
                            {formatRupiah(balance.balance)}
                        </p>
                    </div>
                </div>

                {/* Entries Table */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-sidebar-border/30 bg-muted/30">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Tanggal
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Tipe
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Keterangan
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Kasir
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                        Nominal
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/20">
                                {entries.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-12 text-center text-sm text-muted-foreground italic"
                                        >
                                            Belum ada entri kas.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.data.map((entry) => {
                                        const isIn = entry.type === 'cash_in';

                                        return (
                                            <tr
                                                key={entry.id}
                                                className="transition-colors hover:bg-muted/20"
                                            >
                                                <td className="px-5 py-3 text-muted-foreground">
                                                    <span className="text-xs">
                                                        {new Date(
                                                            entry.entry_date,
                                                        ).toLocaleDateString(
                                                            'id-ID',
                                                            {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                                            isIn
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                                        )}
                                                    >
                                                        {isIn ? '↑' : '↓'}{' '}
                                                        {TYPE_LABEL[entry.type]}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-muted-foreground">
                                                    {entry.description ?? '—'}
                                                </td>
                                                <td className="px-5 py-3 text-muted-foreground">
                                                    {entry.cashier?.name ??
                                                        entry.cashier_name_snapshot}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span
                                                        className={cn(
                                                            'font-mono font-bold',
                                                            isIn
                                                                ? 'text-emerald-600'
                                                                : 'text-red-600',
                                                        )}
                                                    >
                                                        {isIn ? '+' : '-'}
                                                        {formatRupiah(
                                                            entry.amount,
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {entries.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {entries.links.map((link, i) => (
                            <button
                                key={i}
                                disabled={!link.url}
                                onClick={() =>
                                    link.url && router.visit(link.url)
                                }
                                className={cn(
                                    'h-9 min-w-[2.25rem] rounded-lg border px-3 text-sm transition',
                                    link.active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-sidebar-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-40',
                                )}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add Entry Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-sidebar-border/30 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <DollarSign
                                    className={cn(
                                        'h-5 w-5',
                                        entryType === 'cash_in'
                                            ? 'text-emerald-500'
                                            : 'text-red-500',
                                    )}
                                />
                                <h2 className="font-bold text-foreground">
                                    {entryType === 'cash_in'
                                        ? 'Tambah Kas Masuk'
                                        : 'Catat Pengeluaran'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">
                                    Nominal (Rp){' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <CurrencyInput
                                    value={data.amount}
                                    onChange={(raw) => setData('amount', raw)}
                                    required
                                    placeholder="0"
                                />
                                {errors.amount && (
                                    <p className="text-xs text-red-500">
                                        {errors.amount}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">
                                    Kategori
                                </label>
                                <select
                                    value={data.category}
                                    onChange={(e) =>
                                        setData('category', e.target.value)
                                    }
                                    className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">
                                    Metode Pembayaran
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['cash', 'transfer'] as const).map(
                                        (m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() =>
                                                    setData('payment_method', m)
                                                }
                                                className={cn(
                                                    'rounded-lg border py-2.5 text-sm font-bold transition',
                                                    data.payment_method === m
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-sidebar-border/50 text-muted-foreground hover:bg-muted/30',
                                                )}
                                            >
                                                {m === 'cash'
                                                    ? '💵 Tunai'
                                                    : '🏦 Transfer'}
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">
                                    Keterangan
                                </label>
                                <input
                                    type="text"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Contoh: Modal awal shift pagi..."
                                    className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-lg border border-sidebar-border/50 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/30"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={cn(
                                        'flex-1 rounded-lg py-2 text-sm font-bold text-white shadow transition disabled:opacity-60',
                                        entryType === 'cash_in'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-red-600 hover:bg-red-700',
                                    )}
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
