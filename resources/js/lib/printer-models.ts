/**
 * Maps Bluetooth device name patterns to column counts for thermal receipt printers.
 *
 * Order matters: more specific patterns first, generic names last.
 * Matching is case-insensitive via `String.includes()`.
 * Fallback for unknown printers is 48 columns (80mm, most common).
 */
const PRINTER_COLUMNS_MAP: [pattern: string, columns: number][] = [
    // ═══ 58mm PRINTERS (32 columns) ═══

    // Epson TM-P series (portable 58mm)
    ['TM-P20', 32],
    ['TM-P60', 32],
    ['TM-P80', 32],

    // Star portable 58mm
    ['SM-L200', 32],
    ['SM-L300', 32],
    ['mPOP', 32],
    ['mC-Print2', 32],

    // Xprinter 58mm
    ['XP-N160', 32],

    // Citizen 58mm
    ['CT-S601', 32],

    // Generic 58mm
    ['POS-5890', 32],
    ['POS-5802', 32],
    ['58T', 32],
    ['WPP-5800', 32],
    ['GP-1320', 32],
    ['M110', 32],

    // ═══ 80mm PRINTERS ═══

    // Epson TM-T series (42 columns — 180 DPI models)
    ['TM-T88', 42],
    ['TM-T70', 42],

    // Epson TM-T series (48 columns — 203 DPI models)
    ['TM-T20', 48],
    ['TM-m30', 48],

    // Star desktop 80mm
    ['TSP100', 48],
    ['TSP143', 48],
    ['TSP650', 48],

    // Bixolon 80mm
    ['SRP-350', 42],
    ['SRP-E300', 48],

    // Citizen 80mm
    ['CT-S310', 48],
    ['CT-S801', 48],

    // Xprinter 80mm
    ['XP-80', 48],
    ['XP-T230', 48],

    // HPRT 80mm
    ['TP80', 48],

    // Fujitsu 80mm
    ['FP-1000', 48],

    // Generic 80mm
    ['POS-8360', 48],
    ['GP-2120', 48],
    ['MPT-II', 48],

    // ═══ GENERIC BLUETOOTH NAMES (fallback ke 80mm) ═══
    // Cannot distinguish 58mm vs 80mm from these names alone.
    ['BlueTooth Printer', 48],
    ['Printer001', 48],
];

export function detectColumns(deviceName: string): number {
    const name = deviceName.toUpperCase();

    for (const [pattern, columns] of PRINTER_COLUMNS_MAP) {
        if (name.includes(pattern.toUpperCase())) {
            return columns;
        }
    }

    return 48;
}
