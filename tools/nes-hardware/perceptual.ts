import type { RgbImage } from './png.ts';

/** Convert byte RGB to perceptually uniform Oklab coordinates. */
function oklab(rgb: readonly number[]): number[] {
    const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

/** Squared Euclidean distance in Oklab; lower means a closer color match. */
function colorDistance(a: readonly number[], b: readonly number[]): number {
    return a.reduce((sum, value, channel) => sum + (value - b[channel]) ** 2, 0);
}

/** Compare aligned images using mean Oklab distance and equal-weight 8×8 luminance SSIM windows. */
function perceptualScore(reference: RgbImage, actual: RgbImage): { meanOklabDistance: number; ssim: number } {
    const { width, height, data } = reference;
    if (actual.width !== width || actual.height !== height || actual.data.length !== data.length) {
        throw new Error('Perceptual comparison requires identically sized, aligned RGB images');
    }
    let distance = 0;
    const luma = [new Float64Array(width * height), new Float64Array(width * height)];
    for (let p = 0; p < width * height; p++) {
        const a = Array.from(data.subarray(p * 3, p * 3 + 3));
        const b = Array.from(actual.data.subarray(p * 3, p * 3 + 3));
        distance += Math.sqrt(colorDistance(oklab(a), oklab(b)));
        luma[0][p] = (0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]) / 255;
        luma[1][p] = (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]) / 255;
    }
    let similarity = 0;
    let windows = 0;
    for (let top = 0; top < height; top += 8) {
        for (let left = 0; left < width; left += 8) {
            const a: number[] = [];
            const b: number[] = [];
            for (let y = top; y < Math.min(top + 8, height); y++) {
                for (let x = left; x < Math.min(left + 8, width); x++) {
                    a.push(luma[0][y * width + x]);
                    b.push(luma[1][y * width + x]);
                }
            }
            const ma = a.reduce((s, v) => s + v, 0) / a.length;
            const mb = b.reduce((s, v) => s + v, 0) / b.length;
            const va = a.reduce((s, v) => s + (v - ma) ** 2, 0) / a.length;
            const vb = b.reduce((s, v) => s + (v - mb) ** 2, 0) / b.length;
            const cov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / a.length;
            similarity +=
                ((2 * ma * mb + 0.0001) * (2 * cov + 0.0009)) / ((ma * ma + mb * mb + 0.0001) * (va + vb + 0.0009));
            windows++;
        }
    }
    return { meanOklabDistance: distance / (width * height), ssim: similarity / windows };
}

export { colorDistance, oklab, perceptualScore };
