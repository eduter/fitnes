import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction, displayColors } from './check.ts';
import { perceptualScore } from './perceptual.ts';
import { decodePng } from './png.ts';

const report = JSON.parse(readFileSync('art/home/study/hero-report.json', 'utf8'));
const names = ['gym-reference-fit', 'gym-crisp-alternative', ...Object.keys(report.candidates)];

it.each(['gym-existing-refit', ...names])('reconstructs the full-scene %s candidate exactly', (name) => {
    const construction = JSON.parse(readFileSync(`art/home/study/${name}.json`, 'utf8'));
    const image = decodePng(readFileSync(`art/home/study/${name}.png`));
    expect(checkConstruction(construction, image).status).toBe('pass');
});

it.each(names)('uses the same off-white throughout both towels and both shoes in %s', (name) => {
    const image = decodePng(readFileSync(`art/home/study/${name}.png`));
    const white = displayColors(1)[32];
    const counts = [0, 0, 0, 0];
    for (const p of report.materialMasks.whitePixels as number[]) {
        expect(Array.from(image.data.subarray(p * 3, p * 3 + 3))).toEqual(white);
        const x = p % 256;
        const y = Math.floor(p / 256);
        counts[x < 80 ? (y < 120 ? 0 : 1) : x < 128 ? 2 : 3]++;
    }
    expect(counts.every((count) => count > 20)).toBe(true);
});

it('changes the full scene and measures every revision against the same unmodified reference', () => {
    const native = decodePng(readFileSync('art/home/study/hero-source-native.png'));
    const current = decodePng(readFileSync('art/home/gym.png'));
    expect(perceptualScore(native, current)).toEqual(report.current);
    for (const [name, result] of Object.entries(report.candidates)) {
        const image = decodePng(readFileSync(`art/home/study/${name}.png`));
        const actual = perceptualScore(native, image);
        const score = result as { meanOklabDistance: number; ssim: number };
        expect(actual.meanOklabDistance).toBeCloseTo(score.meanOklabDistance, 12);
        expect(actual.ssim).toBeCloseTo(score.ssim, 12);
        expect(actual.meanOklabDistance).toBeLessThan(report.current.meanOklabDistance);
        expect(actual.ssim).toBeGreaterThan(report.current.ssim);
        const quadrants = [0, 0, 0, 0];
        for (let p = 0; p < 51200; p++) {
            if ([0, 1, 2].some((c) => image.data[p * 3 + c] !== current.data[p * 3 + c])) {
                quadrants[(p % 256 < 128 ? 0 : 1) + (p < 25600 ? 0 : 2)]++;
            }
        }
        expect(quadrants.every((count) => count > 200)).toBe(true);
    }
    for (const round of report.rounds) {
        if (round.selectedCode === undefined) {
            continue;
        }
        expect(
            report.candidates[`gym-richer-${round.step}`].inkUsage.some(
                (ink: { code: number; pixels: number }) => ink.code === round.selectedCode && ink.pixels > 0
            )
        ).toBe(true);
    }
});
