import { describe, expect, it } from 'vitest';
import { checkPicture } from './check.ts';
import { masterPalette } from './palette.ts';
import type { RgbImage } from './png.ts';

const palette = masterPalette();

function solid(height = 240): RgbImage {
    return { width: 256, height, data: new Uint8Array(256 * height * 3) };
}

describe('agent-facing NES check', () => {
    it('proves a legal background with a partial final attribute row', () => {
        expect(checkPicture(solid(241)).status).toBe('pass');
    });

    it('rejects off-palette pixels with coordinates', () => {
        const image = solid(241);
        image.data.set([1, 2, 3], (4 * 256 + 3) * 3);
        const result = checkPicture(image);
        expect(result.status).toBe('fail');
        expect(result.problems[0].message).toContain('(3,4)');
        expect(result.problems[0].message).toContain('1 pixels');
    });

    it('rejects incomplete buffers rather than treating missing bytes as pixels', () => {
        expect(checkPicture({ ...solid(), data: new Uint8Array(0) }).problems[0].code).toBe('image-data');
    });

    it('never accepts invalid dimensions', () => {
        for (const height of [0, -16, Number.NaN, 1.5]) {
            expect(checkPicture({ ...solid(0), height }).status).toBe('fail');
        }
    });

    it('accepts more than 256 distinct tile patterns without an opt-out', () => {
        const image = solid(80);
        const white = palette.colors[32];
        for (let tile = 0; tile < 320; tile++) {
            for (let bit = 0; bit < 9; bit++) {
                if (tile & (1 << bit)) {
                    const x = (tile % 32) * 8 + (bit % 8);
                    const y = Math.floor(tile / 32) * 8 + Math.floor(bit / 8);
                    image.data.set([white.r, white.g, white.b], (y * 256 + x) * 3);
                }
            }
        }
        expect(checkPicture(image).status).toBe('pass');
    });
});
