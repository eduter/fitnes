import { expect, it } from 'vitest';
import { checkConstruction, displayColors } from './check.ts';
import { paletteSearch } from './optimize.ts';

it('finds an exact construction when tiles fit two available shared palettes', () => {
    const colors = displayColors(1);
    const image = { width: 256, height: 200, data: new Uint8Array(51200 * 3) };
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 256; x++) {
            const palette = Math.floor(x / 8) % 2 === 0 ? [15, 0, 7, 16] : [15, 0, 16, 32];
            image.data.set(colors[palette[(x + y) % 4]], (y * 256 + x) * 3);
        }
    }
    const result = paletteSearch(image, new Float32Array(51200).fill(1)).fit([15, 0, 7, 16, 32]);
    expect(result.objective).toBe(0);
    expect(result.image.data).toEqual(image.data);
    expect(checkConstruction(result.construction, result.image).status).toBe('pass');
});

it('rejects incorrectly sized conversion targets', () => {
    expect(() => paletteSearch({ width: 8, height: 8, data: new Uint8Array(192) }, new Float32Array(64))).toThrow(
        '256×200'
    );
});
