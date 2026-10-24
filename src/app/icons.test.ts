import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { masterPalette } from '../../nes/palette.ts';
import { assessPicture } from '../../nes/pictureCheck.ts';
import { decodePng, type RgbImage } from '../../nes/png.ts';

const assets = dirname(fileURLToPath(new URL('../assets/logo.png', import.meta.url)));

describe('quantized art', () => {
    it('draws the poster and the bar within the console limits', () => {
        const picture = solid(256, 256);
        paint(picture, 0, 0, 16, 16, [0x00, 0x00, 0xa8]);
        setPixel(picture, 1, 1, [0xfc, 0xfc, 0xfc]);
        setPixel(picture, 2, 1, [0xf0, 0xbc, 0x3c]);
        blit(picture, readAsset('logo.png'), 16, 0);
        blit(picture, readAsset('hero.png'), 0, 96);
        const names = ['home.png', 'plan.png', 'move.png', 'body.png', 'history.png'];
        names.forEach((name, index) => {
            blit(picture, readAsset(name), 16 + index * 48, 224);
        });

        expect(assessPicture(picture, masterPalette(), { patternLimit: false })).toEqual([]);
    });
});

function readAsset(name: string): RgbImage {
    return decodePng(readFileSync(join(assets, name)));
}

function solid(width: number, height: number): RgbImage {
    return { width, height, data: new Uint8Array(width * height * 3) };
}

function blit(target: RgbImage, source: RgbImage, originX: number, originY: number): void {
    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            const from = (y * source.width + x) * 3;
            const to = ((originY + y) * target.width + originX + x) * 3;
            target.data.set(source.data.subarray(from, from + 3), to);
        }
    }
}

function paint(image: RgbImage, x: number, y: number, width: number, height: number, color: readonly number[]): void {
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            setPixel(image, column, row, color);
        }
    }
}

function setPixel(image: RgbImage, x: number, y: number, color: readonly number[]): void {
    image.data.set(color, (y * image.width + x) * 3);
}
