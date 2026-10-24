import { describe, expect, it } from 'vitest';
import { LOGICAL_WIDTH, nesScale } from './nesScale.ts';

describe('nesScale', () => {
    it('keeps the column 256 logical pixels wide', () => {
        expect(LOGICAL_WIDTH).toBe(256);
    });

    it('fills a viewport that is an integer multiple of the logical width', () => {
        expect(nesScale(256, 1)).toEqual({ px: 1, screen: 256, left: 0 });
        expect(nesScale(1280, 1)).toEqual({ px: 5, screen: 1280, left: 0 });
    });

    it('picks the largest integer device-pixel scale and centers the remainder', () => {
        // 390 CSS px at 2x is 780 device px: 3×256 = 768, 12 device px of letterbox
        expect(nesScale(390, 2)).toEqual({ px: 1.5, screen: 384, left: 3 });
        expect(nesScale(1300, 1)).toEqual({ px: 5, screen: 1280, left: 10 });
    });

    it('shrinks to fit a viewport narrower than one screen', () => {
        expect(nesScale(200, 1)).toEqual({ px: 200 / 256, screen: 200, left: 0 });
    });

    it('ignores a missing device pixel ratio', () => {
        expect(nesScale(256, 0)).toEqual({ px: 1, screen: 256, left: 0 });
    });

    it('does not take a height: a taller page uses the same scale', () => {
        const phone = nesScale(390, 2);
        const samePhone = nesScale(390, 2);

        expect(phone).toEqual(samePhone);
        expect(Object.keys(phone).sort()).toEqual(['left', 'px', 'screen']);
    });
});
