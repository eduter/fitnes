import { expect, it } from 'vitest';
import { colorDistance, oklab, perceptualScore } from './perceptual.ts';

it('matches published Oklab coordinates for sRGB red', () => {
    const red = oklab([255, 0, 0]);
    expect(red[0]).toBeCloseTo(0.62795536, 6);
    expect(red[1]).toBeCloseTo(0.22486306, 6);
    expect(red[2]).toBeCloseTo(0.1258463, 6);
    expect(colorDistance(red, red)).toBe(0);
});

it('scores identity exactly and penalizes lost edges', () => {
    const reference = { width: 8, height: 8, data: Uint8Array.from({ length: 192 }, (_, i) => (i % 6 < 3 ? 255 : 0)) };
    expect(perceptualScore(reference, reference)).toEqual({ meanOklabDistance: 0, ssim: 1 });
    const flat = { ...reference, data: new Uint8Array(192).fill(127) };
    expect(perceptualScore(reference, flat).ssim).toBeLessThan(0.1);
    expect(perceptualScore(reference, flat).meanOklabDistance).toBeGreaterThan(0.1);
});

it('rejects images that cannot be compared pixel for pixel', () => {
    expect(() =>
        perceptualScore(
            { width: 1, height: 1, data: new Uint8Array(3) },
            { width: 2, height: 1, data: new Uint8Array(6) }
        )
    ).toThrow('identically sized');
});
