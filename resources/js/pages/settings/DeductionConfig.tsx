import { Head, useForm } from '@inertiajs/react';
import { Percent, Save } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, DeductionConfig } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pengaturan Potongan', href: '/deduction-config' },
];

interface Props {
    config: DeductionConfig | null;
}

export default function DeductionConfigPage({ config }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        percentage: config?.percentage?.toString() ?? '5',
        note: config?.note ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/deduction-config');
    };

    const currentPercentage = parseFloat(data.percentage) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Potongan" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Pengaturan Potongan Wajib
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Atur persentase potongan yang otomatis diterapkan saat
                        input timbangan
                    </p>
                </div>

                {/* Active Config Banner */}
                <div className="flex items-center gap-5 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Percent className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold tracking-widest text-blue-700 uppercase dark:text-blue-400">
                            Potongan Aktif Saat Ini
                        </p>
                        <p className="font-mono text-3xl font-black text-blue-800 dark:text-blue-300">
                            {currentPercentage.toFixed(2)}
                            <span className="text-base font-normal">%</span>
                        </p>
                        {config?.note && (
                            <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-500">
                                {config.note}
                            </p>
                        )}
                    </div>
                </div>

                {/* Config Form */}
                <div className="rounded-xl border border-sidebar-border/50 bg-card p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">
                                Persentase Potongan (%){' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={data.percentage}
                                onChange={(e) =>
                                    setData('percentage', e.target.value)
                                }
                                required
                                className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                placeholder="3.00"
                            />
                            {errors.percentage && (
                                <p className="text-xs text-red-500">
                                    {errors.percentage}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Contoh: 3.00 berarti potongan 3% dari berat
                                kotor
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">
                                Catatan
                            </label>
                            <input
                                type="text"
                                value={data.note}
                                onChange={(e) =>
                                    setData('note', e.target.value)
                                }
                                placeholder="Keterangan potongan..."
                                className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {processing
                                    ? 'Menyimpan...'
                                    : 'Simpan Pengaturan'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Info Box */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                    <div className="flex items-start gap-3">
                        <Percent className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-semibold">Catatan Penting:</p>
                            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                                <li>
                                    Pengaturan ini akan otomatis diterapkan saat
                                    membuat transaksi timbangan baru
                                </li>
                                <li>
                                    Kasir masih bisa mengubah persentase
                                    potongan per transaksi jika diperlukan
                                </li>
                                <li>
                                    Transaksi yang sudah tersimpan tidak akan
                                    terpengaruh oleh perubahan pengaturan ini
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
