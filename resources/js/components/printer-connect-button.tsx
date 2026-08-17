import {
    Bluetooth,
    BluetoothConnected,
    BluetoothSearching,
    Bug,
    Check,
    Plus,
    Trash2,
    Printer,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePrinter } from '@/hooks/use-printer';

export function PrinterConnectButton() {
    const {
        status,
        isSupported,
        activePrinter,
        pairedDevices,
        connect,
        disconnect,
        setActivePrinter,
        forgetPrinter,
        isConnecting,
        isDebugMode,
        toggleDebug,
    } = usePrinter();
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    if (!isSupported) {
        return null;
    }

    const Icon = isConnecting
        ? BluetoothSearching
        : status === 'connected'
          ? BluetoothConnected
          : Bluetooth;
    const label = isConnecting
        ? 'Menghubungkan...'
        : status === 'connected'
          ? (activePrinter?.name ?? 'Printer')
          : 'Hubungkan Printer';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                        >
                            <Icon
                                className={`size-4 ${status === 'connected' ? 'text-emerald-400' : ''}`}
                            />
                            <span className="truncate">{label}</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Printer className="size-4" />
                                <span>Printer Thermal</span>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        {status === 'connected' && (
                            <>
                                <div className="px-2 py-1.5">
                                    <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1.5 text-xs dark:bg-emerald-900/20">
                                        <BluetoothConnected className="size-3 shrink-0 text-emerald-600" />
                                        <span className="truncate font-medium text-emerald-700 dark:text-emerald-400">
                                            {activePrinter?.name}
                                        </span>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                            </>
                        )}

                        {pairedDevices.length > 0 && (
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
                                    Tersimpan
                                </DropdownMenuLabel>
                                {pairedDevices.map((device) => (
                                    <DropdownMenuItem
                                        key={device.id}
                                        className="flex cursor-pointer items-center justify-between"
                                        onClick={() => {
                                            if (
                                                device.id ===
                                                    activePrinter?.id &&
                                                status === 'connected'
                                            ) {
                                                disconnect();
                                            } else {
                                                setActivePrinter(device.id);
                                            }
                                        }}
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            {device.id === activePrinter?.id &&
                                            status === 'connected' ? (
                                                <Check className="size-3 shrink-0 text-emerald-600" />
                                            ) : (
                                                <Bluetooth className="size-3 shrink-0 text-muted-foreground" />
                                            )}
                                            <span className="truncate text-sm">
                                                {device.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                forgetPrinter(device.id);
                                            }}
                                            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-red-600"
                                            title="Lupakan printer"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                            </DropdownMenuGroup>
                        )}

                        <DropdownMenuItem
                            onClick={() => connect()}
                            disabled={isConnecting}
                            className="cursor-pointer"
                        >
                            <Plus className="mr-2 size-4" />
                            {isConnecting
                                ? 'Menghubungkan...'
                                : 'Cari Printer Baru'}
                        </DropdownMenuItem>

                        {status === 'connected' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => disconnect()}
                                    className="cursor-pointer text-red-600"
                                >
                                    <BluetoothSearching className="mr-2 size-4" />
                                    Putuskan Koneksi
                                </DropdownMenuItem>
                            </>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => toggleDebug()}
                            className="cursor-pointer"
                        >
                            <Bug className="mr-2 size-4" />
                            {isDebugMode
                                ? 'Nonaktifkan Debug'
                                : 'Aktifkan Debug'}
                        </DropdownMenuItem>
                        {isDebugMode && (
                            <div className="px-2 py-1.5">
                                <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs dark:bg-amber-900/20">
                                    <Bug className="size-3 shrink-0 text-amber-600" />
                                    <span className="font-medium text-amber-700 dark:text-amber-400">
                                        Debug Mode Aktif
                                    </span>
                                </div>
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
