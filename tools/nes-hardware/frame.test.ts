import { expect, it } from 'vitest';
import { compareFrame } from './frame.ts';

it('compares only the asset crop, leaving the ROM padding outside the comparison', () => {
    const expected = { width: 2, height: 1, data: new Uint8Array([1, 2, 3, 4, 5, 6]) };
    const actual = { width: 2, height: 2, data: new Uint8Array([1, 2, 3, 4, 5, 6, 9, 9, 9, 9, 9, 9]) };
    expect(compareFrame(expected, actual)).toEqual({ differingPixels: 0, comparedPixels: 2 });
});
it('counts one bad pixel once even when several channels differ', () => {
    const expected = { width: 2, height: 1, data: new Uint8Array(6) };
    const actual = { width: 2, height: 1, data: new Uint8Array([1, 2, 3, 0, 0, 0]) };
    expect(compareFrame(expected, actual).differingPixels).toBe(1);
});
it('rejects incompatible framebuffer dimensions', () => {
    expect(() =>
        compareFrame({ width: 2, height: 1, data: new Uint8Array(6) }, { width: 1, height: 2, data: new Uint8Array(6) })
    ).toThrow('dimensions');
});
it('rejects truncated RGB input', () => {
    expect(() =>
        compareFrame({ width: 2, height: 1, data: new Uint8Array(3) }, { width: 2, height: 1, data: new Uint8Array(6) })
    ).toThrow('length');
});
