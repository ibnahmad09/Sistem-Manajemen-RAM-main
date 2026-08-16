import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import * as farmersRoute from '@/routes/farmers';
import type { BreadcrumbItem, Farmer } from '@/types';

interface Props {
    farmer?: Farmer;
}

export default function FarmerForm({ farmer }: Props) {
    const isEditing = !!farmer;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Data Petani', href: '/farmers' },
        {
            title: isEditing ? 'Edit Petani' : 'Tambah Petani',
            href: isEditing ? `/farmers/${farmer.id}/edit` : '/farmers/create',
        },
    ];

    const { data, setData, post, put, processing, errors } = useForm({
        name: farmer?.name ?? '',
        phone: farmer?.phone ?? '',
        address: farmer?.address ?? '',
        status: (farmer?.status ?? 'active') as 'active' | 'inactive',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditing) {
            put(farmersRoute.update({ farmer: farmer.id }).url);
        } else {
            post(farmersRoute.store().url);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? 'Edit Petani' : 'Tambah Petani'} />

            <div className="p-6">
                <div className="mx-auto max-w-lg space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Link
                            href={farmersRoute.index()}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">
                                {isEditing
                                    ? 'Edit Petani'
                                    : 'Tambah Petani Baru'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {isEditing
                                    ? `Mengubah data ${farmer.name}`
                                    : 'Daftarkan petani baru ke sistem'}
                            </p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5 rounded-xl border border-sidebar-border/50 bg-card p-6 shadow-sm"
                    >
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">
                                Nama Petani{' '}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                placeholder="Masukkan nama lengkap..."
                                className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm transition outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">
                                No. Telepon
                            </label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                placeholder="0812xxxx..."
                                className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background px-3 text-sm transition outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.phone && (
                                <p className="text-xs text-red-500">
                                    {errors.phone}
                                </p>
                            )}
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">
                                Alamat
                            </label>
                            <textarea
                                value={data.address}
                                onChange={(e) =>
                                    setData('address', e.target.value)
                                }
                                placeholder="Alamat lengkap petani..."
                                rows={3}
                                className="w-full resize-none rounded-lg border border-sidebar-border/50 bg-background px-3 py-2 text-sm transition outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.address && (
                                <p className="text-xs text-red-500">
                                    {errors.address}
                                </p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">
                                Status
                            </label>
                            <div className="flex gap-3">
                                {(['active', 'inactive'] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setData('status', s)}
                                        className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                                            data.status === s
                                                ? s === 'active'
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : 'border-red-500 bg-red-500 text-white'
                                                : 'border-sidebar-border/50 text-muted-foreground hover:bg-muted/30'
                                        }`}
                                    >
                                        {s === 'active'
                                            ? '✓ Aktif'
                                            : '✗ Nonaktif'}
                                    </button>
                                ))}
                            </div>
                            {errors.status && (
                                <p className="text-xs text-red-500">
                                    {errors.status}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2">
                            <Link
                                href={farmersRoute.index()}
                                className="flex-1 rounded-lg border border-sidebar-border/50 py-2 text-center text-sm font-semibold text-muted-foreground transition hover:bg-muted/30"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {processing
                                    ? 'Menyimpan...'
                                    : isEditing
                                      ? 'Perbarui'
                                      : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
