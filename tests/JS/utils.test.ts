import { describe, expect, it } from 'vitest';
import {
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
