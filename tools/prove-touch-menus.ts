import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { decodePng, encodePng } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

/** Prove both 224-row halves of an unmodified native touch-menu canvas capture. */
function prove(): void {
    const [imagePath, output] = process.argv.slice(2);
    if (!imagePath || !output) {
        throw new Error('Usage: node tools/prove-touch-menus.ts native-256x448.png output-directory');
    }
    const image = decodePng(readFileSync(imagePath));
    if (image.width !== 256 || image.height !== 448) {
        throw new Error('Expected the original 256×448 canvas; do not resize or quantize the capture');
    }

    // Every region shares the approved frame's existing four PPU inks
    const reference = JSON.parse(readFileSync('art/home/construction.json', 'utf8')) as HardwareConstruction;
    const palette = reference.palettes[1];
    const colors = displayColors(reference.emphasis);
    const slots = new Uint8Array(image.width * image.height);
    for (let pixel = 0; pixel < slots.length; pixel++) {
        const slot = palette.findIndex((code) =>
            colors[code].every((value, channel) => value === image.data[pixel * 3 + channel])
        );
        if (slot < 0) {
            throw new Error(`Pixel (${pixel % 256},${Math.floor(pixel / 256)}) is outside the approved frame palette`);
        }
        slots[pixel] = slot;
    }

    // Scrolling content is checked as two screen-sized crops, without changing pixels
    mkdirSync(output, { recursive: true });
    for (const top of [0, 224]) {
        const crop = {
            width: 256,
            height: 224,
            data: image.data.subarray(top * 256 * 3, (top + 224) * 256 * 3),
        };
        const construction: HardwareConstruction = {
            profile: 'stock',
            displayPalette: reference.displayPalette,
            emphasis: reference.emphasis,
            width: 256,
            height: 224,
            regionSize: 16,
            palettes: [palette],
            attributes: Array(16 * 14).fill(0),
            backgroundPixels: Buffer.from(slots.subarray(top * 256, (top + 224) * 256)).toString('base64'),
        };
        const report = checkConstruction(construction, crop);
        if (report.status !== 'pass') {
            throw new Error(`Crop at y=${top}: ${report.problems.join('; ')}`);
        }
        writeFileSync(join(output, `${top}.png`), encodePng(crop));
        writeFileSync(join(output, `${top}.json`), `${JSON.stringify(construction, null, 2)}\n`);
        console.log(JSON.stringify({ imagePath, top, ...report }));
    }
}

prove();
