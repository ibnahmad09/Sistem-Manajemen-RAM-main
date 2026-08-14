import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    CreditCard,
    DollarSign,
    LayoutGrid,
    Scale,
    Users,
    Wheat,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { PrinterConnectButton } from '@/components/printer-connect-button';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import * as cashFlowRoute from '@/routes/cash-flow';
import * as debtsRoute from '@/routes/debts';
import * as farmersRoute from '@/routes/farmers';
import * as palmPricesRoute from '@/routes/palm-prices';
import * as reportsRoute from '@/routes/reports';
import * as weighingRoute from '@/routes/weighing';
import type { NavItem } from '@/types';

function useNavItems(): NavItem[] {
    const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
    const role = auth?.user?.role;

    const commonItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    const cashierItems: NavItem[] = [
        {
            title: 'Input Timbangan',
            href: weighingRoute.create(),
            icon: Scale,
        },
        {
            title: 'Riwayat Timbangan',
            href: weighingRoute.index(),
            icon: BookOpen,
        },
        {
            title: 'Data Petani',
            href: farmersRoute.index(),
            icon: Users,
        },
        {
            title: 'Hutang Petani',
            href: debtsRoute.index(),
            icon: CreditCard,
        },
        {
            title: 'Harga Sawit',
            href: palmPricesRoute.index(),
            icon: Wheat,
        },
        {
            title: 'Arus Kas',
            href: cashFlowRoute.index(),
            icon: DollarSign,
        },
    ];

    const ownerItems: NavItem[] = [
        {
            title: 'Laporan',
            href: reportsRoute.index(),
            icon: BarChart3,
        },
    ];

    if (role === 'super_admin') {
        return [...commonItems, ...cashierItems, ...ownerItems];
    } else if (role === 'cashier') {
        return [...commonItems, ...cashierItems];
    } else if (role === 'owner') {
        return [...commonItems, ...ownerItems];
    }

    return commonItems;
}

export function AppSidebar() {
    const navItems = useNavItems();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <PrinterConnectButton />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
