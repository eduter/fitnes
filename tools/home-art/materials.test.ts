import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodePng } from '../nes-hardware/png.ts';
import { displayColors } from '../nes-hardware/check.ts';
import { describeMaterials, MATERIAL, RUST } from './materials.ts';

const source = decodePng(readFileSync(new URL('../../art/home/hardware/reference-256.png', import.meta.url)));
const image = decodePng(readFileSync(new URL('../../art/home/gym.png', import.meta.url)));
const materials = describeMaterials(source.data);
const colors = displayColors(1);
function key(color: ArrayLike<number>): string {
    return `${color[0]},${color[1]},${color[2]}`;
}
function pixel(p: number): string {
    return key(image.data.subarray(p * 3, p * 3 + 3));
}

describe('home artwork material boundaries', () => {
    it('keeps rust out of concrete and unrelated materials', () => {
        const rust = new Set(RUST.map((code) => key(colors[code])));
        let brickPixels = 0;
        for (let p = 0; p < 51200; p++) {
            const material = materials.kind[p];
            if (material === MATERIAL.brick) brickPixels++;
            if (material !== MATERIAL.brick && material !== MATERIAL.skin) expect(rust.has(pixel(p))).toBe(false);
        }
        expect(brickPixels).toBeGreaterThan(100);
    });
    it('uses one identical yellow for the floor, left column and right box hazards', () => {
        const counts = [0, 0, 0];
        for (let p = 0; p < 51200; p++) {
            if (materials.kind[p] !== MATERIAL.hazard) continue;
            expect(pixel(p)).toBe(key(colors[0x38]));
            const x = p % 256,
                y = Math.floor(p / 256);
            counts[y >= 191 ? 0 : x < 20 ? 1 : 2]++;
        }
        for (const count of counts) expect(count).toBeGreaterThan(15);
    });
    it('retains three distinct warm skin shades instead of mapping the body to room colors', () => {
        const used = new Set<string>();
        const allowed = new Set([0x26, 0x27, 0x37].map((code) => key(colors[code])));
        for (let p = 0; p < 51200; p++) {
            if (materials.kind[p] !== MATERIAL.skin) continue;
            expect(allowed.has(pixel(p))).toBe(true);
            used.add(pixel(p));
        }
        expect(used.size).toBe(3);
    });
    it('renders the sign with exactly two flat inks and leaves no underline below the text', () => {
        const inks = new Set([key(colors[0x0f]), key(colors[0x10])]);
        for (let y = 55; y <= 79; y++)
            for (let x = 31; x <= 74; x++) {
                expect(inks.has(pixel(y * 256 + x))).toBe(true);
            }
        for (let x = 36; x <= 69; x++) expect(pixel(75 * 256 + x)).toBe(key(colors[0x10]));
    });
    it('uses the same lamp yellow on the lit particles without turning the entire cone solid', () => {
        let lit = 0,
            shade = 0;
        for (let p = 0; p < 51200; p++) {
            if (materials.kind[p] === MATERIAL.light) {
                expect(pixel(p)).toBe(key(colors[0x38]));
                lit++;
            }
            if (materials.kind[p] === MATERIAL.lightShade) {
                expect(pixel(p)).not.toBe(key(colors[0x38]));
                shade++;
            }
        }
        expect(lit).toBeGreaterThan(80);
        expect(shade / (lit + shade)).toBeGreaterThan(0.25);
    });
});
