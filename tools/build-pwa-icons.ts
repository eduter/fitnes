import { readFileSync, writeFileSync } from 'node:fs';
import type { RgbImage } from './nes-hardware/png.ts';
import { decodePng, encodePng } from './nes-hardware/png.ts';

const crop = { left: 83, top: 65, size: 90 };

/** Generate opaque, unmasked launcher assets from the owner's approved hero crop. */
function main(): void {
    const hero = decodePng(readFileSync('art/home/gym.png'));
    if (crop.left + crop.size > hero.width || crop.top + crop.size > hero.height) {
        throw new Error('Approved PWA crop extends outside art/home/gym.png');
    }

    // Let Android apply its launcher mask to the full-bleed scene
    for (const size of [64, 192, 512]) {
        writeFileSync(`public/pwa-${size}x${size}.png`, renderCrop(hero, size));
    }
    writeFileSync('public/maskable-icon-512x512.png', renderCrop(hero, 512));
    writeFileSync('public/apple-touch-icon-180x180.png', renderCrop(hero, 180));

    // Embed the native crop so the scalable favicon preserves the original pixels
    const native = Buffer.from(renderCrop(hero, crop.size)).toString('base64');
    writeFileSync(
        'public/favicon.svg',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" role="img" aria-label="FitNES">
  <image width="90" height="90" image-rendering="pixelated" href="data:image/png;base64,${native}" />
</svg>
`
    );

    // Modern Chromium supports a PNG payload inside an ICO directory entry
    const png = renderCrop(hero, 48);
    const directory = Buffer.alloc(22);
    directory.writeUInt16LE(1, 2);
    directory.writeUInt16LE(1, 4);
    directory[6] = 48;
    directory[7] = 48;
    directory.writeUInt16LE(1, 10);
    directory.writeUInt16LE(32, 12);
    directory.writeUInt32LE(png.length, 14);
    directory.writeUInt32LE(directory.length, 18);
    writeFileSync('public/favicon.ico', Buffer.concat([directory, png]));
}

function renderCrop(hero: RgbImage, size: number): Uint8Array {
    const data = new Uint8Array(size * size * 3);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const sourceX = crop.left + Math.floor((x * crop.size) / size);
            const sourceY = crop.top + Math.floor((y * crop.size) / size);
            const source = (sourceY * hero.width + sourceX) * 3;
            data.set(hero.data.subarray(source, source + 3), (y * size + x) * 3);
        }
    }
    return encodePng({ width: size, height: size, data });
}

main();
