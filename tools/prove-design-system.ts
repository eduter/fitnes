import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { decodePng, encodePng } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

/** Reconstruct a native showcase capture with the home's shared background and sprite palettes. */
function main(): void {
    const [imagePath, output, mode] = process.argv.slice(2);
    if (!imagePath || !output) {
        throw new Error('Usage: node tools/prove-design-system.ts native-capture.png output-directory [ui]');
    }
    const image = decodePng(readFileSync(imagePath));
    if (image.width !== 256) {
        throw new Error('Design-system proof requires a native 256px-wide capture');
    }
    const home = JSON.parse(readFileSync('art/home/construction.json', 'utf8')) as HardwareConstruction;
    const colors = displayColors(home.emphasis);
    const codes = [...new Set([...home.palettes.flat(), ...(home.spritePalettes ?? []).flat()])];
    const indexed = new Uint8Array(image.width * image.height);
    for (let i = 0; i < indexed.length; i++) {
        const code = codes.find((candidate) => colors[candidate].every((v, c) => v === image.data[i * 3 + c]));
        if (code === undefined) {
            throw new Error(`Pixel (${i % 256},${Math.floor(i / 256)}) is outside the home palette`);
        }
        indexed[i] = code;
    }
    mkdirSync(output, { recursive: true });
    for (let top = 0; top < image.height; top += 240) {
        const height = Math.min(240, image.height - top);
        const crop = { width: 256, height, data: image.data.subarray(top * 256 * 3, (top + height) * 256 * 3) };
        const background = new Uint8Array(256 * height);
        const construction: HardwareConstruction = {
            profile: home.profile,
            displayPalette: home.displayPalette,
            emphasis: home.emphasis,
            width: 256,
            height,
            regionSize: 8,
            palettes: home.palettes,
            spritePalettes: home.spritePalettes,
            spriteMode: home.spriteMode,
            attributes: [],
            backgroundPixels: '',
            sprites: [],
        };
        // Preserve the proven home composition rather than reassigning its sprite pixels
        if (top === 0 && mode !== 'ui') {
            background.set(Buffer.from(home.backgroundPixels, 'base64'));
            construction.sprites = [...(home.sprites ?? [])];
        }
        for (let y = 0; y < height; y += 8) {
            for (let x = 0; x < 256; x += 8) {
                if (top === 0 && mode !== 'ui' && y < home.height) {
                    construction.attributes.push(home.attributes[(y / 8) * 32 + x / 8]);
                    continue;
                }
                const pixels = Array.from({ length: 64 }, (_, i) => {
                    const row = y + Math.floor(i / 8);
                    return row < height ? indexed[(top + row) * 256 + x + (i % 8)] : 15;
                });
                const candidates = home.palettes
                    .map((palette, paletteIndex) => {
                        const missing = pixels.filter((code) => !palette.includes(code));
                        const spritePalette =
                            home.spritePalettes?.findIndex((ink) =>
                                missing.every((code) => ink.slice(1).includes(code))
                            ) ?? -1;
                        return { palette, paletteIndex, missing, spritePalette };
                    })
                    .filter(({ missing, spritePalette }) => !missing.length || spritePalette >= 0)
                    .sort((a, b) => a.missing.length - b.missing.length);
                const choice = candidates[0];
                if (!choice) {
                    throw new Error(`No home-palette allocation at (${x},${top + y})`);
                }
                construction.attributes.push(choice.paletteIndex);
                const sprite = new Uint8Array(64);
                for (let i = 0; i < 64; i++) {
                    const slot = choice.palette.indexOf(pixels[i]);
                    const row = y + Math.floor(i / 8);
                    if (row < height) {
                        background[row * 256 + x + (i % 8)] = Math.max(0, slot);
                    }
                    if (slot < 0) {
                        sprite[i] = home.spritePalettes?.[choice.spritePalette].indexOf(pixels[i]) ?? 0;
                    }
                }
                if (choice.missing.length) {
                    // NES sprites start at row one; shift a transparent top row without changing visible pixels.
                    const shiftTop = y === 0 && sprite.subarray(0, 8).every((slot) => slot === 0);
                    const pattern = shiftTop ? new Uint8Array([...sprite.subarray(8), ...new Uint8Array(8)]) : sprite;
                    construction.sprites?.push({
                        x,
                        y: shiftTop ? 1 : y,
                        palette: choice.spritePalette,
                        pixels: Buffer.from(pattern).toString('base64'),
                    });
                }
            }
        }
        construction.backgroundPixels = Buffer.from(background).toString('base64');
        const report = checkConstruction(construction, crop);
        if (report.status !== 'pass') {
            throw new Error(`Crop ${top}: ${report.problems.join('; ')}`);
        }
        writeFileSync(join(output, `${top}.png`), encodePng(crop));
        writeFileSync(join(output, `${top}.json`), `${JSON.stringify(construction, null, 2)}\n`);
        console.log(JSON.stringify({ top, ...report }));
    }
}

main();
