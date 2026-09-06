import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/** Format number as Indonesian Rupiah (e.g., "Rp 1.750") */
export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Format number as kilograms, dropping trailing ",00" but keeping nonzero decimals (e.g., "1.234,5 kg", "1.234 kg") */
export function formatKg(weight: number): string {
    return (
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(weight) + ' kg'
    );
}

/** Format number as kilograms with thousands separators, dropping trailing zeros (e.g., "1.550,5 kg", "1.550 kg") */
export function formatKgTrimmed(weight: number): string {
    return (
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(weight) + ' kg'
    );
}

/** Parse a string/number input to a float, returning 0 for invalid values */
export function parseNumber(value: string | number): number {
    const parsed =
        typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

    return isNaN(parsed) ? 0 : parsed;
}

/** Format a raw numeric string (digits + optional dot) with Indonesian grouping: 1000000 -> "1.000.000", "2580.5" -> "2.580,5". When allowDecimals is false, the decimal part is dropped entirely: "1750.00" -> "1.750" */
export function formatCurrencyDisplay(
    raw: string,
    allowDecimals = true,
): string {
    if (!raw) {
        return '';
    }

    const [integerRaw, decimalRaw] = raw.split('.');
    const integer = integerRaw.replace(/[^\d]/g, '');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (!allowDecimals || decimalRaw === undefined) {
        return grouped;
    }

    const decimal = decimalRaw.slice(0, 2);

    return decimal ? `${grouped},${decimal}` : `${grouped},`;
}

/** Sanitize a currency input display value back into a raw numeric string */
export function sanitizeCurrencyInput(input: string): string {
    if (input.includes(',')) {
        const [integerRaw, ...decimalParts] = input.split(',');
        const integer = integerRaw.replace(/[^\d]/g, '');
        const decimal = decimalParts.join('').replace(/[^\d]/g, '').slice(0, 2);

        return decimal ? `${integer}.${decimal}` : integer;
    }

    const dots = input.split('.').length - 1;
    const trailingDot =
        /\.$/.test(input) && dots === 1 && input.replace('.', '').length > 0;

    if (trailingDot) {
        return `${input.replace(/[^\d]/g, '')}.`;
    }

    return input.replace(/[^\d]/g, '');
}

/** Apply rounding mode to a number */
export function applyRounding(amount: number, mode: string): number {
    switch (mode) {
        case 'nearest_100':
            return Math.round(amount / 100) * 100;
        case 'nearest_500':
            return Math.round(amount / 500) * 500;
        case 'nearest_1000':
            return Math.round(amount / 1000) * 1000;
        default:
            return amount;
    }
}

export interface LoadInput {
    gross_weight: number;
    tare_weight: number;
    has_sorting: boolean;
    sorting_weight: number;
}

