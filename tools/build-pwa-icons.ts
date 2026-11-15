import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './nes-hardware/png.ts';
import { renderPwaIcon } from './pwa-icon.ts';

/** Generate opaque launcher assets with the adopted CRT mask and approved hero crop. */
function main(): void {
    const hero = decodePng(readFileSync('art/home/gym.png'));

    // Let Android apply its launcher mask to the full-bleed scene
    for (const size of [64, 192, 512]) {
        writeFileSync(`public/pwa-${size}x${size}.png`, encodePng(renderPwaIcon(hero, size)));
    }
    writeFileSync('public/maskable-icon-512x512.png', encodePng(renderPwaIcon(hero, 512)));
    writeFileSync('public/apple-touch-icon-180x180.png', encodePng(renderPwaIcon(hero, 180)));

    // Preserve the rounded spots in the scalable favicon, rather than flattening them at 90px
    const image = Buffer.from(encodePng(renderPwaIcon(hero, 512))).toString('base64');
    writeFileSync(
        'public/favicon.svg',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" role="img" aria-label="FitNES">
  <image width="90" height="90" href="data:image/png;base64,${image}" />
</svg>
`
    );

    // Modern Chromium supports a PNG payload inside an ICO directory entry
    const png = encodePng(renderPwaIcon(hero, 48));
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

main();
