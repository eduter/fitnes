import { describe, expect, it } from 'vitest';
import { masterPalette } from './palette.ts';
import { assessPicture } from './pictureCheck.ts';
import type { RgbImage } from './png.ts';

const palette = masterPalette();

describe('assessPicture', () => {
    it('accepts a 256-wide column painted in one subpalette', () => {
        const picture = solid(256, 32, 15);
        paintRect(picture, 0, 0, 16, 16, 2);
        paintRect(picture, 4, 4, 8, 8, 32);

        expect(assessPicture(picture, palette)).toEqual([]);
    });

    it('rejects a width other than the 256-pixel column', () => {
        const problems = assessPicture(solid(200, 16, 15), palette);

        expect(problems.map((problem) => problem.code)).toEqual(['picture-size']);
    });

    it('names the first pixel that is not in the master palette', () => {
        const picture = solid(256, 16, 15);
        setPixel(picture, 3, 4, [1, 2, 3]);

        const problems = assessPicture(picture, palette);

        expect(problems.map((problem) => problem.code)).toContain('off-palette');
        expect(problems.find((problem) => problem.code === 'off-palette')?.message).toContain('(3,4)');
    });

    it('accepts a fifth color when one sprite covers it', () => {
        const picture = solid(256, 16, 15);
        for (const [x, index] of [0, 2, 16, 32, 40].entries()) {
            setPixel(picture, x, 0, rgb(index));
        }

        expect(assessPicture(picture, palette)).toEqual([]);
    });

    it('accepts three sprite colors layered on a full background tile', () => {
        const picture = solid(256, 16, 15);
        saturate(picture, 0, 0);
        setPixel(picture, 1, 0, rgb(16));
        setPixel(picture, 2, 0, rgb(17));
        setPixel(picture, 3, 0, rgb(18));

        expect(assessPicture(picture, palette)).toEqual([]);
    });

    it('accepts an attribute region whose odd tile is a sprite', () => {
        const picture = solid(256, 16, 15);
        paintRect(picture, 0, 0, 8, 8, 0);
        setPixel(picture, 0, 0, rgb(40));
        paintRect(picture, 8, 0, 8, 8, 2);
        paintRect(picture, 0, 8, 8, 8, 16);
        paintRect(picture, 8, 8, 8, 8, 32);

        expect(assessPicture(picture, palette)).toEqual([]);
    });

    it('lets a sprite carry a fifth subpalette when the region is small enough to cover', () => {
        const picture = solid(256, 16, 15);
        const bundles = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [9, 10, 11],
            [12, 16, 17],
        ];
        bundles.forEach((bundle, region) => {
            bundle.forEach((index, column) => {
                paintRect(picture, region * 16 + column * 2, 0, 2, 16, index);
            });
        });

        expect(assessPicture(picture, palette)).toEqual([]);
    });

    it('rejects a fifth subpalette spread across a full scanline', () => {
        const picture = solid(256, 80, 15);
        const bands: readonly (readonly [number, number, number])[] = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [9, 10, 11],
            [16, 17, 18],
        ];
        bands.forEach((colors, band) => {
            for (let y = band * 16; y < band * 16 + 16; y++) {
                for (let x = 0; x < picture.width; x++) {
                    const index = colors[x % 3];
                    if (index !== undefined) {
                        setPixel(picture, x, y, rgb(index));
                    }
                }
            }
        });

        const problems = assessPicture(picture, palette);

        expect(problems.map((problem) => problem.code)).toContain('sprite-scanline-limit');
    });

    it('accepts eight sprite dots on one scanline and rejects a ninth', () => {
        const eight = dotsOnALine(8);
        const nine = dotsOnALine(9);

        expect(assessPicture(eight, palette)).toEqual([]);
        expect(assessPicture(nine, palette).map((problem) => problem.code)).toContain('sprite-scanline-limit');
    });

    it('accepts twelve sprite colors and rejects a thirteenth', () => {
        const twelve = spriteColors(12);
        const thirteen = spriteColors(13);

        expect(assessPicture(twelve, palette)).toEqual([]);
        expect(assessPicture(thirteen, palette).map((problem) => problem.code)).toContain('sprite-palette');
    });

    it('accepts 64 sprites on one screen and rejects the 65th', () => {
        const full = spriteGrid(8, 8);
        const overflow = spriteGrid(8, 8, 1);

        expect(assessPicture(full, palette)).toEqual([]);
        expect(assessPicture(overflow, palette).map((problem) => problem.code)).toContain('sprite-limit');
    });

    it('reuses the 64 sprite slots further down a scrolling page', () => {
        const picture = solid(256, 400, 15);
        stampGrid(picture, 0, 8, 5);
        stampGrid(picture, 320, 8, 5);

        expect(assessPicture(picture, palette)).toEqual([]);
    });

    it('rejects two sprite clusters that land in one 240-line window', () => {
        const picture = solid(256, 160, 15);
        stampGrid(picture, 0, 8, 5);
        stampGrid(picture, 80, 8, 5);

        expect(assessPicture(picture, palette).map((problem) => problem.code)).toContain('sprite-limit');
    });

    it('rejects a picture with more than 256 distinct tiles', () => {
        const picture = solid(256, 80, 15);
        const white = rgb(32);

        for (let tile = 0; tile < 32 * 10; tile++) {
            const originX = (tile % 32) * 8;
            const originY = Math.floor(tile / 32) * 8;
            for (let bit = 0; bit < 8; bit++) {
                if ((tile & (1 << bit)) !== 0) {
                    setPixel(picture, originX + bit, originY, white);
                }
            }
            if (tile >= 256) {
                setPixel(picture, originX, originY + 1, white);
            }
        }

        const problems = assessPicture(picture, palette);

        expect(problems.map((problem) => problem.code)).toEqual(['pattern-limit']);
    });

    it('allows unlimited tiles when the pattern table is not the limit being checked', () => {
        const picture = solid(256, 80, 15);
        const white = rgb(32);

        for (let tile = 0; tile < 32 * 10; tile++) {
            const originX = (tile % 32) * 8;
            const originY = Math.floor(tile / 32) * 8;
            for (let bit = 0; bit < 8; bit++) {
                if ((tile & (1 << bit)) !== 0) {
                    setPixel(picture, originX + bit, originY, white);
                }
            }
            if (tile >= 256) {
                setPixel(picture, originX, originY + 1, white);
            }
        }

        expect(assessPicture(picture, palette, { patternLimit: false })).toEqual([]);
    });
});

