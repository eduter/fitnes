import { describe, expect, it } from 'vitest';
import { decodePng } from './png.ts';
import { rasterize, renderSample, validateConstruction } from './render.ts';

describe('steel sample construction', () => {
    it('renders exact 4× pixel blocks from the validated native layers', () => {
        const scene = renderSample();
        const native = decodePng(rasterize(scene));
        const large = decodePng(rasterize(scene, 4));
        expect([native.width, native.height]).toEqual([256, 240]);
        for (let y = 0; y < large.height; y++) {
            for (let x = 0; x < large.width; x++) {
                const from = (Math.floor(y / 4) * 256 + Math.floor(x / 4)) * 3;
                const to = (y * large.width + x) * 3;
                if (
                    large.data[to] !== native.data[from] ||
                    large.data[to + 1] !== native.data[from + 1] ||
                    large.data[to + 2] !== native.data[from + 2]
                ) {
                    throw new Error(`Blended pixel at ${x},${y}`);
                }
            }
        }
    });

    it('counts sprite boxes even when their rows are transparent', () => {
        const scene = renderSample();
        scene.sprites = Array.from({ length: 9 }, (_, x) => ({
            x: x * 8,
            y: 16,
            palette: 0,
            pixels: Array(8).fill('00000000'),
        }));
        expect(() => validateConstruction(scene)).toThrow('scanline budget');
    });

    it('rejects an invalid attribute assignment or sprite palette', () => {
        const scene = renderSample();
        scene.attributes[0][0] = 4;
        expect(() => validateConstruction(scene)).toThrow('16×16 attributes');
        scene.attributes[0][0] = 0;
        scene.sprites[0].palette = 4;
        expect(() => validateConstruction(scene)).toThrow('sprite palette selection');
    });

    it('rejects a background that needs more than one 4 KiB pattern bank', () => {
        const scene = renderSample();
        for (let tile = 0; tile < 257; tile++) {
            const x = (tile % 32) * 8;
            const y = Math.floor(tile / 32) * 8;
            for (let dy = 0; dy < 8; dy++) {
                for (let dx = 0; dx < 8; dx++) {
                    scene.background[(y + dy) * 256 + x + dx] = 0;
                }
            }
            for (let digit = 0; digit < 5; digit++) {
                scene.background[y * 256 + x + digit] = (tile >> (digit * 2)) & 3;
            }
        }
        expect(() => validateConstruction(scene)).toThrow('CHR bank');
    });
});
