import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './nes-hardware/png.ts';

/** Preserve the complete DW3 corner at native scale with an opaque one-pixel surround. */
function main(): void {
    const original = decodePng(readFileSync('src/styles/frame-source.png'));
    const width = 12;
    const data = new Uint8Array(width * width * 3);
    for (let y = 1; y < width - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const sourceX = x <= 4 ? x - 1 : x <= 6 ? 3 : x - 3;
            const sourceY = y <= 4 ? y - 1 : y <= 6 ? 3 : y - 3;
            const source = (sourceY * original.width + sourceX) * 3;
            data.set(original.data.subarray(source, source + 3), (y * width + x) * 3);
        }
    }
    writeFileSync('src/styles/frame.png', encodePng({ width, height: width, data }));
}

main();
