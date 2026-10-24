import { describe, expect, it } from 'vitest';
import { LOGICAL_WIDTH, nesScale } from './nesScale.ts';

describe('nesScale', () => {
    it('keeps the column 256 logical pixels wide', () => {
        expect(LOGICAL_WIDTH).toBe(256);
    });

    it('fills every viewport width with the 256-pixel column', () => {
        expect(nesScale(256)).toEqual({ px: 1, screen: 256, left: 0 });
        expect(nesScale(390)).toEqual({ px: 390 / 256, screen: 390, left: 0 });
        expect(nesScale(1300)).toEqual({ px: 1300 / 256, screen: 1300, left: 0 });
    });

    it('fills a viewport narrower than one screen', () => {
        expect(nesScale(200)).toEqual({ px: 200 / 256, screen: 200, left: 0 });
    });

    it('falls back to one screen when the width is missing', () => {
        expect(nesScale(0)).toEqual({ px: 1, screen: 256, left: 0 });
        expect(nesScale(-4)).toEqual({ px: 1, screen: 256, left: 0 });
    });

    it('does not take a height: a taller page uses the same scale', () => {
        const phone = nesScale(390);

        expect(Object.keys(phone).sort()).toEqual(['left', 'px', 'screen']);
    });
});
