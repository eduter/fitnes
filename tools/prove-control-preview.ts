import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { decodePng, encodePng } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

/** Reconstruct native controls captures with the approved material and action PPU inks, without quantizing any pixel. */
function main(): void {
    const [imagePath, output] = process.argv.slice(2);
    if (!imagePath || !output) {
        throw new Error('Usage: node tools/prove-control-preview.ts native-capture.png output-directory');
    }
    const image = decodePng(readFileSync(imagePath));
    if (image.width !== 256) {
        throw new Error('Controls proof requires an unscaled 256-pixel-wide Chromium capture');
    }
    const reference = JSON.parse(readFileSync('art/home/construction.json', 'utf8')) as HardwareConstruction;
    const material = reference.palettes[1];
    const action = reference.palettes[0][3];
    const palettes = [
        material,
        [material[0], material[1], material[2], action],
        [material[0], material[1], material[3], action],
        [material[0], material[2], material[3], action],
    ];
    const inks = [...new Set(palettes.flat())];
    const colors = displayColors(reference.emphasis);
    const slots = new Uint8Array(image.width * image.height);
    for (let pixel = 0; pixel < slots.length; pixel++) {
        const slot = inks.findIndex((code) =>
            colors[code].every((value, channel) => value === image.data[pixel * 3 + channel])
        );
        if (slot < 0) {
            throw new Error(
                `Pixel (${pixel % 256},${Math.floor(pixel / 256)}) is outside the shared material/action inks`
            );
        }
        slots[pixel] = inks[slot];
    }
    mkdirSync(output, { recursive: true });
    for (let top = 0; top < image.height; top += 240) {
        const height = Math.min(240, image.height - top);
        const crop = { width: 256, height, data: image.data.subarray(top * 256 * 3, (top + height) * 256 * 3) };
        const attributes: number[] = [];
        const background = new Uint8Array(256 * height);
        for (let y = 0; y < height; y += 8) {
            for (let x = 0; x < 256; x += 8) {
                const palette = palettes.findIndex((codes) => {
                    for (let dy = y; dy < Math.min(y + 8, height); dy++) {
                        for (let dx = x; dx < x + 8; dx++) {
                            if (!codes.includes(slots[(top + dy) * 256 + dx])) {
                                return false;
                            }
                        }
                    }
                    return true;
                });
                if (palette < 0) {
                    throw new Error(`Tile (${x},${top + y}) exceeds a four-ink background palette`);
                }
                attributes.push(palette);
                for (let dy = y; dy < Math.min(y + 8, height); dy++) {
                    for (let dx = x; dx < x + 8; dx++) {
                        background[dy * 256 + dx] = palettes[palette].indexOf(slots[(top + dy) * 256 + dx]);
                    }
                }
            }
        }
        const construction: HardwareConstruction = {
            profile: 'mmc5-exattr',
            displayPalette: reference.displayPalette,
            emphasis: reference.emphasis,
            width: 256,
            height,
            regionSize: 8,
            palettes,
            attributes,
            backgroundPixels: Buffer.from(background).toString('base64'),
        };
        const report = checkConstruction(construction, crop);
        if (report.status !== 'pass') {
            throw new Error(report.problems.join('; '));
        }
        writeFileSync(join(output, `${top}.png`), encodePng(crop));
        writeFileSync(join(output, `${top}.json`), `${JSON.stringify(construction, null, 2)}\n`);
        console.log(JSON.stringify({ imagePath, top, ...report }));
    }
}

main();
