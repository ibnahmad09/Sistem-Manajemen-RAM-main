import { toCanvas } from 'html-to-image';

/**
 * Map printer columns to printable dot width (all multiples of 8).
 *
 * - columns <= 32 → 384  (58 mm @203 dpi)
 * - columns === 42 → 512  (80 mm 180 dpi)
 * - otherwise      → 576  (80 mm @203 dpi)
 */
export function dotWidthForColumns(columns: number): number {
    if (columns <= 32) {
        return 384;
    }

    if (columns === 42) {
        return 512;
    }

    return 576;
}

/**
 * Pad a bitmap so its height is a multiple of 8 (required by ESC/POS raster).
 *
 * Assumes `input.width` is already a multiple of 8.
 * Fills new bottom rows with WHITE (rgba 255,255,255,255).
 */
export function padBitmapTo8(input: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}): { data: Uint8ClampedArray; width: number; height: number } {
    const { data, width, height } = input;
    const remainder = height % 8;

    if (remainder === 0) {
        return { data, width, height };
    }

    const paddedHeight = height + (8 - remainder);
    const bytesPerPixel = 4;
    const totalBytes = width * paddedHeight * bytesPerPixel;
    const output = new Uint8ClampedArray(totalBytes);

    // Copy original rows to the top
    output.set(data.subarray(0, width * height * bytesPerPixel));

    // Fill bottom rows with white (R=255, G=255, B=255, A=255)
    const startOffset = width * height * bytesPerPixel;

    for (let row = startOffset; row < totalBytes; row += bytesPerPixel) {
        output[row] = 255; // R
        output[row + 1] = 255; // G
        output[row + 2] = 255; // B
        output[row + 3] = 255; // A
    }

    return { data: output, width, height: paddedHeight };
}

/**
 * Capture a DOM element as a raster bitmap suitable for ESC/POS printing.
 *
 * Returns RGBA data with width EXACTLY = dotWidth and height padded to a
 * multiple of 8. The element is rendered at 2x supersampling, then resized to
 * the target dot width with high-quality smoothing so text stays crisp while
 * the layout stays proportional to what is shown on screen.
 *
 * NOTE: never pass `width`/`height` options to html-to-image here — they change
 * the cloned container's layout size instead of scaling its content, which
 * would render the nota's small CSS font sizes at the wrong proportions.
 *
 * The caller falls back to text mode if this throws.
 */
export async function captureNotaBitmap(
    element: HTMLElement,
    dotWidth: number,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
    if (element.offsetWidth === 0) {
        throw new Error('Element has zero width');
    }

    const ratio = dotWidth / element.offsetWidth;
    const h0 = Math.round(element.offsetHeight * ratio);

    const supersampled = await toCanvas(element, {
        pixelRatio: 2,
        style: {
            margin: '0',
            boxShadow: 'none',
            webkitBoxShadow: 'none',
        },
    });

    const canvas = document.createElement('canvas');
    canvas.width = dotWidth;
    canvas.height = h0;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get 2d context from canvas');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(supersampled, 0, 0, dotWidth, h0);

    const imageData = ctx.getImageData(0, 0, dotWidth, h0);

    return padBitmapTo8({ data: imageData.data, width: dotWidth, height: h0 });
}
