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

/** Format number as kilograms (e.g., "1.234,50 kg") */
export function formatKg(weight: number): string {
    return (
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(weight) + ' kg'
    );
}

/** Parse a string/number input to a float, returning 0 for invalid values */
export function parseNumber(value: string | number): number {
    const parsed = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;

    return isNaN(parsed) ? 0 : parsed;
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
    const deductionWeight = data.hasDeduction ? initialWeight * (data.deductionPercentage / 100) : 0;
    const netWeight = initialWeight - deductionWeight;
    const palmTotalAmount = netWeight * data.palmPricePerKg;
    const sortingTotalAmount = data.hasSorting ? data.sortingWeight * data.sortingPricePerKg : 0;
    const grossTotalAmount = palmTotalAmount + sortingTotalAmount;
    const remainingDebtAmount = Math.max(0, data.previousDebtAmount - data.debtPaidAmount);
    const finalPaidAmount = grossTotalAmount - data.debtPaidAmount;
    const finalPaidAmountRounded = applyRounding(finalPaidAmount, data.roundingMode ?? 'none');

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
