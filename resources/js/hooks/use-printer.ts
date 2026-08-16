import { useEffect, useState, useCallback } from 'react';
import { printerService } from '@/services/printer-service';
import type { PairedPrinter, PrinterStatus } from '@/services/printer-service';
import type { WeighingTransaction } from '@/types';

interface UsePrinterReturn {
    status: PrinterStatus;
    isSupported: boolean;
    activePrinter: PairedPrinter | null;
    pairedDevices: PairedPrinter[];
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    autoReconnect: () => Promise<boolean>;
    setActivePrinter: (id: string) => void;
    forgetPrinter: (id: string) => void;
    print: (transaction: WeighingTransaction) => Promise<void>;
    isConnecting: boolean;
}

export function usePrinter(): UsePrinterReturn {
    const [status, setStatus] = useState<PrinterStatus>(
        printerService.currentStatus,
    );
    const [activePrinter, setActivePrinterState] =
        useState<PairedPrinter | null>(printerService.currentPrinter);
    const [pairedDevices, setPairedDevices] = useState<PairedPrinter[]>(
        printerService.pairedDevices,
    );
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const unsubscribe = printerService.on((newStatus, printer) => {
            setStatus(newStatus);
            setActivePrinterState(printer ?? null);
            setPairedDevices(printerService.pairedDevices);
            setIsConnecting(newStatus === 'connecting');
        });

        return unsubscribe;
    }, []);

    const connect = useCallback(async () => {
        setIsConnecting(true);

        try {
            await printerService.connect();
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        await printerService.disconnect();
    }, []);

    const autoReconnect = useCallback(async () => {
        return printerService.autoReconnect();
    }, []);

    const setActivePrinterFn = useCallback((id: string) => {
        printerService.setActivePrinter(id);
        setActivePrinterState(printerService.currentPrinter);
        setPairedDevices(printerService.pairedDevices);
    }, []);

    const print = useCallback(async (transaction: WeighingTransaction) => {
        await printerService.printReceipt(transaction);
    }, []);

    const forgetPrinterFn = useCallback((id: string) => {
        printerService.forgetPrinter(id);
        setActivePrinterState(printerService.currentPrinter);
        setPairedDevices(printerService.pairedDevices);
    }, []);

    return {
        status,
        isSupported: printerService.isSupported,
        activePrinter,
        pairedDevices,
        connect,
        disconnect,
        autoReconnect,
        setActivePrinter: setActivePrinterFn,
        forgetPrinter: forgetPrinterFn,
        print,
        isConnecting,
    };
}
