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

    it('rejects an 8×8 tile that uses a fifth color', () => {
        const picture = solid(256, 16, 15);
        for (const [x, index] of [0, 2, 16, 32, 40].entries()) {
            setPixel(picture, x, 0, rgb(index));
        }

        const problems = assessPicture(picture, palette);

        expect(problems.map((problem) => problem.code)).toContain('tile-colors');
    });

    it('rejects a 16×16 region whose tiles do not share one subpalette', () => {
        const picture = solid(256, 16, 15);
        paintRect(picture, 0, 0, 8, 8, 0);
        setPixel(picture, 0, 0, rgb(40));
        paintRect(picture, 8, 0, 8, 8, 2);
        paintRect(picture, 0, 8, 8, 8, 16);
        paintRect(picture, 8, 8, 8, 8, 32);

        const problems = assessPicture(picture, palette);
        const codes = problems.map((problem) => problem.code);

        expect(codes).toContain('attribute-colors');
        expect(codes).not.toContain('tile-colors');
    });

    it('rejects five subpalettes even when each region is legal alone', () => {
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

        const problems = assessPicture(picture, palette);

        expect(problems.map((problem) => problem.code)).toContain('subpalette-limit');
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
});

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
