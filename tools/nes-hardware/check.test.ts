import { describe, expect, it } from 'vitest';
import { checkConstruction, displayColors } from './check.ts';

function example() {
    const palettes = [
        [15, 0, 0x10, 0x30],
        [15, 7, 0x17, 0x27],
    ];
    const background = new Uint8Array(256 * 16).fill(1);
    const attributes = Array.from({ length: 64 }, (_, i) => i % 2);
    const colors = displayColors(1);
    const data = new Uint8Array(background.length * 3);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 256; x++) {
            const attribute = Math.floor(y / 8) * 32 + Math.floor(x / 8);
            data.set(colors[palettes[attributes[attribute]][1]], (y * 256 + x) * 3);
        }
    }
    return {
        construction: {
            profile: 'mmc5-exattr',
            displayPalette: 'composite-direct-fbx',
            emphasis: 1,
            width: 256,
            height: 16,
            regionSize: 8,
            palettes,
            attributes,
            backgroundPixels: Buffer.from(background).toString('base64'),
        },
        image: { width: 256, height: 16, data },
    };
}

describe('explicit NES hardware construction', () => {
    it('accepts per-8px palettes and emphasis for MMC5, but rejects the same declaration as stock hardware', () => {
        const { construction, image } = example();
        expect(checkConstruction(construction, image).status).toBe('pass');
        expect(checkConstruction({ ...construction, profile: 'stock' }, image).status).toBe('fail');
    });
    it('rejects a one-byte off-palette pixel instead of repairing it', () => {
        const { construction, image } = example();
        image.data[0] += 1;
        expect(checkConstruction(construction, image).status).toBe('fail');
    });
    it('rejects independent backdrops and a fifth background palette', () => {
        const { construction, image } = example();
        expect(
            checkConstruction(
                {
                    ...construction,
                    palettes: [
                        [15, 0, 16, 48],
                        [0, 7, 23, 39],
                    ],
                },
                image
            ).status
        ).toBe('fail');
        expect(
            checkConstruction({ ...construction, palettes: Array(5).fill(construction.palettes[0]) }, image).status
        ).toBe('fail');
    });
    it('rejects arbitrary RGB display tables and arbitrary per-pixel emphasis', () => {
        const { construction, image } = example();
        expect(checkConstruction({ ...construction, displayPalette: 'custom' }, image).status).toBe('fail');
        expect(checkConstruction({ ...construction, emphasis: [1, 2] }, image).status).toBe('fail');
    });
    it('counts transparent sprites against scanline and whole-frame budgets', () => {
        const { construction, image } = example();
        const sprite = { x: 8, y: 1, palette: 0, pixels: Buffer.alloc(64).toString('base64') };
        const options = { spriteMode: 8, spritePalettes: [[15, 0, 16, 48]] };
        expect(checkConstruction({ ...construction, ...options, sprites: Array(8).fill(sprite) }, image).status).toBe(
            'pass'
        );
        expect(checkConstruction({ ...construction, ...options, sprites: Array(9).fill(sprite) }, image).status).toBe(
            'fail'
        );
        expect(checkConstruction({ ...construction, ...options, sprites: Array(65).fill(sprite) }, image).status).toBe(
            'fail'
        );
    });
    it('rejects five-color slot patterns and mismatched construction sizes', () => {
        const { construction, image } = example();
        expect(
            checkConstruction({ ...construction, backgroundPixels: Buffer.alloc(4096, 4).toString('base64') }, image)
                .status
        ).toBe('fail');
        expect(checkConstruction({ ...construction, width: 512 }, image).status).toBe('fail');
    });
    it('gives the first opaque OAM entry priority when sprites overlap', () => {
        const { construction, image } = example();
        const first = { x: 8, y: 1, palette: 0, pixels: Buffer.alloc(64, 1).toString('base64') };
        const second = { ...first, pixels: Buffer.alloc(64, 2).toString('base64') };
        const options = { spriteMode: 8, spritePalettes: [[15, 7, 0x17, 0x27]] };
        expect(checkConstruction({ ...construction, ...options, sprites: [first, second] }, image).status).toBe('pass');
        expect(checkConstruction({ ...construction, ...options, sprites: [second, first] }, image).status).toBe('fail');
    });
    it('derives brown-gray from a genuine global emphasis state', () => {
        expect(displayColors(0)[0]).toEqual([101, 101, 101]);
        expect(displayColors(1)[0]).toEqual([125, 92, 75]);
    });
});
