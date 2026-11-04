import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction } from './check.ts';
import { decodePng } from './png.ts';
import type { HardwareConstruction } from './rom.ts';

it('keeps the DW3-style corridor thin with pure black everywhere outside its top-view strip', () => {
    const image = decodePng(readFileSync(new URL('../../art/corridor/vertical/overview.png', import.meta.url)));
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

it('keeps the delivered corridor sample within the home palettes and NES sprite budgets', () => {
    const construction = JSON.parse(
        readFileSync(new URL('../../art/corridor/vertical/sample.json', import.meta.url), 'utf8')
    ) as HardwareConstruction;
    const home = JSON.parse(
        readFileSync(new URL('../../art/home/construction.json', import.meta.url), 'utf8')
    ) as HardwareConstruction;
    const image = decodePng(readFileSync(new URL('../../art/corridor/vertical/sample.png', import.meta.url)));
    expect(construction.palettes).toEqual(home.palettes);
    expect(construction.emphasis).toEqual(home.emphasis);
    expect(construction.spritePalettes).toEqual(home.spritePalettes?.slice(0, 2));
    expect(checkConstruction(construction, image)).toMatchObject({
        status: 'pass',
        profile: 'mmc5-exattr',
        attributeSize: 8,
        visibleColors: 9,
        sprites: 8,
        maxSpritesPerScanline: 4,
    });
});

it('proves every tile-aligned viewport of the tall map and preserves the exact sample in its overview', () => {
    const map = JSON.parse(
        readFileSync(new URL('../../art/corridor/vertical/map.json', import.meta.url), 'utf8')
    ) as HardwareConstruction;
    const background = decodePng(readFileSync(new URL('../../art/corridor/vertical/background.png', import.meta.url)));
    const overview = decodePng(readFileSync(new URL('../../art/corridor/vertical/overview.png', import.meta.url)));
    const sample = decodePng(readFileSync(new URL('../../art/corridor/vertical/sample.png', import.meta.url)));
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
