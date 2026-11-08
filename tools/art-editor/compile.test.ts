import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction } from '../nes-hardware/check.ts';
import { decodePng } from '../nes-hardware/png.ts';
import { compilePixels, imageCodes, rgbImage } from './compile.ts';
import { replaceRegion } from './model.ts';

const seed = JSON.parse(readFileSync('art/home/construction.json', 'utf8'));
const original = decodePng(readFileSync('art/home/gym.png'));
const pixels = imageCodes(original, seed);

it('retains an exact proof for the original artwork', () => {
    const result = compilePixels(pixels, seed);
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(checkConstruction(result.construction, original).status).toBe('pass');
    }
});

it('rebuilds a legal proof for a global material color replacement without quantizing', () => {
    const edited = Uint8Array.from(pixels, (code) => (code === 16 ? 32 : code));
    const result = compilePixels(edited, seed);
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(checkConstruction(result.construction, rgbImage(edited, 1)).status).toBe('pass');
    }
});

it('proves a white upper towel while leaving every other pixel unchanged', () => {
    const edited = replaceRegion(pixels, 256, { left: 37, top: 88, width: 8, height: 17 }, 56, 32);
    const result = compilePixels(edited, seed);
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(checkConstruction(result.construction, rgbImage(edited, 1)).status).toBe('pass');
    }
});

it('never calls an edited image valid when a construction cannot reproduce its exact pixels', () => {
    const edited = pixels.slice();
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            edited[y * 256 + x] = [0, 7, 16, 32, 38, 39, 55, 56][x];
        }
    }
    const result = compilePixels(edited, seed);
    if (result.ok) {
        expect(checkConstruction(result.construction, rgbImage(edited, 1)).status).toBe('pass');
    } else {
        expect(result.regions.length).toBeGreaterThan(0);
    }
});

it('allows another off-white accent alongside the edited towels and sneakers', () => {
    let edited: Uint8Array = pixels.slice();
    for (const region of [
        { left: 37, top: 88, width: 8, height: 17 },
        { left: 33, top: 167, width: 13, height: 18 },
        { left: 107, top: 141, width: 12, height: 11 },
        { left: 135, top: 141, width: 13, height: 11 },
    ]) {
        edited = replaceRegion(edited, 256, region, 16, 32);
    }
    const result = compilePixels(edited, seed);
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(checkConstruction(result.construction, rgbImage(edited, 1)).status).toBe('pass');
    }
});

it('highlights changed regions rather than untouched character and sign sprites', () => {
    const edited = pixels.slice();
    for (let t = 0; t < 100; t++) {
        edited[(164 + Math.floor(t / 32) * 8) * 256 + (t % 32) * 8 + 4] = 32;
    }
    const result = compilePixels(edited, seed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.regions.every((region) => region.top >= 160)).toBe(true);
    }
});

it('rejects extra overlays when the current artwork would exceed its sprite budget', () => {
    const before = pixels.slice();
    let edited: Uint8Array = pixels.slice();
    for (const region of [
        { left: 37, top: 88, width: 8, height: 17 },
        { left: 33, top: 167, width: 13, height: 18 },
        { left: 107, top: 141, width: 12, height: 11 },
        { left: 135, top: 141, width: 13, height: 11 },
    ]) {
        edited = replaceRegion(edited, 256, region, 56, 32);
    }
    const result = compilePixels(edited, seed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.detail).toContain('at most 64 sprites');
    }
    expect(pixels).toEqual(before);
});