/** Indexes with distinct RGB in the FCEUX table, skipping shared blacks and whites. */
const DISTINCT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];

function dotsOnALine(count: number): RgbImage {
    const picture = solid(256, 16, 15);
    for (let index = 0; index < count; index++) {
        saturate(picture, index, 0);
        setPixel(picture, index * 16, 0, rgb(16));
    }
    return picture;
}

function spriteColors(count: number): RgbImage {
    const picture = solid(256, 16, 15);
    saturate(picture, 0, 0);
    for (let index = 0; index < count; index++) {
        const color = DISTINCT[index + 3];
        if (color === undefined) {
            throw new Error(`need ${count} distinct sprite colors`);
        }
        setPixel(picture, index, 1, rgb(color));
    }
    return picture;
}

function spriteGrid(columns: number, rows: number, extra = 0): RgbImage {
    const height = (rows + (extra > 0 ? 1 : 0)) * 16;
    const picture = solid(256, height, 15);
    stampGrid(picture, 0, columns, rows);
    if (extra > 0) {
        stampGrid(picture, rows * 16, extra, 1);
    }
    return picture;
}

function stampGrid(picture: RgbImage, originY: number, columns: number, rows: number): void {
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = column * 16;
            const y = originY + row * 16;
            saturate(picture, x / 16, y / 16);
            setPixel(picture, x, y, rgb(16));
        }
    }
}

/**
 * Paint black and three other colors in equal blocks.
 * A single dot on top cannot join that subpalette.
 */
function saturate(picture: RgbImage, regionX: number, regionY: number): void {
    const originX = regionX * 16;
    const originY = regionY * 16;
    const colors = [15, 0, 1, 2];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const index = colors[(x % 2) + (y % 2) * 2];
            if (index !== undefined) {
                setPixel(picture, originX + x, originY + y, rgb(index));
            }
        }
    }
}

function solid(width: number, height: number, index: number): RgbImage {
    const color = rgb(index);
    const data = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        data.set(color, i * 3);
    }
    return { width, height, data };
}

function paintRect(image: RgbImage, x: number, y: number, width: number, height: number, index: number): void {
    const color = rgb(index);
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            image.data.set(color, (row * image.width + column) * 3);
        }
    }
}

function setPixel(image: RgbImage, x: number, y: number, color: readonly number[]): void {
    image.data.set(color, (y * image.width + x) * 3);
}

function rgb(index: number): [number, number, number] {
    const color = palette.colors[index];
    if (color === undefined) {
        throw new Error(`missing palette index ${index}`);
    }
    return [color.r, color.g, color.b];
}
