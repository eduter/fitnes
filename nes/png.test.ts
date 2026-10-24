import { describe, expect, it } from 'vitest';
import { decodePng, encodePng, type RgbImage, scaleNearest } from './png.ts';

function checker(): RgbImage {
    return {
        width: 2,
        height: 2,
        data: Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 252, 252, 252]),
    };
}

describe('encodePng', () => {
    it('round-trips pixels and dimensions', () => {
        const png = encodePng(checker());

        const decoded = decodePng(png);

        expect(decoded.width).toBe(2);
        expect(decoded.height).toBe(2);
        expect(Array.from(decoded.data)).toEqual(Array.from(checker().data));
    });

    it('produces identical bytes for identical pixels', () => {
        expect(encodePng(checker())).toEqual(encodePng(checker()));
    });

    it('rejects a buffer that does not match the dimensions', () => {
        expect(() => encodePng({ width: 3, height: 2, data: new Uint8Array(6) })).toThrow(/18 RGB bytes/);
    });
});

describe('scaleNearest', () => {
    it('repeats each pixel into a solid block without blending', () => {
        const scaled = scaleNearest(checker(), 3);

        expect(scaled.width).toBe(6);
        expect(scaled.height).toBe(6);
        const pixel = (x: number, y: number) => Array.from(scaled.data.subarray((y * 6 + x) * 3, (y * 6 + x) * 3 + 3));
        expect(pixel(0, 0)).toEqual([255, 0, 0]);
        expect(pixel(2, 2)).toEqual([255, 0, 0]);
        expect(pixel(3, 2)).toEqual([0, 255, 0]);
        expect(pixel(5, 5)).toEqual([252, 252, 252]);
    });

    it('rejects fractional and non-positive factors', () => {
        expect(() => scaleNearest(checker(), 1.5)).toThrow(/positive integer/);
        expect(() => scaleNearest(checker(), 0)).toThrow(/positive integer/);
    });
});
