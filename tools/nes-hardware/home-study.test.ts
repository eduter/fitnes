import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction } from './check.ts';
import { decodePng } from './png.ts';

it.each(['gym-linen', 'gym-warm-linen', 'logo-nearest', 'logo-dithered'])(
    'reconstructs every %s candidate pixel within hardware budgets',
    (name) => {
        const base = new URL(`../../art/home/study/${name}`, import.meta.url);
        const construction = JSON.parse(readFileSync(`${base.pathname}.json`, 'utf8'));
        const image = decodePng(readFileSync(`${base.pathname}.png`));
        expect(checkConstruction(construction, image).status).toBe('pass');
    }
);

it('preserves the hero outside the two towel interiors', () => {
    const before = decodePng(readFileSync('art/home/gym.png'));
    const after = decodePng(readFileSync('art/home/study/gym-linen.png'));
    let changes = 0;
    for (let p = 0; p < before.width * before.height; p++) {
        if ([0, 1, 2].every((c) => before.data[p * 3 + c] === after.data[p * 3 + c])) {
            continue;
        }
        changes++;
        const x = p % 256;
        const y = Math.floor(p / 256);
        expect((x >= 38 && x <= 43 && y >= 90 && y <= 103) || (x >= 33 && x <= 44 && y >= 168 && y <= 182)).toBe(true);
    }
    expect(changes).toBeGreaterThan(100);
});

it('keeps the logo background and lettering silhouette free of dither holes', () => {
    const source = decodePng(readFileSync('art/home/study/logo-source.png'));
    const actual = decodePng(readFileSync('art/home/study/logo-dithered.png'));
    for (let p = 0; p < source.width * source.height; p++) {
        const blackSource = [0, 1, 2].every((c) => source.data[p * 3 + c] === 0);
        const blackActual = [0, 1, 2].every((c) => actual.data[p * 3 + c] === 0);
        if (blackSource) {
            expect(blackActual).toBe(true);
        }
        if ([0, 1, 2].some((c) => source.data[p * 3 + c] > 120)) {
            expect(blackActual).toBe(false);
        }
    }
});
