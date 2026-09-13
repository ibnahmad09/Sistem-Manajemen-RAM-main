import { describe, expect, it } from 'vitest';
import {
    calculateLoads,
    formatCurrencyDisplay,
    formatIdNumber,
    formatKg,
    formatKgTrimmed,
} from '@/lib/utils';

describe('formatCurrencyDisplay with allowDecimals', () => {
    it('groups thousands with dots', () => {
        expect(formatCurrencyDisplay('1000000')).toBe('1.000.000');
    });

    it('shows decimals by default', () => {
        expect(formatCurrencyDisplay('2580.5')).toBe('2.580,5');
        expect(formatCurrencyDisplay('1750.00')).toBe('1.750,00');
    });

    it('drops decimal when allowDecimals is false', () => {
        expect(formatCurrencyDisplay('1750.00', false)).toBe('1.750');
        expect(formatCurrencyDisplay('1750.50', false)).toBe('1.750');
    });

    it('returns empty for empty input', () => {
        expect(formatCurrencyDisplay('', false)).toBe('');
        expect(formatCurrencyDisplay('', true)).toBe('');
    });
});

describe('formatKg', () => {
    it('drops trailing ,00 but keeps nonzero decimals', () => {
        expect(formatKg(5000)).toContain('5.000');
        expect(formatKg(5000)).not.toContain(',');
        expect(formatKg(5000.5)).toContain('5.000,5');
    });
});

describe('formatKgTrimmed', () => {
    it('does not include ,00', () => {
        expect(formatKgTrimmed(5000)).not.toContain(',50');
        expect(formatKgTrimmed(1500)).toContain('1.500');
    });
});

describe('formatIdNumber', () => {
    it('groups thousands with dots', () => {
        expect(formatIdNumber(1500)).toBe('1.500');
        expect(formatIdNumber(1234567.25)).toBe('1.234.567,25');
    });

    it('trims trailing zeros in the decimal part', () => {
        expect(formatIdNumber(120)).toBe('120');
        expect(formatIdNumber(120.0)).toBe('120');
        expect(formatIdNumber(120.5)).toBe('120,5');
        expect(formatIdNumber(120.05)).toBe('120,05');
    });

    it('respects a custom max fraction digits', () => {
        expect(formatIdNumber(7.0, 1)).toBe('7');
        expect(formatIdNumber(7.5, 1)).toBe('7,5');
    });
});

describe('calculateLoads', () => {
    const loads = [
        {
            gross_weight: 1000,
            tare_weight: 200,
            has_sorting: true,
            sorting_weight: 100,
        },
    ];

    const baseData = {
        hasDeduction: true,
        deductionPercentage: 3,
        palmPricePerKg: 2580,
        sortingPricePerKg: 500,
        previousDebtAmount: 0,
        debtPaidAmount: 0,
    };

    it('applies sorting deduction percentage to sorting total', () => {
        const result = calculateLoads(loads, {
            ...baseData,
            sortingDeductionPercentage: 5,
        });

        expect(result.perLoad[0].sortingDeductionWeight).toBe(5);
        expect(result.perLoad[0].sortingNetWeight).toBe(95);
        expect(result.perLoad[0].sortingTotalAmount).toBe(47500);
        expect(result.sortingDeductionWeight).toBe(5);
        expect(result.sortingNetWeight).toBe(95);
        expect(result.sortingTotalAmount).toBe(47500);
        expect(result.perLoad[0].netWeight).toBe(681);
        expect(result.netWeight).toBe(681);
        expect(result.palmTotalAmount).toBe(1756980);
        expect(result.grossTotalAmount).toBe(1804480);
    });

    it('keeps legacy behavior when sorting deduction percentage is zero', () => {
        const result = calculateLoads(loads, {
            ...baseData,
            sortingDeductionPercentage: 0,
        });

        expect(result.perLoad[0].sortingDeductionWeight).toBe(0);
        expect(result.perLoad[0].sortingNetWeight).toBe(100);
        expect(result.perLoad[0].sortingTotalAmount).toBe(50000);
    });

    it('defaults to zero when sortingDeductionPercentage is missing', () => {
        const result = calculateLoads(loads, baseData);

        expect(result.perLoad[0].sortingDeductionWeight).toBe(0);
        expect(result.perLoad[0].sortingNetWeight).toBe(100);
        expect(result.perLoad[0].sortingTotalAmount).toBe(50000);
    });

    it('subtracts sorting net weight from net to calculate palm amount (user scenario)', () => {
        const userLoads = [
            {
                gross_weight: 1000,
                tare_weight: 100,
                has_sorting: true,
                sorting_weight: 50,
            },
        ];
        const result = calculateLoads(userLoads, {
            ...baseData,
            hasDeduction: true,
            deductionPercentage: 5,
            palmPricePerKg: 2000,
            sortingDeductionPercentage: 5,
            sortingPricePerKg: 500,
        });

        // gross 1000 - tare 100 = 900; 5% deduction = 45; net = 900 - 45 = 855
        // sorting: 50 - 5% = 47.5 net; net toto = 855 - 47.5 = 807.5
        expect(result.perLoad[0].netWeight).toBe(807.5);
        expect(result.sortingNetWeight).toBe(47.5);
        expect(result.sortingTotalAmount).toBe(23750);
        expect(result.palmTotalAmount).toBe(1615000);
        expect(result.grossTotalAmount).toBe(1638750);
    });
});
