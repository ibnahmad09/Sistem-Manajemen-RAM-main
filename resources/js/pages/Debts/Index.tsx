import { Head, useForm } from '@inertiajs/react';
import {
    CreditCard,
    PlusCircle,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import CurrencyInput from '@/components/currency-input';
import AppLayout from '@/layouts/app-layout';
import { cn, formatRupiah } from '@/lib/utils';
import * as debtsRoute from '@/routes/debts';
import type { BreadcrumbItem, Farmer, FarmerDebt } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Hutang Petani', href: '/debts' },
];

interface FarmerWithBalance extends Farmer {
    balance: number;
}

interface Props {
    farmers: FarmerWithBalance[];
    debts: FarmerDebt[];
}

type ActionType = 'loan' | 'payment';

export default function DebtsIndex({ farmers, debts }: Props) {
    const [search, setSearch] = useState('');
    const [selectedFarmer, setSelectedFarmer] =
        useState<FarmerWithBalance | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const [actionType, setActionType] = useState<ActionType>('loan');

    const { data, setData, post, processing, reset, errors } = useForm({
        farmer_id: '',
        type: 'loan' as ActionType | 'adjustment',
        amount: '',
        description: '',
        debt_date: new Date().toISOString().split('T')[0],
    });

    const totalDebt = useMemo(
        () => farmers.reduce((s, f) => s + (f.balance > 0 ? f.balance : 0), 0),
        [farmers],
    );
    const farmersWithDebt = useMemo(
        () => farmers.filter((f) => f.balance > 0).length,
        [farmers],
    );

    const filtered = farmers.filter(
        (f) =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            (f.address ?? '').toLowerCase().includes(search.toLowerCase()),
    );

    const farmerDebts = useMemo(
        () =>
            selectedFarmer
                ? debts.filter((d) => d.farmer_id === selectedFarmer.id)
                : [],
        [selectedFarmer, debts],
    );

    const openAction = (type: ActionType, farmer?: FarmerWithBalance) => {
        setActionType(type);
        setData({
            farmer_id: farmer ? String(farmer.id) : '',
            type,
            amount: '',
            description: '',
            debt_date: new Date().toISOString().split('T')[0],
        });
        setIsActionOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        post(debtsRoute.store().url, {
            onSuccess: () => {
                setIsActionOpen(false);
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hutang Petani" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Manajemen Hutang Petani
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pantau pinjaman dan cicilan mitra petani.
                        </p>
                    </div>
                    {/* Total Debt Card */}
                    <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-900/40 dark:bg-red-900/10">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-widest text-red-600 uppercase dark:text-red-400">
                                Total Piutang RAM
                            </p>
                            <p className="font-mono text-xl font-black text-red-800 dark:text-red-300">
                                {formatRupiah(totalDebt)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left: Farmer list */}
                    <div className="space-y-4 lg:col-span-2">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Cari nama petani..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 w-full max-w-sm rounded-lg border border-sidebar-border/50 bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {filtered.map((farmer) => (
                                <div
                                    key={farmer.id}
                                    className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card transition-colors hover:border-primary/40"
                                >
                                    <button
                                        onClick={() => {
                                            setSelectedFarmer(farmer);
                                            setIsHistoryOpen(true);
                                        }}
                                        className="flex w-full items-start justify-between p-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                                                {farmer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">
                                                    {farmer.name}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {farmer.address ??
                                                        'Tanpa alamat'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                                                Sisa Hutang
                                            </p>
                                            <p
                                                className={cn(
                                                    'font-mono text-base font-bold',
                                                    farmer.balance > 0
                                                        ? 'text-red-600'
                                                        : 'text-emerald-600',
                                                )}
                                            >
                                                {formatRupiah(farmer.balance)}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="flex justify-end gap-2 border-t border-sidebar-border/30 bg-muted/20 px-4 py-2">
                                        <button
                                            onClick={() =>
                                                openAction('loan', farmer)
                                            }
                                            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-[11px] font-bold transition-colors hover:border-red-500/50 hover:text-red-600"
                                        >
                                            Pinjam{' '}
                                            <TrendingUp className="h-3 w-3 text-red-500" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                openAction('payment', farmer)
                                            }
                                            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-[11px] font-bold transition-colors hover:border-emerald-500/50 hover:text-emerald-600"
                                        >
                                            Bayar{' '}
                                            <TrendingDown className="h-3 w-3 text-emerald-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="col-span-full py-12 text-center text-sm text-muted-foreground italic">
                                    Petani tidak ditemukan.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Quick actions & stats */}
                    <div className="space-y-4">
                        <div className="rounded-xl border border-sidebar-border/50 bg-card p-4">
                            <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                                Quick Action
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => openAction('loan')}
                                    className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/30"
                                >
                                    <PlusCircle className="h-4 w-4 text-red-500" />
                                    Tambah Pinjaman Baru
                                </button>
                                <button
                                    onClick={() => openAction('payment')}
                                    className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/30"
                                >
                                    <TrendingDown className="h-4 w-4 text-emerald-500" />
                                    Input Pelunasan Manual
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-sidebar-border/50 bg-card p-4">
                            <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                                Statistik
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Petani Berhutang
                                    </span>
                                    <span className="font-bold">
                                        {farmersWithDebt} orang
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Total Piutang
                                    </span>
                                    <span className="font-mono font-bold text-red-600">
                                        {formatRupiah(totalDebt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 rounded-xl border border-sidebar-border/50 bg-muted/20 p-4 text-xs text-muted-foreground">
                            <div className="flex gap-2">
                                <div className="mt-1 h-3 w-0.5 shrink-0 rounded-full bg-foreground" />
                                <p>
                                    Hutang dapat dicicil saat penimbangan. Kasir
                                    memilih nominal cicilan.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <div className="mt-1 h-3 w-0.5 shrink-0 rounded-full bg-red-400" />
                                <p>
                                    Dana pinjaman baru akan mengurangi saldo kas
                                    kasir.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── History Modal ── */}
            {isHistoryOpen && selectedFarmer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-sidebar-border/30 px-6 py-4">
                            <div>
                                <h2 className="font-bold text-foreground">
                                    Riwayat Hutang: {selectedFarmer.name}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Saldo saat ini:{' '}
                                    <span
                                        className={cn(
                                            'font-mono font-bold',
                                            selectedFarmer.balance > 0
                                                ? 'text-red-600'
                                                : 'text-emerald-600',
                                        )}
                                    >
                                        {formatRupiah(selectedFarmer.balance)}
                                    </span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setIsHistoryOpen(false);
                                        openAction('loan', selectedFarmer);
                                    }}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-sm transition-colors hover:border-red-500/50 hover:text-red-600"
                                >
                                    Pinjam{' '}
                                    <TrendingUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsHistoryOpen(false);
                                        openAction('payment', selectedFarmer);
                                    }}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 text-sm transition-colors hover:border-emerald-500/50 hover:text-emerald-600"
                                >
                                    Bayar{' '}
                                    <TrendingDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 border-b border-sidebar-border/30 bg-muted/30">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Tanggal
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Keterangan
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                            Nominal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/20">
                                    {farmerDebts.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="py-10 text-center text-sm text-muted-foreground italic"
                                            >
                                                Belum ada riwayat hutang.
                                            </td>
                                        </tr>
                                    ) : (
                                        farmerDebts.map((d) => (
                                            <tr
                                                key={d.id}
                                                className="hover:bg-muted/20"
                                            >
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold">
                                                        {new Date(
                                                            d.debt_date,
                                                        ).toLocaleDateString(
                                                            'id-ID',
                                                        )}
                                                    </p>
                                                    <p className="font-mono text-[10px] text-muted-foreground">
                                                        {new Date(
                                                            d.debt_date,
                                                        ).toLocaleTimeString(
                                                            'id-ID',
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            },
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3 text-muted-foreground">
                                                    {d.description ?? '-'}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span
                                                        className={cn(
                                                            'font-mono font-bold',
                                                            d.type === 'loan'
                                                                ? 'text-red-600'
                                                                : 'text-emerald-600',
                                                        )}
                                                    >
                                                        {d.type === 'loan'
                                                            ? '+'
                                                            : '-'}
                                                        {formatRupiah(d.amount)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Action Modal (Loan/Payment) ── */}
            {isActionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-sidebar-border/30 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <CreditCard
                                    className={cn(
                                        'h-5 w-5',
                                        actionType === 'loan'
                                            ? 'text-red-500'
                                            : 'text-emerald-500',
                                    )}
                                />
                                <h2 className="font-bold text-foreground">
                                    {actionType === 'loan'
                                        ? 'Input Pinjaman Baru'
                                        : 'Input Pelunasan Manual'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsActionOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            {/* Farmer Select */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">
                                    Petani{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.farmer_id}
                                    onChange={(e) =>
                                        setData('farmer_id', e.target.value)
                                    }
                                    required
                                    className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">-- Pilih Petani --</option>
                                    {farmers.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.farmer_id && (
                                    <p className="text-xs text-red-500">
                                        {errors.farmer_id}
                                    </p>
                                )}
                            </div>

                            {/* Amount */}
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

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">
                                    Keterangan
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={2}
                                    placeholder="Contoh: Pinjaman modal pupuk..."
                                    className="w-full resize-none rounded-lg border border-sidebar-border/50 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsActionOpen(false)}
                                    className="flex-1 rounded-lg border border-sidebar-border/50 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted/30"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        !data.farmer_id ||
                                        !data.amount
                                    }
                                    className={cn(
                                        'flex-1 rounded-lg py-2 text-sm font-bold text-white shadow transition disabled:opacity-60',
                                        actionType === 'loan'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700',
                                    )}
                                >
                                    {processing
                                        ? 'Menyimpan...'
                                        : `Simpan ${actionType === 'loan' ? 'Pinjaman' : 'Pelunasan'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
