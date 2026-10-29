import { expect, it } from 'vitest';
import { scaleNearest } from './png.ts';
import { nativePixels } from './scale.ts';

it('checks every device pixel before recovering native resolution', () => {
    const image = { width: 2, height: 1, data: new Uint8Array([0, 0, 0, 255, 255, 255]) };
    const scaled = scaleNearest(image, 3);
    expect(nativePixels(scaled, 3)).toEqual(image);
    scaled.data[3] = 1;
    expect(() => nativePixels(scaled, 3)).toThrow('(1,0)');
});

it('rejects fractional scaling and incomplete blocks', () => {
    const image = { width: 2, height: 1, data: new Uint8Array(6) };
    expect(() => nativePixels(image, 1.5)).toThrow('positive integer');
    expect(() => nativePixels(image, 2)).toThrow('not divisible');
});
