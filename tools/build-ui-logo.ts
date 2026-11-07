import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './nes-hardware/png.ts';

/** Index the standalone logo into the home's warm background palette without browser filter rounding. */
function main(): void {
    const image = decodePng(readFileSync('docs/fitnes-logo.png'));
    const colors = [
        [0, 0, 0],
        [69, 22, 0],
        [125, 92, 75],
        [255, 214, 121],
    ];
    for (let offset = 0; offset < image.data.length; offset += 3) {
        const luminance =
            (0.2126 * image.data[offset] + 0.7152 * image.data[offset + 1] + 0.0722 * image.data[offset + 2]) / 255;
        image.data.set(colors[Math.min(3, Math.floor(luminance * 4))], offset);
    }
    writeFileSync('src/app/logo.png', encodePng(image));
}

main();
