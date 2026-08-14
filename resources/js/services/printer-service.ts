import { buildReceipt as buildReceiptData } from '@/lib/receipt-builder';
import type { WeighingTransaction } from '@/types';

export interface PairedPrinter {
    id: string;
    name: string;
    language: string;
    codepageMapping: string;
}

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected';
export type PrinterEventListener = (status: PrinterStatus, printer?: PairedPrinter) => void;

const STORAGE_KEY = 'paired_printers';
const ACTIVE_KEY = 'active_printer_id';

class PrinterService {
    private printer: any = null;
    private status: PrinterStatus = 'disconnected';
    private activePrinter: PairedPrinter | null = null;
    private listeners: PrinterEventListener[] = [];
    private webBluetoothSupported: boolean = false;

    constructor() {
        this.webBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    }

    get isSupported(): boolean {
        return this.webBluetoothSupported;
    }

    get currentStatus(): PrinterStatus {
        return this.status;
    }

    get currentPrinter(): PairedPrinter | null {
        return this.activePrinter;
    }

    get pairedDevices(): PairedPrinter[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    on(listener: PrinterEventListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach((l) => l(this.status, this.activePrinter ?? undefined));
    }

    private setStatus(status: PrinterStatus, printer?: PairedPrinter) {
        this.status = status;
        if (printer) this.activePrinter = printer;
        this.notify();
    }

    private savePairedDevice(device: PairedPrinter) {
        const list = this.pairedDevices;
        const idx = list.findIndex((d) => d.id === device.id);
        if (idx >= 0) {
            list[idx] = device;
        } else {
            list.push(device);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        localStorage.setItem(ACTIVE_KEY, device.id);
    }

    getActivePrinter(): PairedPrinter | null {
        const activeId = localStorage.getItem(ACTIVE_KEY);
        if (!activeId) return null;
        return this.pairedDevices.find((d) => d.id === activeId) ?? null;
    }

    setActivePrinter(id: string) {
        const device = this.pairedDevices.find((d) => d.id === id);
        if (device) {
            localStorage.setItem(ACTIVE_KEY, id);
            this.activePrinter = device;
            this.notify();
        }
    }

    forgetPrinter(id: string) {
        const list = this.pairedDevices.filter((d) => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        if (this.activePrinter?.id === id) {
            localStorage.removeItem(ACTIVE_KEY);
            this.activePrinter = null;
            if (this.status === 'connected') {
                this.disconnect();
            } else {
                this.notify();
            }
        }
    }

    async connect(): Promise<void> {
        if (!this.webBluetoothSupported) {
            throw new Error('Web Bluetooth tidak didukung di browser ini.');
        }

        this.setStatus('connecting');

        try {
            const { default: WebBluetoothReceiptPrinter } = await import('@point-of-sale/webbluetooth-receipt-printer');
            this.printer = new WebBluetoothReceiptPrinter();

            return new Promise((resolve, reject) => {
                const onConnected = (device: { type: string; name: string; id: string; language: string; codepageMapping: string }) => {
                    const paired: PairedPrinter = {
                        id: device.id,
                        name: device.name,
                        language: device.language,
                        codepageMapping: device.codepageMapping,
                    };
                    this.savePairedDevice(paired);
                    this.setStatus('connected', paired);
                    resolve();
                };

                const onDisconnected = () => {
                    this.setStatus('disconnected');
                };

                this.printer!.addEventListener('connected', onConnected);

                this.printer!.addEventListener('disconnected', onDisconnected);

                try {
                    this.printer!.connect();
                } catch (err) {
                    this.setStatus('disconnected');
                    reject(err);
                }

                setTimeout(() => {
                    if (this.status === 'connecting') {
                        this.setStatus('disconnected');
                        reject(new Error('Time out: printer tidak terdeteksi.'));
                    }
                }, 30000);
            });
        } catch (err) {
            this.setStatus('disconnected');
            throw err;
        }
    }

    async reconnect(deviceId: string): Promise<void> {
        if (!this.webBluetoothSupported) return;
        if (!navigator.bluetooth.getDevices) return;

        const device = this.pairedDevices.find((d) => d.id === deviceId);
        if (!device) throw new Error('Printer tidak ditemukan.');

        this.setStatus('connecting');

        try {
            const { default: WebBluetoothReceiptPrinter } = await import('@point-of-sale/webbluetooth-receipt-printer');
            this.printer = new WebBluetoothReceiptPrinter();

            return new Promise((resolve, reject) => {
                const onConnected = (d: { type: string; name: string; id: string; language: string; codepageMapping: string }) => {
                    this.setStatus('connected', {
                        id: d.id,
                        name: d.name,
                        language: d.language,
                        codepageMapping: d.codepageMapping,
                    });
                    resolve();
                };

                const onDisconnected = () => {
                    this.setStatus('disconnected');
                };

                this.printer!.addEventListener('connected', onConnected);
                this.printer!.addEventListener('disconnected', onDisconnected);

                this.printer!.reconnect({ id: deviceId });

                setTimeout(() => {
                    if (this.status === 'connecting') {
                        this.setStatus('disconnected');
                        reject(new Error('Gagal reconnect ke printer.'));
                    }
                }, 15000);
            });
        } catch (err) {
            this.setStatus('disconnected');
            throw err;
        }
    }

    async disconnect(): Promise<void> {
        if (this.printer) {
            try {
                await this.printer.disconnect();
            } catch {
            }
            this.printer = null;
        }
        this.setStatus('disconnected');
    }

    async autoReconnect(): Promise<boolean> {
        const active = this.getActivePrinter();
        if (!active || !this.webBluetoothSupported || !navigator.bluetooth.getDevices) {
            return false;
        }

        try {
            await this.reconnect(active.id);
            return true;
        } catch {
            return false;
        }
    }

    async printReceipt(transaction: WeighingTransaction): Promise<void> {
        if (!this.printer || this.status !== 'connected') {
            throw new Error('Printer tidak terhubung. Hubungkan printer terlebih dahulu.');
        }

        const active = this.activePrinter;
        if (!active) throw new Error('Tidak ada printer aktif.');

        const { default: ReceiptPrinterEncoder } = await import('@point-of-sale/receipt-printer-encoder');

        const encoder = new ReceiptPrinterEncoder({
            language: active.language as 'esc-pos' | 'star-prnt' | 'star-line',
            codepageMapping: active.codepageMapping as 'epson' | 'zjiang' | 'xprinter' | 'mpt' | 'default' | 'star',
            width: 48,
        });

        const data = buildReceiptData(encoder, transaction);

        await this.printer.print(data);
    }
}

export const printerService = new PrinterService();
