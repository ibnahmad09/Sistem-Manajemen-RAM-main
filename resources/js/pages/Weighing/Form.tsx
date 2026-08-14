import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Calculator, Save, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Farmer, type PalmPrice } from '@/types';
import { calculateTransaction, formatKg, formatRupiah } from '@/lib/utils';
import * as weighingRoute from '@/routes/weighing';
import * as farmersRoute from '@/routes/farmers';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Timbangan', href: '/weighing' },
    { title: 'Input Baru', href: '/weighing/create' },
];

interface Props {
    farmers: Farmer[];
    latestPrice: PalmPrice | null;
    roundingMode: string;
}

export default function WeighingForm({ farmers, latestPrice, roundingMode }: Props) {
    const [currentDebt, setCurrentDebt] = useState(0);
    const [loadingDebt, setLoadingDebt] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        farmer_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
        gross_weight: 0,
        tare_weight: 0,
        has_deduction: true,
        deduction_percentage: 3,
        palm_price_per_kg: latestPrice?.price_per_kg ?? 0,
        has_sorting: false,
        sorting_weight: 0,
        sorting_price_per_kg: 0,
        debt_paid_amount: 0,
        payment_method: 'cash' as 'cash' | 'transfer',
    });

    const fetchDebt = async (farmerId: string) => {
        if (!farmerId) {
            setCurrentDebt(0);
            return;
        }
        setLoadingDebt(true);
        try {
            const res = await fetch(farmersRoute.debt(parseInt(farmerId)).url);
            const json = await res.json();
            setCurrentDebt(json.balance ?? 0);
        } catch {
            setCurrentDebt(0);
        } finally {
            setLoadingDebt(false);
        }
    };

    const calc = useMemo(
        () =>
            calculateTransaction({
                grossWeight: data.gross_weight,
                tareWeight: data.tare_weight,
                hasDeduction: data.has_deduction,
                deductionPercentage: data.deduction_percentage,
                palmPricePerKg: data.palm_price_per_kg,
                hasSorting: data.has_sorting,
                sortingWeight: data.sorting_weight,
                sortingPricePerKg: data.sorting_price_per_kg,
                previousDebtAmount: currentDebt,
                debtPaidAmount: data.debt_paid_amount,
                roundingMode,
            }),
        [data, currentDebt, roundingMode],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(weighingRoute.store());
    };

    const NumberInput = ({
        label,
        field,
        placeholder = '0',
        step = '0.01',
        required = false,
        className = '',
    }: {
        label: string;
        field: keyof typeof data;
        placeholder?: string;
        step?: string;
        required?: boolean;
        className?: string;
    }) => (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="number"
                step={step}
                min="0"
                value={(data[field] as number) || ''}
                onChange={(e) => setData(field, parseFloat(e.target.value) || 0)}
                placeholder={placeholder}
                className={`h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary transition ${className}`}
            />
            {errors[field] && <p className="text-xs text-red-500">{String(errors[field])}</p>}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Input Timbangan" />

            <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                    <Link
                        href={weighingRoute.index()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            Input Timbangan Baru
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Harga aktif:{' '}
                            <span className="font-semibold text-foreground">
                                {latestPrice ? formatRupiah(latestPrice.price_per_kg) + '/kg' : 'Belum ada harga'}
                            </span>
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        {/* ── LEFT: Form Inputs ── */}
                        <div className="space-y-5 xl:col-span-2">
                            {/* Data Utama */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Data Utama</h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">
                                            Pilih Petani <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={data.farmer_id}
                                            onChange={(e) => {
                                                setData('farmer_id', e.target.value);
                                                setData('debt_paid_amount', 0);
                                                fetchDebt(e.target.value);
                                            }}
                                            className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary transition"
                                        >
                                            <option value="">-- Pilih Petani --</option>
                                            {farmers.map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name}{f.address ? ` — ${f.address}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.farmer_id && <p className="text-xs text-red-500">{errors.farmer_id}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Tanggal Transaksi</label>
                                        <input
                                            type="date"
                                            value={data.transaction_date}
                                            onChange={(e) => setData('transaction_date', e.target.value)}
                                            className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Hasil Timbangan */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Hasil Timbangan</h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <NumberInput label="Berat Bruto (kg)" field="gross_weight" required className="text-lg font-bold" />
                                        <NumberInput label="Berat Tara / Kendaraan (kg)" field="tare_weight" required className="text-lg font-bold" />
                                    </div>
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-sidebar-border/30 bg-muted/20 p-6 text-center">
                                        <Scale className="mb-2 h-8 w-8 text-muted-foreground/40" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Netto Kotor</p>
                                        <p className="mt-1 font-mono text-3xl font-bold text-foreground">
                                            {formatKg(calc.initialWeight)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Potongan & Sortiran */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Potongan & Sortiran</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Potongan */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="has_deduction"
                                                    checked={data.has_deduction}
                                                    onChange={(e) => setData('has_deduction', e.target.checked)}
                                                    className="h-4 w-4 accent-primary"
                                                />
                                                <label htmlFor="has_deduction" className="text-sm font-medium cursor-pointer">
                                                    Potongan Wajib
                                                </label>
                                            </div>
                                            {data.has_deduction && (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        value={data.deduction_percentage}
                                                        onChange={(e) => setData('deduction_percentage', parseFloat(e.target.value) || 0)}
                                                        className="h-8 w-14 rounded border border-sidebar-border/50 bg-background text-center text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                    />
                                                    <span className="text-sm text-muted-foreground">%</span>
                                                </div>
                                            )}
                                        </div>
                                        <NumberInput label="Harga Sawit per KG (Rp)" field="palm_price_per_kg" required />
                                    </div>

                                    {/* Sortiran */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border/50 p-3">
                                            <input
                                                type="checkbox"
                                                id="has_sorting"
                                                checked={data.has_sorting}
                                                onChange={(e) => setData('has_sorting', e.target.checked)}
                                                className="h-4 w-4 accent-primary"
                                            />
                                            <label htmlFor="has_sorting" className="text-sm font-medium cursor-pointer">
                                                Ada Sortiran
                                            </label>
                                        </div>
                                        {data.has_sorting && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <NumberInput label="Berat (kg)" field="sorting_weight" />
                                                <NumberInput label="Harga/kg (Rp)" field="sorting_price_per_kg" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pembayaran & Hutang */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Pembayaran & Hutang</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
                                            <p className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                                                {loadingDebt ? 'Memuat...' : 'Hutang Tersedia'}
                                            </p>
                                            <p className="mt-1 font-mono text-xl font-black text-red-700 dark:text-red-400">
                                                {formatRupiah(currentDebt)}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">Bayar Hutang Hari Ini</label>
                                            <input
                                                type="number"
                                                value={data.debt_paid_amount || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setData('debt_paid_amount', Math.min(val, currentDebt, calc.grossTotalAmount));
                                                }}
                                                max={Math.min(currentDebt, calc.grossTotalAmount)}
                                                min="0"
                                                step="1000"
                                                className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary transition"
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Maks: {formatRupiah(Math.min(currentDebt, calc.grossTotalAmount))}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">Metode Pembayaran</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['cash', 'transfer'] as const).map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setData('payment_method', m)}
                                                        className={`rounded-lg border py-2.5 text-sm font-bold transition ${
                                                            data.payment_method === m
                                                                ? 'border-primary bg-primary text-primary-foreground'
                                                                : 'border-sidebar-border/50 text-muted-foreground hover:bg-muted/30'
                                                        }`}
                                                    >
                                                        {m === 'cash' ? '💵 Tunai' : '🏦 Transfer'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Calculation Summary ── */}
                        <div>
                            <div className="sticky top-6 overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-2xl">
                                <div className="flex items-center justify-between bg-foreground px-5 py-4">
                                    <h3 className="font-bold italic text-background">Kalkulasi Pembayaran</h3>
                                    <Calculator className="h-4 w-4 text-background/50" />
                                </div>

                                <div className="space-y-3 p-5 font-mono text-sm">
                                    <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                        <span className="italic text-muted-foreground">Netto Kotor</span>
                                        <span className="font-bold">{formatKg(calc.initialWeight)}</span>
                                    </div>
                                    {data.has_deduction && (
                                        <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                            <span className="italic text-red-500">Potongan {data.deduction_percentage}%</span>
                                            <span className="font-bold text-red-500">-{formatKg(calc.deductionWeight)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                        <span className="italic text-emerald-600">Netto Bersih</span>
                                        <span className="font-bold text-emerald-600">{formatKg(calc.netWeight)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                        <span className="italic text-muted-foreground">Total Sawit</span>
                                        <span className="font-bold">{formatRupiah(calc.palmTotalAmount)}</span>
                                    </div>
                                    {data.has_sorting && (
                                        <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                            <span className="italic text-muted-foreground">Total Sortiran</span>
                                            <span className="font-bold text-emerald-600">+{formatRupiah(calc.sortingTotalAmount)}</span>
                                        </div>
                                    )}
                                    <div className="-mx-5 flex justify-between bg-muted/40 px-5 py-2 font-bold">
                                        <span>Total Kotor</span>
                                        <span>{formatRupiah(calc.grossTotalAmount)}</span>
                                    </div>
                                    {data.debt_paid_amount > 0 && (
                                        <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                            <span className="italic text-red-600">Bayar Hutang</span>
                                            <span className="font-bold text-red-600">-{formatRupiah(data.debt_paid_amount)}</span>
                                        </div>
                                    )}

                                    {/* Final Amount */}
                                    <div className="-mx-5 bg-foreground px-5 py-6 text-center text-background">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Total Diterima Petani</p>
                                        <p className="mt-1 text-3xl font-black">{formatRupiah(calc.finalPaidAmountRounded)}</p>
                                        {roundingMode !== 'none' && calc.finalPaidAmountRounded !== calc.finalPaidAmount && (
                                            <p className="mt-0.5 text-[10px] italic opacity-50">
                                                Dibulatkan dari {formatRupiah(calc.finalPaidAmount)}
                                            </p>
                                        )}
                                    </div>

                                    {data.debt_paid_amount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="italic text-muted-foreground">Sisa Hutang Petani</span>
                                            <span className="font-bold text-red-500">{formatRupiah(calc.remainingDebtAmount)}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={processing || !data.farmer_id || data.gross_weight <= data.tare_weight}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-black text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {processing ? 'Menyimpan...' : 'SIMPAN'}
                                    </button>
                                    {(!data.farmer_id || data.gross_weight <= data.tare_weight) && (
                                        <p className="text-center text-[10px] italic text-muted-foreground">
                                            {!data.farmer_id ? 'Pilih petani terlebih dahulu.' : 'Berat bruto harus lebih besar dari tara.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