/** Calculate a multi-load transaction client-side, mirroring WeighingTransaction::calculateLoads() */
export function calculateLoads(
    loads: LoadInput[],
    data: {
        hasDeduction: boolean;
        deductionPercentage: number;
        palmPricePerKg: number;
        sortingPricePerKg: number;
        previousDebtAmount: number;
        debtPaidAmount: number;
        roundingMode?: string;
    },
) {
    const perLoad = loads.map((load, i) => {
        const gross = load.gross_weight || 0;
        const tare = load.tare_weight || 0;
        const initial = gross - tare;
        const deductionWeight = data.hasDeduction
            ? initial * (data.deductionPercentage / 100)
            : 0;
        const net = initial - deductionWeight;
        const sortingTotal = load.has_sorting
            ? (load.sorting_weight || 0) * data.sortingPricePerKg
            : 0;

        return {
            seqNo: i + 1,
            grossWeight: Math.round(gross * 100) / 100,
            tareWeight: Math.round(tare * 100) / 100,
            initialWeight: Math.round(initial * 100) / 100,
            deductionWeight: Math.round(deductionWeight * 100) / 100,
            netWeight: Math.round(net * 100) / 100,
            hasSorting: load.has_sorting,
            sortingWeight: load.has_sorting ? load.sorting_weight || 0 : 0,
            sortingTotalAmount: Math.round(sortingTotal * 100) / 100,
        };
    });

    const grossWeight = perLoad.reduce((s, l) => s + l.grossWeight, 0);
    const tareWeight = perLoad.reduce((s, l) => s + l.tareWeight, 0);
    const initialWeight = perLoad.reduce((s, l) => s + l.initialWeight, 0);
    const deductionWeight = perLoad.reduce((s, l) => s + l.deductionWeight, 0);
    const netWeight = perLoad.reduce((s, l) => s + l.netWeight, 0);
    const sortingWeight = perLoad.reduce((s, l) => s + l.sortingWeight, 0);
    const sortingTotalAmount = perLoad.reduce(
        (s, l) => s + l.sortingTotalAmount,
        0,
    );
    const palmTotalAmount = perLoad.reduce(
        (s, l) => s + l.netWeight * data.palmPricePerKg,
        0,
    );
    const grossTotalAmount = palmTotalAmount + sortingTotalAmount;
    const remainingDebtAmount = Math.max(
        0,
        data.previousDebtAmount - data.debtPaidAmount,
    );
    const finalPaidAmount = grossTotalAmount - data.debtPaidAmount;
    const finalPaidAmountRounded = applyRounding(
        finalPaidAmount,
        data.roundingMode ?? 'none',
    );

    return {
        perLoad,
        grossWeight: Math.round(grossWeight * 100) / 100,
        tareWeight: Math.round(tareWeight * 100) / 100,
        initialWeight: Math.round(initialWeight * 100) / 100,
        deductionWeight: Math.round(deductionWeight * 100) / 100,
        netWeight: Math.round(netWeight * 100) / 100,
        hasSorting: perLoad.some((l) => l.hasSorting),
        sortingWeight: Math.round(sortingWeight * 100) / 100,
        sortingTotalAmount: Math.round(sortingTotalAmount * 100) / 100,
        palmTotalAmount: Math.round(palmTotalAmount * 100) / 100,
        grossTotalAmount: Math.round(grossTotalAmount * 100) / 100,
        remainingDebtAmount: Math.round(remainingDebtAmount * 100) / 100,
        finalPaidAmount: Math.round(finalPaidAmount * 100) / 100,
        finalPaidAmountRounded: Math.round(finalPaidAmountRounded * 100) / 100,
    };
}

/** Calculate weighing transaction values client-side for real-time feedback */
export function calculateTransaction(data: {
    grossWeight: number;
    tareWeight: number;
    hasDeduction: boolean;
    deductionPercentage: number;
    palmPricePerKg: number;
    hasSorting: boolean;
    sortingWeight: number;
    sortingPricePerKg: number;
    previousDebtAmount: number;
    debtPaidAmount: number;
    roundingMode?: string;
}) {
    const initialWeight = data.grossWeight - data.tareWeight;
    const deductionWeight = data.hasDeduction
        ? initialWeight * (data.deductionPercentage / 100)
        : 0;
    const netWeight = initialWeight - deductionWeight;
    const palmTotalAmount = netWeight * data.palmPricePerKg;
    const sortingTotalAmount = data.hasSorting
        ? data.sortingWeight * data.sortingPricePerKg
        : 0;
    const grossTotalAmount = palmTotalAmount + sortingTotalAmount;
    const remainingDebtAmount = Math.max(
        0,
        data.previousDebtAmount - data.debtPaidAmount,
    );
    const finalPaidAmount = grossTotalAmount - data.debtPaidAmount;
    const finalPaidAmountRounded = applyRounding(
        finalPaidAmount,
        data.roundingMode ?? 'none',
    );

    return {
        initialWeight: Math.round(initialWeight * 100) / 100,
        deductionWeight: Math.round(deductionWeight * 100) / 100,
        netWeight: Math.round(netWeight * 100) / 100,
        palmTotalAmount: Math.round(palmTotalAmount * 100) / 100,
        sortingTotalAmount: Math.round(sortingTotalAmount * 100) / 100,
        grossTotalAmount: Math.round(grossTotalAmount * 100) / 100,
        remainingDebtAmount: Math.round(remainingDebtAmount * 100) / 100,
        finalPaidAmount: Math.round(finalPaidAmount * 100) / 100,
        finalPaidAmountRounded: Math.round(finalPaidAmountRounded * 100) / 100,
    };
}
