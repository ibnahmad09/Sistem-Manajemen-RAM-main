import { Head } from '@inertiajs/react';
import { BarChart3, DollarSign, Scale, TrendingDown } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { formatRupiah } from '@/lib/utils';
import type {BreadcrumbItem} from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard Owner', href: '/dashboard/owner' },
];

interface MonthlyRevenue {
    month: string;
    revenue: number;
    paid_out: number;
    transactions: number;
}

interface TopFarmer {
    farmer_id: number;
    farmer_name_snapshot: string;
    transaction_count: number;
    total_revenue: number;
}

interface Props {
    stats: {
        totalRevenue: number;
        totalPaidOut: number;
        totalTransactions: number;
        totalDebt: number;
    };
    monthlyRevenue: MonthlyRevenue[];
    topFarmers: TopFarmer[];
}

export default function OwnerDashboard({ stats, monthlyRevenue, topFarmers }: Props) {
    const margin = stats.totalRevenue > 0
        ? ((stats.totalRevenue - stats.totalPaidOut) / stats.totalRevenue * 100).toFixed(1)
        : '0';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Owner" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard Owner</h1>
                    <p className="text-sm text-muted-foreground">Ringkasan keuangan dan performa RAM</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        { label: 'Total Revenue', value: formatRupiah(stats.totalRevenue), icon: TrendingDown, color: 'bg-emerald-500', sub: 'semua waktu' },
                        { label: 'Total Dibayarkan', value: formatRupiah(stats.totalPaidOut), icon: DollarSign, color: 'bg-orange-500', sub: 'ke petani' },
                        { label: 'Total Transaksi', value: String(stats.totalTransactions), icon: Scale, color: 'bg-blue-500', sub: 'timbangan' },
                        { label: 'Total Piutang', value: formatRupiah(stats.totalDebt), icon: BarChart3, color: 'bg-red-500', sub: `margin ~${margin}%` },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-sidebar-border/50 bg-card p-5 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                                    <s.icon className="h-4 w-4 text-white" />
                                </div>
                            </div>
                            <p className="font-mono text-lg font-bold text-foreground">{s.value}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Monthly Revenue Table */}
                    <div className="rounded-xl border border-sidebar-border/50 bg-card">
                        <div className="border-b border-sidebar-border/30 px-5 py-4">
                            <h2 className="font-semibold text-foreground">Laporan Bulanan</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-sidebar-border/30 bg-muted/30">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bulan</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Transaksi</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Revenue</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dibayar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/20">
                                    {monthlyRevenue.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-10 text-center text-sm italic text-muted-foreground">
                                                Belum ada data.
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlyRevenue.map((m) => (
                                            <tr key={m.month} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-2.5 font-mono text-sm font-semibold">{m.month}</td>
                                                <td className="px-5 py-2.5 text-right text-muted-foreground">{m.transactions}x</td>
                                                <td className="px-5 py-2.5 text-right font-mono font-semibold text-emerald-600">{formatRupiah(m.revenue)}</td>
                                                <td className="px-5 py-2.5 text-right font-mono text-muted-foreground">{formatRupiah(m.paid_out)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Farmers */}
                    <div className="rounded-xl border border-sidebar-border/50 bg-card">
                        <div className="border-b border-sidebar-border/30 px-5 py-4">
                            <h2 className="font-semibold text-foreground">Top Petani by Revenue</h2>
                        </div>
                        <div className="divide-y divide-sidebar-border/20">
                            {topFarmers.length === 0 ? (
                                <p className="py-10 text-center text-sm italic text-muted-foreground">Belum ada data.</p>
                            ) : (
                                topFarmers.map((f, i) => (
                                    <div key={f.farmer_id} className="flex items-center gap-4 px-5 py-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">{f.farmer_name_snapshot}</p>
                                            <p className="text-xs text-muted-foreground">{f.transaction_count} transaksi</p>
                                        </div>
                                        <span className="font-mono text-sm font-bold text-emerald-600 shrink-0">
                                            {formatRupiah(f.total_revenue)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
