import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './nes-hardware/png.ts';

/** Extract fixed corners and repeatable native tiles from the canonical steel frame raster. */
function main(): void {
    const image = decodePng(readFileSync('src/components/SteelPanel/steel-panel.png'));
    const directory = 'src/components/SteelPanel/tiles';
    mkdirSync(directory, { recursive: true });
    const parts = [
        { name: 'top-left', x: 0, y: 0, width: 8, height: 8 },
        { name: 'top-right', x: 10, y: 0, width: 8, height: 8 },
        { name: 'bottom-left', x: 0, y: 10, width: 8, height: 8 },
        { name: 'bottom-right', x: 10, y: 10, width: 8, height: 8 },
        { name: 'top', x: 8, y: 0, width: 2, height: 8 },
        { name: 'bottom', x: 8, y: 10, width: 2, height: 8 },
        { name: 'left', x: 0, y: 8, width: 8, height: 2 },
        { name: 'right', x: 10, y: 8, width: 8, height: 2 },
    ];
    for (const part of parts) {
        const data = new Uint8Array(8 * 8 * 3);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const source = ((part.y + (y % part.height)) * image.width + part.x + (x % part.width)) * 3;
                data.set(image.data.subarray(source, source + 3), (y * 8 + x) * 3);
            }
        }
        writeFileSync(`${directory}/${part.name}.png`, encodePng({ width: 8, height: 8, data }));
    }
}

main();
