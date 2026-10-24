import { describe, expect, it } from 'vitest';
import { masterPalette } from './palette.ts';
import { renderScreen } from './render.ts';
import { compileTest } from './testScreens.ts';

const master = masterPalette();

function sprite(index: number, fields: Record<string, unknown> = {}) {
    return { tile: 'dot', x: (index % 8) * 8, y: Math.floor(index / 8) * 8, palette: 0, ...fields };
}

function render(fields: Record<string, unknown>) {
    const result = compileTest(fields);
    if (!result.valid || result.screen === undefined) {
        throw new Error(JSON.stringify(result.diagnostics));
    }
    return renderScreen(result.screen, master);
}

function rgb(x: number, y: number, fields: Record<string, unknown>) {
    const image = render(fields);
    const offset = (y * image.width + x) * 3;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
}

describe('sprites', () => {
    it('draws sprite colors over the background and leaves palette index 0 transparent', () => {
        const fields = {
            layers: [{ op: 'fill', x: 0, y: 0, w: 1, h: 1, tile: 'two', palette: 0 }],
            sprites: [{ tile: 'ring', x: 0, y: 0, palette: 0 }],
        };

        expect(rgb(0, 0, fields)).toEqual(Object.values(master.colors[0x02]));
        expect(rgb(1, 1, fields)).toEqual(Object.values(master.colors[0x11]));
    });

    it('keeps a lower sprite index in front when two sprites overlap', () => {
        const fields = {
            sprites: [
                { tile: 'dot', x: 0, y: 0, palette: 0 },
                { tile: 'dot', x: 0, y: 0, palette: 1 },
            ],
        };

        expect(rgb(0, 0, fields)).toEqual(Object.values(master.colors[0x02]));
    });

    it('hides a behind sprite where the background is not the universal color', () => {
        const covered = {
            layers: [{ op: 'fill', x: 0, y: 0, w: 1, h: 1, tile: 'two', palette: 0 }],
            sprites: [{ tile: 'dot', x: 0, y: 0, palette: 0, priority: 'back' }],
        };
        const open = { sprites: [{ tile: 'dot', x: 4, y: 4, palette: 0, priority: 'back' }] };

        expect(rgb(0, 0, covered)).toEqual(Object.values(master.colors[0x11]));
        expect(rgb(4, 4, open)).toEqual(Object.values(master.colors[0x02]));
    });

    it('stacks both tiles of an 8×16 sprite and honors a vertical flip', () => {
        const fields = {
            spriteSize: '8x16',
            sprites: [{ tile: 'dot', below: 'ring', x: 0, y: 0, palette: 1, flipY: true }],
        };

        expect(rgb(1, 1, fields)).toEqual(Object.values(master.colors[0x0f]));
        expect(rgb(0, 8, fields)).toEqual(Object.values(master.colors[0x07]));
    });

    it('rejects the 65th sprite and the 9th sprite on one scanline', () => {
        const tooMany = compileTest({ sprites: Array.from({ length: 65 }, (_, index) => sprite(index)) });
        const crowded = compileTest({ sprites: Array.from({ length: 9 }, () => sprite(0, { y: 3 })) });
        const full = compileTest({ sprites: Array.from({ length: 64 }, (_, index) => sprite(index)) });

        expect(tooMany.valid).toBe(false);
        expect(tooMany.diagnostics[0]).toMatchObject({
            code: 'sprite-limit',
            path: 'sprites',
            message: expect.stringContaining('65 sprites'),
        });
        expect(crowded.diagnostics[0]).toMatchObject({
            code: 'sprite-scanline-limit',
            path: 'sprites[8]',
            message: expect.stringContaining('scanline 3 has 9 sprites'),
        });
        expect(crowded.diagnostics[0].message).toContain('indexes 0, 1, 2, 3, 4, 5, 6, 7, 8');
        expect(full.valid).toBe(true);
    });

    it('rejects an unknown sprite tile and a sprite palette that does not exist', () => {
        const result = compileTest({
            sprites: [{ tile: 'missing', x: 0, y: 0, palette: 4 }],
        });

        expect(result.valid).toBe(false);
        expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
            'tile-reference',
            'palette-reference',
        ]);
    });
});
