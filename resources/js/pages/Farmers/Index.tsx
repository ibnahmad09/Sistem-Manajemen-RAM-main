import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, Pencil, Trash2, Phone, MapPin } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { formatRupiah, cn } from '@/lib/utils';
import * as farmersRoute from '@/routes/farmers';
import type {BreadcrumbItem, Farmer} from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Data Petani', href: '/farmers' },
];

interface Props {
    farmers: Farmer[];
}

export default function FarmersIndex({ farmers }: Props) {
    const [search, setSearch] = useState('');

    const filtered = farmers.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.address ?? '').toLowerCase().includes(search.toLowerCase()),
    );

    const handleDelete = (farmer: Farmer) => {
        if (!confirm(`Hapus petani "${farmer.name}"? Data transaksi terkait akan ikut terhapus.`)) {
return;
}

        router.delete(farmersRoute.destroy({ farmer: farmer.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Data Petani" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Data Petani</h1>
                        <p className="text-sm text-muted-foreground">{farmers.length} petani terdaftar</p>
                    </div>
                    <Link
                        href={farmersRoute.create()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Petani
                    </Link>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari nama atau alamat..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-lg border border-sidebar-border/50 bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/50 bg-card">
                    <table className="w-full text-sm">
                        <thead className="border-b border-sidebar-border/30 bg-muted/30">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Petani
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Kontak
                                </th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Status
                                </th>
                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Saldo Hutang
                                </th>
                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sidebar-border/20">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground italic">
                                        {search ? 'Petani tidak ditemukan.' : 'Belum ada petani terdaftar.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((farmer) => (
                                    <tr key={farmer.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                                    {farmer.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-foreground">{farmer.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-muted-foreground">
                                            <div className="space-y-0.5">
                                                {farmer.phone && (
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Phone className="h-3 w-3" />
                                                        {farmer.phone}
                                                    </div>
                                                )}
                                                {farmer.address && (
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <MapPin className="h-3 w-3" />
                                                        <span className="max-w-[200px] truncate">{farmer.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                                    farmer.status === 'active'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                                )}
                                            >
                                                {farmer.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span
                                                className={cn(
                                                    'font-mono text-sm font-bold',
                                                    farmer.balance > 0 ? 'text-red-600' : 'text-emerald-600',
                                                )}
                                            >
                                                {formatRupiah(farmer.balance)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link
                                                    href={farmersRoute.edit({ farmer: farmer.id })}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(farmer)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border/50 text-muted-foreground hover:border-red-500/50 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filtered.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Menampilkan {filtered.length} dari {farmers.length} petani
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
