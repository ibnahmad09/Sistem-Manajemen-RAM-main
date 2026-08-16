declare module '@point-of-sale/webbluetooth-receipt-printer';

declare module '@point-of-sale/receipt-printer-encoder';

interface Bluetooth {
    getDevices(options?: { acceptAllDevices?: boolean }): Promise<unknown[]>;
    requestDevice(options?: { acceptAllDevices?: boolean }): Promise<unknown>;
}

interface Navigator {
    bluetooth: Bluetooth;
}
