import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Calculator,
    FileText,
    Plus,
    Save,
    Scale,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CurrencyInput from '@/components/currency-input';
import AppLayout from '@/layouts/app-layout';
import {
    calculateLoads,
    formatKgTrimmed,
    formatRupiah,
    parseNumber,
} from '@/lib/utils';
import type { LoadInput } from '@/lib/utils';
import * as farmersRoute from '@/routes/farmers';
import * as weighingRoute from '@/routes/weighing';
import type {
    BreadcrumbItem,
    DeductionConfig,
    Farmer,
    PalmPrice,
    WeighingTransaction,
} from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Timbangan', href: '/weighing' },
    { title: 'Input Baru', href: '/weighing/create' },
];

interface Props {
    farmers: Farmer[];
    latestPrice: PalmPrice | null;
    deductionConfig: DeductionConfig | null;
    roundingMode: string;
    draft?: WeighingTransaction | null;
    activeDrafts?: WeighingTransaction[];
}

function NumberInput({
    label,
    value,
    onChange,
    placeholder = '0',
    step = '0.01',
    required = false,
    className = '',
    error,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    step?: string;
    required?: boolean;
    className?: string;
    error?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="number"
                step={step}
                min="0"
                value={value || ''}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                placeholder={placeholder}
                className={`h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 font-mono text-sm transition outline-none focus:ring-2 focus:ring-primary ${className}`}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function emptyLoad(): LoadInput {
    return {
        gross_weight: 0,
        tare_weight: 0,
        has_sorting: false,
        sorting_weight: 0,
    };
}

export default function WeighingForm({
    farmers,
    latestPrice,
    deductionConfig,
    roundingMode,
    draft = null,
    activeDrafts = [],
}: Props) {
    const [currentDebt, setCurrentDebt] = useState(0);
    const [loadingDebt, setLoadingDebt] = useState(false);
    const actionRef = useRef<'save_draft' | 'finalize'>('finalize');

    const form = useForm({
        farmer_id: draft ? String(draft.farmer_id) : '',
        transaction_date: draft
            ? draft.transaction_date.slice(0, 10)
            : new Date().toISOString().split('T')[0],
        loads: draft?.loads?.length
            ? draft.loads.map((l) => ({
                  gross_weight: Number(l.gross_weight),
                  tare_weight: Number(l.tare_weight),
                  has_sorting: l.has_sorting,
                  sorting_weight: Number(l.sorting_weight),
              }))
            : [emptyLoad()],
        has_deduction: draft ? draft.has_deduction : true,
        deduction_percentage: draft
            ? Number(draft.deduction_percentage)
            : (deductionConfig?.percentage ?? 5),
        palm_price_per_kg: draft
            ? Number(draft.palm_price_per_kg)
            : (latestPrice?.price_per_kg ?? 0),
        sorting_price_per_kg: draft ? Number(draft.sorting_price_per_kg) : 0,
        debt_paid_amount: 0,
        payment_method: (draft ? draft.payment_method : 'cash') as
            | 'cash'
            | 'transfer',
    });

    useEffect(() => {
        form.transform((formData) => ({
            ...formData,
            action: actionRef.current,
        }));
    }, [form]);

    const { data, setData, post, put, processing, errors } = form;

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

    useEffect(() => {
        if (draft) {
            setTimeout(() => fetchDebt(String(draft.farmer_id)), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const calc = useMemo(
        () =>
            calculateLoads(data.loads, {
                hasDeduction: data.has_deduction,
                deductionPercentage: data.deduction_percentage,
                palmPricePerKg: data.palm_price_per_kg,
                sortingPricePerKg: data.sorting_price_per_kg,
                previousDebtAmount: currentDebt,
                debtPaidAmount: data.debt_paid_amount,
                roundingMode,
            }),
        [data, currentDebt, roundingMode],
    );

    const hasInvalidLoad = data.loads.some(
        (l) => l.gross_weight <= l.tare_weight,
    );
    const draftOfSelectedFarmer = activeDrafts.find(
        (d) => d.farmer_id === Number(data.farmer_id),
    );
    const isEditingDraft = !!draft;
    const showDraftConflict =
        !isEditingDraft &&
        !!draftOfSelectedFarmer &&
        draftOfSelectedFarmer.farmer_id === Number(data.farmer_id);

    const updateLoad = (index: number, patch: Partial<LoadInput>) => {
        setData(
            'loads',
            data.loads.map((l, i) => (i === index ? { ...l, ...patch } : l)),
        );
    };

    const addLoad = () => {
        setData('loads', [...data.loads, emptyLoad()]);
    };

    const removeLoad = (index: number) => {
        if (data.loads.length <= 1) {
            return;
        }

        setData(
            'loads',
            data.loads.filter((_, i) => i !== index),
        );
    };

    const submit = (action: 'save_draft' | 'finalize') => {
        actionRef.current = action;

        if (draft) {
            put(weighingRoute.update(draft.id).url);
        } else {
            post(weighingRoute.store().url);
        }
    };

    const submitDisabled = processing || !data.farmer_id || hasInvalidLoad;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Input Timbangan" />

            <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                    <Link
                        href={weighingRoute.index()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                            <Scale className="h-5 w-5 text-primary" />
                            {isEditingDraft
                                ? 'Lanjutkan Draft'
                                : 'Input Timbangan Baru'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Harga aktif:{' '}
                            <span className="font-semibold text-foreground">
                                {latestPrice
                                    ? formatRupiah(latestPrice.price_per_kg) +
                                      '/kg'
                                    : 'Belum ada harga'}
                            </span>
                        </p>
                    </div>
                </div>

                {isEditingDraft && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Sedang mengerjakan <b>draft</b> milik{' '}
                            <b>{draft.farmer_name_snapshot}</b>. Muatan belum
                            tercetak menjadi nota. Klik{' '}
                            <b>Selesai &amp; Cetak</b> untuk menyelesaikan dan
                            mencetak nota.
                        </p>
                    </div>
                )}

                {showDraftConflict && (
                    <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                        <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Petani ini sudah punya <b>draft aktif</b>.
                                Lanjutkan draft tersebut atau batalkan dulu
                                sebelum membuat yang baru.
                            </p>
                        </div>
                        <Link
                            href={
                                weighingRoute.create({
                                    query: { draft: draftOfSelectedFarmer.id },
                                }).url
                            }
                            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                        >
                            Lanjutkan Draft
                        </Link>
                    </div>
                )}

                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        {/* ── LEFT: Form Inputs ── */}
                        <div className="space-y-5 xl:col-span-2">
                            {/* Data Utama */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                                    Data Utama
                                </h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">
                                            Pilih Petani{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={data.farmer_id}
                                            onChange={(e) => {
                                                setData(
                                                    'farmer_id',
                                                    e.target.value,
                                                );
                                                setData('debt_paid_amount', 0);
                                                fetchDebt(e.target.value);
                                            }}
                                            className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm transition outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">
                                                -- Pilih Petani --
                                            </option>
                                            {farmers.map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name}
                                                    {f.address
                                                        ? ` — ${f.address}`
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.farmer_id && (
                                            <p className="text-xs text-red-500">
                                                {errors.farmer_id}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">
                                            Tanggal Transaksi
                                        </label>
                                        <input
                                            type="date"
                                            value={data.transaction_date}
                                            onChange={(e) =>
                                                setData(
                                                    'transaction_date',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm transition outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Muatan (Hasil Timbangan) */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                                        Hasil Timbangan (Muatan)
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={addLoad}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border/50 px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted/30"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Tambah Muatan
                                    </button>
                                </div>

                                {errors.loads && (
                                    <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
                                        {errors.loads}
                                    </p>
                                )}

                                <div className="space-y-4">
                                    {data.loads.map((load, i) => {
                                        const perLoad = calc.perLoad[i];

                                        return (
                                            <div
                                                key={i}
                                                className="rounded-lg border border-sidebar-border/50 p-4"
                                            >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <p className="text-sm font-bold text-foreground">
                                                        Muatan #{i + 1}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">
                                                            Netto:{' '}
                                                            <b className="text-foreground">
                                                                {formatKgTrimmed(
                                                                    perLoad?.netWeight ??
                                                                        0,
                                                                )}
                                                            </b>
                                                        </span>
                                                        {data.loads.length >
                                                            1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeLoad(
                                                                        i,
                                                                    )
                                                                }
                                                                className="rounded p-1 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                title="Hapus muatan"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                                    <NumberInput
                                                        label="Bruto (kg)"
                                                        value={
                                                            load.gross_weight
                                                        }
                                                        onChange={(v) =>
                                                            updateLoad(i, {
                                                                gross_weight: v,
                                                            })
                                                        }
                                                        required
                                                        step="5"
                                                        className="text-lg font-bold"
                                                    />
                                                    <NumberInput
                                                        label="Tara (kg)"
                                                        value={load.tare_weight}
                                                        onChange={(v) =>
                                                            updateLoad(i, {
                                                                tare_weight: v,
                                                            })
                                                        }
                                                        required
                                                        step="5"
                                                        className="text-lg font-bold"
                                                    />
                                                    <div className="space-y-2 md:col-span-2">
                                                        <div className="flex h-10 items-center gap-2 rounded-lg border border-sidebar-border/50 px-3">
                                                            <input
                                                                type="checkbox"
                                                                id={`has_sorting_${i}`}
                                                                checked={
                                                                    load.has_sorting
                                                                }
                                                                onChange={(e) =>
                                                                    updateLoad(
                                                                        i,
                                                                        {
                                                                            has_sorting:
                                                                                e
                                                                                    .target
                                                                                    .checked,
                                                                            sorting_weight: 0,
                                                                        },
                                                                    )
                                                                }
                                                                className="h-4 w-4 accent-primary"
                                                            />
                                                            <label
                                                                htmlFor={`has_sorting_${i}`}
                                                                className="cursor-pointer text-sm font-medium"
                                                            >
                                                                Ada Sortiran
                                                            </label>
                                                        </div>
                                                        {load.has_sorting && (
                                                            <NumberInput
                                                                label="Berat Sortiran (kg)"
                                                                value={
                                                                    load.sorting_weight
                                                                }
                                                                onChange={(v) =>
                                                                    updateLoad(
                                                                        i,
                                                                        {
                                                                            sorting_weight:
                                                                                v,
                                                                        },
                                                                    )
                                                                }
                                                                step="5"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Potongan & Harga */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                                    Potongan & Harga
                                </h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-lg border border-sidebar-border/50 p-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="has_deduction"
                                                    checked={data.has_deduction}
                                                    onChange={(e) =>
                                                        setData(
                                                            'has_deduction',
                                                            e.target.checked,
                                                        )
                                                    }
                                                    className="h-4 w-4 accent-primary"
                                                />
                                                <label
                                                    htmlFor="has_deduction"
                                                    className="cursor-pointer text-sm font-medium"
                                                >
                                                    Potongan Wajib
                                                </label>
                                            </div>
                                            {data.has_deduction && (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        value={
                                                            data.deduction_percentage
                                                        }
                                                        onChange={(e) =>
                                                            setData(
                                                                'deduction_percentage',
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ) || 0,
                                                            )
                                                        }
                                                        className="h-8 w-14 rounded border border-sidebar-border/50 bg-background text-center text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        %
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <CurrencyInput
                                            label="Harga Sawit per KG (Rp)"
                                            value={data.palm_price_per_kg}
                                            onChange={(v) =>
                                                setData(
                                                    'palm_price_per_kg',
                                                    parseNumber(v),
                                                )
                                            }
                                            error={errors.palm_price_per_kg}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <CurrencyInput
                                            label="Harga Sortiran per KG (Rp)"
                                            value={data.sorting_price_per_kg}
                                            onChange={(v) =>
                                                setData(
                                                    'sorting_price_per_kg',
                                                    parseNumber(v),
                                                )
                                            }
                                            error={errors.sorting_price_per_kg}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Harga sortiran berlaku untuk semua
                                            muatan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Pembayaran & Hutang */}
                            <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                                    Pembayaran & Hutang
                                </h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
                                            <p className="text-xs font-bold tracking-widest text-red-600 uppercase dark:text-red-400">
                                                {loadingDebt
                                                    ? 'Memuat...'
                                                    : 'Hutang Tersedia'}
                                            </p>
                                            <p className="mt-1 font-mono text-xl font-black text-red-700 dark:text-red-400">
                                                {formatRupiah(currentDebt)}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">
                                                Bayar Hutang Hari Ini
                                            </label>
                                            <CurrencyInput
                                                value={data.debt_paid_amount}
                                                onChange={(raw) => {
                                                    const val =
                                                        parseNumber(raw);
                                                    setData(
                                                        'debt_paid_amount',
                                                        Math.min(
                                                            val,
                                                            currentDebt,
                                                            calc.grossTotalAmount,
                                                        ),
                                                    );
                                                }}
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Maks:{' '}
                                                {formatRupiah(
                                                    Math.min(
                                                        currentDebt,
                                                        calc.grossTotalAmount,
                                                    ),
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">
                                                Metode Pembayaran
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(
                                                    [
                                                        'cash',
                                                        'transfer',
                                                    ] as const
                                                ).map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'payment_method',
                                                                m,
                                                            )
                                                        }
                                                        className={`rounded-lg border py-2.5 text-sm font-bold transition ${
                                                            data.payment_method ===
                                                            m
                                                                ? 'border-primary bg-primary text-primary-foreground'
                                                                : 'border-sidebar-border/50 text-muted-foreground hover:bg-muted/30'
                                                        }`}
                                                    >
                                                        {m === 'cash'
                                                            ? '💵 Tunai'
                                                            : '🏦 Transfer'}
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
                                    <h3 className="font-bold text-background italic">
                                        Kalkulasi Pembayaran
                                    </h3>
                                    <Calculator className="h-4 w-4 text-background/50" />
                                </div>

                                <div className="space-y-3 p-5 font-mono text-sm">
                                    <div className="space-y-1 border-b border-sidebar-border/30 pb-2">
                                        {calc.perLoad.map((pl) => (
                                            <div
                                                key={pl.seqNo}
                                                className="flex justify-between text-xs"
                                            >
                                                <span className="text-muted-foreground italic">
                                                    Muatan #{pl.seqNo} (
                                                    {formatKgTrimmed(
                                                        pl.netWeight,
                                                    )}
                                                    )
                                                </span>
                                                <span className="font-bold">
                                                    {formatRupiah(
                                                        pl.netWeight *
                                                            data.palm_price_per_kg +
                                                            pl.sortingTotalAmount,
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                        <span className="text-muted-foreground italic">
                                            Netto Kotor (total)
                                        </span>
                                        <span className="font-bold">
                                            {formatKgTrimmed(
                                                calc.initialWeight,
                                            )}
                                        </span>
                                    </div>
                                    {data.has_deduction && (
                                        <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                            <span className="text-red-500 italic">
                                                Potongan{' '}
                                                {data.deduction_percentage}%
                                            </span>
                                            <span className="font-bold text-red-500">
                                                -
                                                {formatKgTrimmed(
                                                    calc.deductionWeight,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                        <span className="text-emerald-600 italic">
                                            Netto Bersih
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                            {formatKgTrimmed(calc.netWeight)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                        <span className="text-muted-foreground italic">
                                            Total Sawit
                                        </span>
                                        <span className="font-bold">
                                            {formatRupiah(calc.palmTotalAmount)}
                                        </span>
                                    </div>
                                    {calc.hasSorting && (
                                        <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                            <span className="text-muted-foreground italic">
                                                Total Sortiran
                                            </span>
                                            <span className="font-bold text-emerald-600">
                                                +
                                                {formatRupiah(
                                                    calc.sortingTotalAmount,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="-mx-5 flex justify-between bg-muted/40 px-5 py-2 font-bold">
                                        <span>Total Kotor</span>
                                        <span>
                                            {formatRupiah(
                                                calc.grossTotalAmount,
                                            )}
                                        </span>
                                    </div>
                                    {data.debt_paid_amount > 0 && (
                                        <div className="flex justify-between border-b border-sidebar-border/30 pb-2">
                                            <span className="text-red-600 italic">
                                                Bayar Hutang
                                            </span>
                                            <span className="font-bold text-red-600">
                                                -
                                                {formatRupiah(
                                                    data.debt_paid_amount,
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {/* Final Amount */}
                                    <div className="-mx-5 bg-foreground px-5 py-6 text-center text-background">
                                        <p className="text-[10px] font-bold tracking-widest uppercase opacity-50">
                                            Total Diterima Petani
                                        </p>
                                        <p className="mt-1 text-3xl font-black">
                                            {formatRupiah(
                                                calc.finalPaidAmountRounded,
                                            )}
                                        </p>
                                        {roundingMode !== 'none' &&
                                            calc.finalPaidAmountRounded !==
                                                calc.finalPaidAmount && (
                                                <p className="mt-0.5 text-[10px] italic opacity-50">
                                                    Dibulatkan dari{' '}
                                                    {formatRupiah(
                                                        calc.finalPaidAmount,
                                                    )}
                                                </p>
                                            )}
                                    </div>

                                    {data.debt_paid_amount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground italic">
                                                Sisa Hutang Petani
                                            </span>
                                            <span className="font-bold text-red-500">
                                                {formatRupiah(
                                                    calc.remainingDebtAmount,
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => submit('finalize')}
                                        disabled={submitDisabled}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-black text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {processing
                                            ? 'Menyimpan...'
                                            : 'SELESAI & CETAK'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => submit('save_draft')}
                                        disabled={processing || !data.farmer_id}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border/50 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted/30 disabled:opacity-50"
                                    >
                                        <FileText className="h-4 w-4" />
                                        SIMPAN DRAFT
                                    </button>
                                    {!data.farmer_id || hasInvalidLoad ? (
                                        <p className="text-center text-[10px] text-muted-foreground italic">
                                            {!data.farmer_id
                                                ? 'Pilih petani terlebih dahulu.'
                                                : 'Berat bruto tiap muatan harus lebih besar dari tara.'}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
