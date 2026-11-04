import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { decodePng, encodePng } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

/** Reconstruct native controls captures with the approved four PPU inks, without quantizing any pixel. */
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
    const palette = reference.palettes[1];
    const colors = displayColors(reference.emphasis);
    const slots = new Uint8Array(image.width * image.height);
    for (let pixel = 0; pixel < slots.length; pixel++) {
        const slot = palette.findIndex((code) =>
            colors[code].every((value, channel) => value === image.data[pixel * 3 + channel])
        );
        if (slot < 0) {
            throw new Error(`Pixel (${pixel % 256},${Math.floor(pixel / 256)}) is outside the material palette`);
        }
        slots[pixel] = slot;
    }
    mkdirSync(output, { recursive: true });
    for (let top = 0; top < image.height; top += 240) {
        const height = Math.min(240, image.height - top);
        const crop = { width: 256, height, data: image.data.subarray(top * 256 * 3, (top + height) * 256 * 3) };
        const construction: HardwareConstruction = {
            profile: 'stock',
            displayPalette: reference.displayPalette,
            emphasis: reference.emphasis,
            width: 256,
            height,
            regionSize: 16,
            palettes: [palette],
            attributes: Array(16 * Math.ceil(height / 16)).fill(0),
            backgroundPixels: Buffer.from(slots.subarray(top * 256, (top + height) * 256)).toString('base64'),
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
