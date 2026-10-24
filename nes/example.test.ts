import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileScreenFile } from './compile.ts';
import { masterPalette } from './palette.ts';
import { decodePng, encodePng } from './png.ts';
import { renderScreen } from './render.ts';

const screenPath = 'nes/examples/workout-dashboard.json';
const pngPath = 'nes/examples/workout-dashboard.png';

function rgb(data: Uint8Array, x: number, y: number) {
    const offset = (y * 256 + x) * 3;
    return [data[offset], data[offset + 1], data[offset + 2]];
}

describe('workout dashboard', () => {
    const result = compileScreenFile(screenPath);
    const master = masterPalette();

    it('is a valid 256×240 screen that uses the bottom attribute row', () => {
        expect(result.diagnostics, JSON.stringify(result.diagnostics, null, 2)).toEqual([]);
        expect(result.valid).toBe(true);
        if (result.screen === undefined) {
            throw new Error('screen missing');
        }

        const image = renderScreen(result.screen, master);

        expect(image).toMatchObject({ width: 256, height: 240 });
        expect(result.screen.attributes).toHaveLength(15);
        expect(result.screen.patternTable.length).toBeLessThanOrEqual(256);
        expect(result.screen.sprites).toHaveLength(1);
        expect(rgb(image.data, 4, 48)).toEqual([0, 0, 168]);
        expect(rgb(image.data, 67, 41)).toEqual([252, 252, 252]);
        expect(rgb(image.data, 10, 239)).toEqual([116, 116, 116]);
        expect(rgb(image.data, 243, 8)).toEqual([252, 252, 252]);
        expect(rgb(image.data, 240, 8)).toEqual([24, 60, 92]);
    });

    it('matches the committed PNG byte for byte', () => {
        if (result.screen === undefined) {
            throw new Error('screen missing');
        }

        const encoded = Buffer.from(encodePng(renderScreen(result.screen, master)));
        expect(Buffer.compare(encoded, readFileSync(pngPath))).toBe(0);
        expect(decodePng(readFileSync(pngPath))).toMatchObject({ width: 256, height: 240 });
    });
});
