import { Head, Link } from '@inertiajs/react';
import { BarChart3, CreditCard, Scale, TrendingUp, Users } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { formatRupiah, formatKg } from '@/lib/utils';
import * as farmersRoute from '@/routes/farmers';
import * as weighingRoute from '@/routes/weighing';
import type { BreadcrumbItem, WeighingTransaction } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard Super Admin', href: '/dashboard/super-admin' },
];

interface MonthlyRevenue {
    month: string;
    total: number;
}

interface Props {
    stats: {
        totalFarmers: number;
        totalTransactionsToday: number;
        brutoWeightToday: number;
        nettoWeightToday: number;
        totalRevenueToday: number;
        totalDebt: number;
    };
    recentTransactions: WeighingTransaction[];
    monthlyRevenue: MonthlyRevenue[];
}

export default function SuperAdminDashboard({
    stats,
    recentTransactions,
    monthlyRevenue,
}: Props) {
    const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.total), 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Super Admin" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Dashboard Super Admin
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {[
                        {
                            label: 'Total Petani',
                            value: String(stats.totalFarmers),
                            icon: Users,
                            color: 'bg-blue-500',
                        },
                        {
                            label: 'Transaksi Hari Ini',
                            value: String(stats.totalTransactionsToday),
                            icon: Scale,
                            color: 'bg-purple-500',
                        },
                        {
                            label: 'Total Bruto Hari Ini',
                            value: formatKg(stats.brutoWeightToday),
                            icon: TrendingUp,
                            color: 'bg-emerald-500',
                        },
                        {
                            label: 'Total Neto Hari Ini',
                            value: formatKg(stats.nettoWeightToday),
                            icon: Scale,
                            color: 'bg-violet-500',
                        },
                        {
                            label: 'Revenue Hari Ini',
                            value: formatRupiah(stats.totalRevenueToday),
                            icon: TrendingUp,
                            color: 'bg-emerald-500',
                        },
                        {
                            label: 'Total Piutang',
                            value: formatRupiah(stats.totalDebt),
                            icon: CreditCard,
                            color: 'bg-red-500',
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                    {s.label}
                                </p>
                                <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}
                                >
                                    <s.icon className="h-4 w-4 text-white" />
                                </div>
                            </div>
                            <p className="font-mono text-xl font-bold text-foreground">
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Monthly Revenue Chart (simple bar) */}
                    <div className="rounded-xl border border-sidebar-border/50 bg-card p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <h2 className="font-semibold text-foreground">
                                Revenue 6 Bulan Terakhir
                            </h2>
                        </div>
                        {monthlyRevenue.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground italic">
                                Belum ada data.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {monthlyRevenue.map((m) => (
                                    <div
                                        key={m.month}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                                            {m.month}
                                        </span>
                                        <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted/40">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{
                                                    width: `${(m.total / maxRevenue) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-24 shrink-0 text-right font-mono text-xs font-semibold">
                                            {formatRupiah(m.total)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="rounded-xl border border-sidebar-border/50 bg-card">
                        <div className="flex items-center justify-between border-b border-sidebar-border/30 px-5 py-4">
                            <h2 className="font-semibold text-foreground">
                                Transaksi Terbaru
                            </h2>
                            <Link
                                href={weighingRoute.index()}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Lihat Semua
                            </Link>
                        </div>
                        <div className="divide-y divide-sidebar-border/20">
                            {recentTransactions.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground italic">
                                    Belum ada transaksi.
                                </p>
                            ) : (
                                recentTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/20"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                            {tx.farmer_name_snapshot.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">
                                                {tx.farmer_name_snapshot}
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {tx.nota_number}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-mono text-sm font-bold text-emerald-600">
                                                {formatRupiah(
                                                    tx.final_paid_amount_rounded,
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatKg(tx.net_weight)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        {
                            label: 'Data Petani',
                            href: farmersRoute.index(),
                            icon: Users,
                        },
                        {
                            label: 'Timbangan',
                            href: weighingRoute.index(),
                            icon: Scale,
                        },
                        {
                            label: 'Input Timbangan',
                            href: weighingRoute.create(),
                            icon: Scale,
                        },
                        {
                            label: 'Lihat Laporan',
                            href: '/reports',
                            icon: BarChart3,
                        },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-2.5 rounded-xl border border-sidebar-border/50 bg-card p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/20"
                        >
                            <item.icon className="h-4 w-4 text-primary" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
