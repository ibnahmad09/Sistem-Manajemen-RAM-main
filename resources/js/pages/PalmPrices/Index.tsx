import { Head, useForm } from '@inertiajs/react';
import { Plus, Wheat, X } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PalmPrice } from '@/types';
import { formatRupiah } from '@/lib/utils';
import * as palmPricesRoute from '@/routes/palm-prices';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Harga Sawit', href: '/palm-prices' },
];

interface Props {
    prices: (PalmPrice & { creator: { id: number; name: string } })[];
}

export default function PalmPricesIndex({ prices }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const latestPrice = prices[0] ?? null;

    const { data, setData, post, processing, reset, errors } = useForm({
        price_per_kg: '',
        effective_date: new Date().toISOString().split('T')[0],
        note: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(palmPricesRoute.store(), {
            onSuccess: () => { setIsModalOpen(false); reset(); },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Harga Sawit" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Manajemen Harga Sawit</h1>
                        <p className="text-sm text-muted-foreground">{prices.length} riwayat harga tercatat</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Harga Baru
                    </button>
                </div>

                {/* Active Price Banner */}
                {latestPrice && (
                    <div className="flex items-center gap-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <Wheat className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Harga Aktif Saat Ini</p>
                            <p className="font-mono text-3xl font-black text-emerald-800 dark:text-emerald-300">
                                {formatRupiah(latestPrice.price_per_kg)}<span className="text-base font-normal">/kg</span>
                            </p>
                            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-500">
                                Berlaku sejak{' '}
                                {new Date(latestPrice.effective_date).toLocaleDateString('id-ID', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Price History Table */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card">
                    <table className="w-full text-sm">
                        <thead className="border-b border-sidebar-border/30 bg-muted/30">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">#</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harga/Kg</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tanggal Efektif</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Catatan</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dibuat Oleh</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sidebar-border/20">
                            {prices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-sm italic text-muted-foreground">
                                        Belum ada data harga sawit.
                                    </td>
                                </tr>
                            ) : (
                                prices.map((price, i) => (
                                    <tr key={price.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                                        <td className="px-5 py-3">
                                            <span className="font-mono text-base font-bold text-foreground">
                                                {formatRupiah(price.price_per_kg)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {new Date(price.effective_date).toLocaleDateString('id-ID', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground italic">
                                            {price.note ?? '—'}
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {price.creator?.name ?? '—'}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {i === 0 ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    ✓ Aktif
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Riwayat</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Add Price Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-sidebar-border/30 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Wheat className="h-5 w-5 text-emerald-500" />
                                <h2 className="font-bold text-foreground">Tambah Harga Baru</h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Harga per KG (Rp) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={data.price_per_kg}
                                    onChange={(e) => setData('price_per_kg', e.target.value)}
                                    required
                                    min="0"
                                    step="50"
                                    placeholder="0"
                                    className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                                {errors.price_per_kg && <p className="text-xs text-red-500">{errors.price_per_kg}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Tanggal Efektif <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={data.effective_date}
                                    onChange={(e) => setData('effective_date', e.target.value)}
                                    required
                                    className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Catatan</label>
                                <input
                                    type="text"
                                    value={data.note}
                                    onChange={(e) => setData('note', e.target.value)}
                                    placeholder="Keterangan harga ini..."
                                    className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-lg border border-sidebar-border/50 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan Harga'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
