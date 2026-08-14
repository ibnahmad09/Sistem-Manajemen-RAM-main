import { Head, Link } from '@inertiajs/react';
import { Scale, Users, CreditCard, DollarSign, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Farmer, type WeighingTransaction } from '@/types';
import { formatRupiah, formatKg } from '@/lib/utils';
import * as weighingRoute from '@/routes/weighing';
import * as farmersRoute from '@/routes/farmers';
import * as debtsRoute from '@/routes/debts';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard Kasir', href: '/dashboard/cashier' },
];

interface Props {
    stats: {
        transactionsToday: number;
        revenueToday: number;
        cashOutToday: number;
        cashBalance: number;
    };
    recentTransactions: (WeighingTransaction & { farmer: Farmer })[];
    farmersWithDebt: Farmer[];
}

function StatCard({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
}) {
    return (
        <div className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
            </div>
            <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
    );
}

export default function CashierDashboard({ stats, recentTransactions, farmersWithDebt }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Kasir" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Dashboard Kasir</h1>
                        <p className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

                {/* Stat Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Transaksi Hari Ini"
                        value={String(stats.transactionsToday)}
                        icon={Scale}
                        color="bg-blue-500"
                        subtitle="timbangan"
                    />
                    <StatCard
                        title="Total Bruto Hari Ini"
                        value={formatRupiah(stats.revenueToday)}
                        icon={TrendingUp}
                        color="bg-emerald-500"
                    />
                    <StatCard
                        title="Total Dibayarkan"
                        value={formatRupiah(stats.cashOutToday)}
                        icon={DollarSign}
                        color="bg-orange-500"
                        subtitle="ke petani"
                    />
                    <StatCard
                        title="Saldo Kas"
                        value={formatRupiah(stats.cashBalance)}
                        icon={DollarSign}
                        color={stats.cashBalance >= 0 ? 'bg-green-600' : 'bg-red-500'}
                        subtitle={stats.cashBalance >= 0 ? 'tersedia' : 'defisit'}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Recent Transactions */}
                    <div className="lg:col-span-2">
                        <div className="rounded-xl border border-sidebar-border/50 bg-card">
                            <div className="flex items-center justify-between border-b border-sidebar-border/30 px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="font-semibold text-foreground">Transaksi Terbaru</h2>
                                </div>
                                <Link
                                    href={weighingRoute.index()}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Lihat Semua <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y divide-sidebar-border/20">
                                {recentTransactions.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-muted-foreground italic">
                                        Belum ada transaksi hari ini.
                                    </div>
                                ) : (
                                    recentTransactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                                                {tx.farmer_name_snapshot.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">{tx.farmer_name_snapshot}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{tx.nota_number}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold font-mono text-emerald-600">
                                                    {formatRupiah(tx.final_paid_amount_rounded)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{formatKg(tx.net_weight)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Farmers with Debt */}
                    <div>
                        <div className="rounded-xl border border-sidebar-border/50 bg-card">
                            <div className="flex items-center justify-between border-b border-sidebar-border/30 px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-red-500" />
                                    <h2 className="font-semibold text-foreground">Petani Berhutang</h2>
                                </div>
                                <Link
                                    href={debtsRoute.index()}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Kelola <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y divide-sidebar-border/20">
                                {farmersWithDebt.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-muted-foreground italic">
                                        Tidak ada petani berhutang 🎉
                                    </div>
                                ) : (
                                    farmersWithDebt.map((farmer) => (
                                        <div key={farmer.id} className="flex items-center justify-between px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/30">
                                                    {farmer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{farmer.name}</p>
                                                    <p className="text-xs text-muted-foreground">{farmer.address ?? '-'}</p>
                                                </div>
                                            </div>
                                            <p className="font-mono text-sm font-bold text-red-600">
                                                {formatRupiah(farmer.balance)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-4 rounded-xl border border-sidebar-border/50 bg-card p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Aksi Cepat</p>
                            <div className="space-y-2">
                                <Link
                                    href={weighingRoute.create()}
                                    className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                                >
                                    <Scale className="h-4 w-4 text-blue-500" />
                                    Input Timbangan Baru
                                </Link>
                                <Link
                                    href={farmersRoute.index()}
                                    className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                                >
                                    <Users className="h-4 w-4 text-emerald-500" />
                                    Kelola Petani
                                </Link>
                                <Link
                                    href={debtsRoute.index()}
                                    className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                                >
                                    <CreditCard className="h-4 w-4 text-red-500" />
                                    Manajemen Hutang
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
