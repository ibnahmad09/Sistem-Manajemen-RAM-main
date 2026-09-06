import { describe, it, expect } from 'vitest';
import { dotWidthForColumns, padBitmapTo8 } from '@/lib/receipt-raster';

describe('dotWidthForColumns', () => {
    it('should return 384 for 32 columns (58 mm @203 dpi)', () => {
        expect(dotWidthForColumns(32)).toBe(384);
    });

    it('should return 384 for columns <= 32', () => {
        expect(dotWidthForColumns(20)).toBe(384);
        expect(dotWidthForColumns(0)).toBe(384);
    });

    it('should return 512 for 42 columns (80 mm 180 dpi)', () => {
        expect(dotWidthForColumns(42)).toBe(512);
    });

    it('should return 576 for 48 columns (80 mm @203 dpi)', () => {
        expect(dotWidthForColumns(48)).toBe(576);
    });

    it('should return 576 for any columns > 42 (except 42)', () => {
        expect(dotWidthForColumns(100)).toBe(576);
        expect(dotWidthForColumns(50)).toBe(576);
    });

    it('should return 384 for negative columns', () => {
        expect(dotWidthForColumns(-5)).toBe(384);
    });
});

describe('padBitmapTo8', () => {
    it('should pad height from 3 to 8 with white rows', () => {
        const width = 8;
        const height = 3;
        // 8 * 3 * 4 = 96 bytes — all zero (black)
        const data = new Uint8ClampedArray(width * height * 4);

        // Fill some pixels with white to verify they survive the copy
        // First row, last pixel: set to white (255,255,255,255)
        const lastPixelOffset = (width * 0 + (width - 1)) * 4;
        data[lastPixelOffset] = 255;
        data[lastPixelOffset + 1] = 255;
        data[lastPixelOffset + 2] = 255;
        data[lastPixelOffset + 3] = 255;

        const result = padBitmapTo8({ data, width, height });

        expect(result.height).toBe(8);
        expect(result.width).toBe(width);
        expect(result.data.length).toBe(width * 8 * 4);

        // Original rows preserved — first row last pixel still white
        const checkOffset = (width * 0 + (width - 1)) * 4;
        expect(result.data[checkOffset]).toBe(255);
        expect(result.data[checkOffset + 1]).toBe(255);
        expect(result.data[checkOffset + 2]).toBe(255);
        expect(result.data[checkOffset + 3]).toBe(255);

        // Original rows preserved — second row first pixel still black (0)
        expect(result.data[width * 4]).toBe(0);

        // Bottom filler rows must be white (R=255, G=255, B=255, A=255)
        const fillerStart = width * height * 4;

        for (let i = fillerStart; i < result.data.length; i += 4) {
            expect(result.data[i]).toBe(255); // R
            expect(result.data[i + 1]).toBe(255); // G
            expect(result.data[i + 2]).toBe(255); // B
            expect(result.data[i + 3]).toBe(255); // A
        }
    });

    it('should return data unchanged when height is already a multiple of 8', () => {
        const width = 8;
        const height = 8;
        const data = new Uint8ClampedArray(width * height * 4);

        // Mark some pixels so we can verify identity
        data[0] = 42;

        const result = padBitmapTo8({ data, width, height });

        expect(result.height).toBe(8);
        expect(result.data.length).toBe(width * 8 * 4);
        // Should be the exact same array reference (no copy)
        expect(result.data).toBe(data);
        expect(result.data[0]).toBe(42);
    });

    it('should return data unchanged when height is 16', () => {
        const width = 8;
        const height = 16;
        const data = new Uint8ClampedArray(width * height * 4);
        const result = padBitmapTo8({ data, width, height });

        expect(result.height).toBe(16);
        expect(result.data).toBe(data);
    });

    it('should pad height from 1 to 8', () => {
        const width = 8;
        const height = 1;
        const data = new Uint8ClampedArray(width * height * 4);

        const result = padBitmapTo8({ data, width, height });

        expect(result.height).toBe(8);
        expect(result.data.length).toBe(width * 8 * 4);

        // Original row preserved (all zeros)
        for (let i = 0; i < width * 4; i++) {
            expect(result.data[i]).toBe(0);
        }

        // Filler rows white
        const fillerStart = width * 4;

        for (let i = fillerStart; i < result.data.length; i += 4) {
            expect(result.data[i]).toBe(255);
            expect(result.data[i + 1]).toBe(255);
            expect(result.data[i + 2]).toBe(255);
            expect(result.data[i + 3]).toBe(255);
        }
    });

    it('should pad height from 7 to 8', () => {
        const width = 16;
        const height = 7;
        const data = new Uint8ClampedArray(width * height * 4);
        const result = padBitmapTo8({ data, width, height });

        expect(result.height).toBe(8);
        expect(result.data.length).toBe(width * 8 * 4);

        // Bottom row (row index 7) must be white
        const row7Start = width * 7 * 4;

        for (let i = row7Start; i < row7Start + width * 4; i += 4) {
            expect(result.data[i]).toBe(255);
            expect(result.data[i + 1]).toBe(255);
            expect(result.data[i + 2]).toBe(255);
            expect(result.data[i + 3]).toBe(255);
        }
    });

    it('should pad height from 9 to 16', () => {
        const width = 8;
        const height = 9;
        const data = new Uint8ClampedArray(width * height * 4);
        const result = padBitmapTo8({ data, width, height });

        expect(result.height).toBe(16);
        expect(result.data.length).toBe(width * 16 * 4);

        // Original 9 rows preserved (all zeros)
        for (let i = 0; i < width * 9 * 4; i++) {
            expect(result.data[i]).toBe(0);
        }

        // Filler rows white
        const fillerStart = width * 9 * 4;

        for (let i = fillerStart; i < result.data.length; i += 4) {
            expect(result.data[i]).toBe(255);
            expect(result.data[i + 1]).toBe(255);
            expect(result.data[i + 2]).toBe(255);
            expect(result.data[i + 3]).toBe(255);
        }
    });
});
