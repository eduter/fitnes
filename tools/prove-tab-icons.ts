import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { decodePng } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

/** Verify a real Chromium capture of the home scene and tab bar using the home's shared hardware state. */
function prove(): void {
    const [imagePath, output = 'work/tab-proof'] = process.argv.slice(2);
    if (!imagePath) {
        throw new Error('Usage: node tools/prove-tab-icons.ts capture.png [output-directory]');
    }
    const image = decodePng(readFileSync(imagePath));
    if (image.width !== 256 || image.height !== 240) {
        throw new Error('Capture the proof route at exactly 256×240 logical pixels');
    }
    const reference = JSON.parse(readFileSync('art/home/construction.json', 'utf8')) as HardwareConstruction;
    const colors = displayColors(reference.emphasis);
    const backgroundData = image.data.slice();
    const sprites = [...(reference.sprites ?? [])];
    const windowCode = reference.palettes[0][3];
    const spritePalette = (reference.spritePalettes ?? []).findIndex((codes) => codes.slice(1).includes(windowCode));
    if (spritePalette < 0) {
        throw new Error('The home construction needs its existing gold sprite palette for the lit windows');
    }
    const windowSlot = reference.spritePalettes?.[spritePalette].indexOf(windowCode) ?? 0;

    // Two small window overlays allow light steel edges and gold glass to share the house's tiles
    for (let top = 200; top < 224; top += 8) {
        for (let left = 16; left < 48; left += 8) {
            const pattern = new Uint8Array(64);
            for (let y = top; y < top + 8; y++) {
                for (let x = left; x < left + 8; x++) {
                    if (x < 18 || x >= 42) {
                        continue;
                    }
                    const offset = (y * 256 + x) * 3;
                    if (colors[windowCode].every((value, channel) => value === image.data[offset + channel])) {
                        pattern[(y - top) * 8 + x - left] = windowSlot;
                        backgroundData.set(colors[reference.palettes[0][0]], offset);
                    }
                }
            }
            if (pattern.some((slot) => slot > 0)) {
                sprites.push({
                    x: left,
                    y: top,
                    palette: spritePalette,
                    pixels: Buffer.from(pattern).toString('base64'),
                });
            }
        }
    }
    const attributes = reference.attributes.slice(0, 32 * 23);
    const slots = new Uint8Array(256 * 240);
    slots.set(Buffer.from(reference.backgroundPixels, 'base64').subarray(0, 256 * 184));

    // The scene retains its actual background and all 57 original sprite entries
    for (let top = 184; top < 240; top += 8) {
        for (let left = 0; left < 256; left += 8) {
            const palette = reference.palettes.findIndex((codes) => {
                for (let y = top; y < top + 8; y++) {
                    for (let x = left; x < left + 8; x++) {
                        const rgb = backgroundData.subarray((y * 256 + x) * 3, (y * 256 + x) * 3 + 3);
                        if (!codes.some((code) => colors[code].every((value, channel) => value === rgb[channel]))) {
                            return false;
                        }
                    }
                }
                return true;
            });
            if (palette < 0) {
                throw new Error(`Tile (${left},${top}) needs colors outside the home's existing palettes`);
            }
            attributes.push(palette);
            for (let y = top; y < top + 8; y++) {
                for (let x = left; x < left + 8; x++) {
                    const offset = (y * 256 + x) * 3;
                    slots[y * 256 + x] = reference.palettes[palette].findIndex((code) =>
                        colors[code].every((value, channel) => value === backgroundData[offset + channel])
                    );
                }
            }
        }
    }
    const construction: HardwareConstruction = {
        ...reference,
        height: 240,
        attributes,
        sprites,
        backgroundPixels: Buffer.from(slots).toString('base64'),
    };
    const report = checkConstruction(construction, image);
    if (report.status !== 'pass') {
        throw new Error(report.problems.join('; '));
    }
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'construction.json'), `${JSON.stringify(construction, null, 2)}\n`);
    writeFileSync(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ imagePath, output, ...report }, null, 2));
}

prove();
