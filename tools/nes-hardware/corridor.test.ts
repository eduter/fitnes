import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction, displayColors } from './check.ts';
import { decodePng } from './png.ts';
import type { HardwareConstruction } from './rom.ts';

const ROOT = new URL('../../docs/design/corridor-interstitial/corridors/', import.meta.url);
const VERSIONS = ['thin-top-view', 'wide-basement'];

it('keeps the DW3-style corridor thin with pure black everywhere outside its top-view strip', () => {
    const image = decodePng(readAsset('thin-top-view', 'overview.png'));
    let coloredOutsideCorridor = 0;
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            if (x >= 104 && x < 152 && y >= 16 && y < 368) {
                continue;
            }
            const offset = (y * image.width + x) * 3;
            if (image.data.subarray(offset, offset + 3).some((channel) => channel !== 0)) {
                coloredOutsideCorridor++;
            }
        }
    }
    expect(coloredOutsideCorridor).toBe(0);
});

it.each(VERSIONS)('keeps the %s sample within the home palettes and NES sprite budgets', (version) => {
    const construction = JSON.parse(readAsset(version, 'sample.json').toString()) as HardwareConstruction;
    const home = JSON.parse(
        readFileSync(new URL('../../art/home/construction.json', import.meta.url), 'utf8')
    ) as HardwareConstruction;
    const image = decodePng(readAsset(version, 'sample.png'));
    expect(construction.palettes).toEqual(home.palettes);
    expect(construction.emphasis).toEqual(home.emphasis);
    // Corridor sprites retain their own allocation as the adopted hero evolves
    expect(construction.spritePalettes?.[0]).toEqual(home.spritePalettes?.[0]);
    const homeCodes = new Set([...home.palettes.flat(), ...(home.spritePalettes ?? []).flat()]);
    for (const code of construction.spritePalettes?.flat() ?? []) {
        expect(homeCodes.has(code)).toBe(true);
    }
    expect(checkConstruction(construction, image)).toMatchObject({
        status: 'pass',
        profile: 'mmc5-exattr',
        attributeSize: 8,
        visibleColors: 9,
        sprites: 8,
        maxSpritesPerScanline: 4,
    });
});

it.each(VERSIONS)('proves every %s viewport and preserves the exact sample in its overview', (version) => {
    const map = JSON.parse(readAsset(version, 'map.json').toString()) as HardwareConstruction;
    const background = decodePng(readAsset(version, 'background.png'));
    const overview = decodePng(readAsset(version, 'overview.png'));
    const sample = decodePng(readAsset(version, 'sample.png'));
    expect([background.width, background.height]).toEqual([256, 384]);
    expect([overview.width, overview.height]).toEqual([256, 384]);
    for (let scrollY = 0; scrollY <= 144; scrollY += 8) {
        const construction = {
            ...map,
            height: 240,
            attributes: map.attributes.slice((scrollY / 8) * 32, ((scrollY + 240) / 8) * 32),
            backgroundPixels: Buffer.from(map.backgroundPixels, 'base64')
                .subarray(scrollY * 256, (scrollY + 240) * 256)
                .toString('base64'),
        };
        const image = { width: 256, height: 240, data: background.data.slice(scrollY * 768, (scrollY + 240) * 768) };
        expect(checkConstruction(construction, image).status, `scrollY=${scrollY}`).toBe('pass');
    }
    expect(overview.data.subarray(0, 144 * 768)).toEqual(background.data.subarray(0, 144 * 768));
    expect(overview.data.subarray(144 * 768)).toEqual(sample.data);
});

it.each(VERSIONS)('reconstructs the %s map and palette colors exactly from its delivered tile atlas', (version) => {
    const map = JSON.parse(readAsset(version, 'map.json').toString()) as HardwareConstruction;
    const atlas = JSON.parse(readAsset(version, 'tiles.json').toString()) as TileAtlas;
    const image = decodePng(readAsset(version, 'tiles.png'));
    expect(atlas.tileSize).toBe(8);
    expect([atlas.width, atlas.height]).toEqual([map.width, map.height]);
    expect(image.width).toBe(atlas.columns * 8);
    expect(image.height).toBe(Math.ceil(atlas.tiles.length / atlas.columns) * 8);
    expect(atlas.placements).toHaveLength(map.attributes.length);

    const reconstructed = new Uint8Array(map.width * map.height);
    const attributes: number[] = [];
    for (const [index, tileId] of atlas.placements.entries()) {
        const tile = atlas.tiles[tileId];
        const pixels = Buffer.from(tile.pixels, 'base64');
        attributes.push(tile.palette);
        for (let y = 0; y < 8; y++) {
            reconstructed.set(
                pixels.subarray(y * 8, (y + 1) * 8),
                (Math.floor(index / 32) * 8 + y) * 256 + (index % 32) * 8
            );
        }
    }
    expect(attributes).toEqual(map.attributes);
    expect(Buffer.from(reconstructed)).toEqual(Buffer.from(map.backgroundPixels, 'base64'));

    const expected = new Uint8Array(image.data.length);
    const colors = displayColors(map.emphasis);
    for (const [index, tile] of atlas.tiles.entries()) {
        const pixels = Buffer.from(tile.pixels, 'base64');
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const pixel =
                    (Math.floor(index / atlas.columns) * 8 + y) * image.width + (index % atlas.columns) * 8 + x;
                expected.set(colors[map.palettes[tile.palette][pixels[y * 8 + x]]], pixel * 3);
            }
        }
    }
    expect(image.data).toEqual(expected);
});

interface TileAtlas {
    tileSize: number;
    columns: number;
    width: number;
    height: number;
    tiles: { palette: number; pixels: string }[];
    placements: number[];
}

function readAsset(version: string, filename: string): Buffer {
    return readFileSync(new URL(`${version}/${filename}`, ROOT));
}
