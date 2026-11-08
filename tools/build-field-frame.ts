import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

    // Window edges repeat native strips; stretching long border images corrupts their paint under Chromium zoom.
    const directory = 'src/components/Popover/tiles';
    mkdirSync(directory, { recursive: true });
    const tiles: [string, number, number, number, number][] = [
        ['top-left', 0, 0, 5, 5],
        ['top-right', 7, 0, 5, 5],
        ['bottom-left', 0, 7, 5, 5],
        ['bottom-right', 7, 7, 5, 5],
        ['top', 5, 0, 2, 5],
        ['bottom', 5, 7, 2, 5],
        ['left', 0, 5, 5, 2],
        ['right', 7, 5, 5, 2],
    ];
    for (const [name, left, top, tileWidth, tileHeight] of tiles) {
        const tile = new Uint8Array(tileWidth * tileHeight * 3);
        for (let y = 0; y < tileHeight; y++) {
            const start = ((top + y) * width + left) * 3;
            tile.set(data.subarray(start, start + tileWidth * 3), y * tileWidth * 3);
        }
        writeFileSync(`${directory}/${name}.png`, encodePng({ width: tileWidth, height: tileHeight, data: tile }));
    }
}

main();
