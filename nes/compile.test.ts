import { describe, expect, it } from 'vitest';
import type { AssetDocument } from './assets.ts';
import { compileScreen } from './compile.ts';
import { masterPalette } from './palette.ts';
import { renderScreen } from './render.ts';
import { compileTest, testScreen } from './testScreens.ts';

const master = masterPalette();

function codes(fields: Record<string, unknown>) {
    return compileTest(fields).diagnostics.map((diagnostic) => diagnostic.code);
}

describe('compileScreen constraints', () => {
    it('accepts an empty 256×240 screen', () => {
        const result = compileTest();

        expect(result.valid).toBe(true);
        expect(result.screen?.nametable).toHaveLength(30);
        expect(result.screen?.nametable[0]).toHaveLength(32);
        expect(result.screen?.attributeTable).toHaveLength(64);
    });

    it('rejects a screen that is not 256×240', () => {
        const result = compileTest({ width: 320, height: 224 });

        expect(result.valid).toBe(false);
        expect(result.diagnostics).toEqual([
            expect.objectContaining({
                code: 'screen-dimensions',
                path: 'width',
                message: expect.stringContaining('320'),
            }),
            expect.objectContaining({
                code: 'screen-dimensions',
                path: 'height',
                message: expect.stringContaining('224'),
            }),
        ]);
    });

    it('rejects palette indexes outside the 64-color master palette', () => {
        const result = compileTest({
            palettes: {
                universal: '$40',
                background: [
                    ['$01', '$11', 'nope'],
                    ['$01', '$11', '$21'],
                    ['$01', '$11', '$21'],
                    ['$01', '$11', '$21'],
                ],
            },
        });

        expect(result.screen).toBeUndefined();
        expect(result.diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
            'palettes.universal',
            'palettes.background[0][2]',
        ]);
    });

    it('rejects a subpalette that does not list exactly three colors', () => {
        const result = compileTest({
            palettes: {
                universal: '$0F',
                background: [
                    ['$01', '$11'],
                    ['$01', '$11', '$21'],
                    ['$01', '$11', '$21'],
                    ['$01', '$11', '$21'],
                ],
            },
        });

        expect(result.diagnostics[0]).toMatchObject({
            code: 'palette-shape',
            path: 'palettes.background[0]',
            message: expect.stringContaining('lists 2 colors'),
        });
    });

    it('rejects an unknown tile and names the layer', () => {
        const result = compileTest({
            layers: [{ op: 'fill', id: 'hud', x: 1, y: 2, w: 1, h: 1, tile: 'nope', palette: 0 }],
        });

        expect(result.valid).toBe(false);
        expect(result.diagnostics[0]).toMatchObject({
            code: 'tile-reference',
            path: 'layers[0]',
            message: expect.stringContaining("unknown background tile 'nope'"),
        });
    });

    it('rejects a background subpalette outside 0–3', () => {
        expect(codes({ layers: [{ op: 'fill', x: 0, y: 0, w: 1, h: 1, tile: 'one', palette: 4 }] })).toEqual([
            'palette-reference',
        ]);
    });

    it('rejects two subpalettes inside one 16×16 region, with both tile names', () => {
        const result = compileTest({
            layers: [
                { op: 'fill', x: 0, y: 0, w: 1, h: 1, tile: 'one', palette: 0 },
                { op: 'fill', x: 1, y: 1, w: 1, h: 1, tile: 'two', palette: 2 },
            ],
        });

        expect(result.valid).toBe(false);
        expect(result.screen).toBeDefined();
        expect(result.diagnostics[0]).toMatchObject({
            code: 'attribute-conflict',
            message: expect.stringContaining("tile (0,0) 'one'"),
        });
        expect(result.diagnostics[0].message).toContain("tile (1,1) 'two'");
        expect(result.diagnostics[0].message).toContain('region (0,0)');
    });

    it('allows a palette change on the next 16-pixel boundary, including above the bottom row', () => {
        const result = compileTest({
            layers: [
                { op: 'fill', x: 1, y: 0, w: 1, h: 1, tile: 'one', palette: 0 },
                { op: 'fill', x: 2, y: 0, w: 1, h: 1, tile: 'two', palette: 1 },
                { op: 'fill', x: 0, y: 26, w: 2, h: 2, tile: 'one', palette: 0 },
                { op: 'fill', x: 0, y: 28, w: 2, h: 2, tile: 'two', palette: 1 },
            ],
        });

        expect(result.diagnostics).toEqual([]);
        expect(result.valid).toBe(true);
    });

    it('rejects a palette conflict in the bottom 16 pixels and keeps that region in the attribute table', () => {
        const conflict = compileTest({
            layers: [
                { op: 'fill', x: 0, y: 28, w: 1, h: 1, tile: 'one', palette: 0 },
                { op: 'fill', x: 0, y: 29, w: 1, h: 1, tile: 'two', palette: 1 },
            ],
        });
        const agreed = compileTest({
            layers: [{ op: 'fill', x: 0, y: 28, w: 2, h: 2, tile: 'one', palette: 3 }],
        });

        expect(conflict.valid).toBe(false);
        expect(conflict.diagnostics[0].message).toContain('region (0,14) at pixels x 0–15, y 224–239');
        expect(agreed.valid).toBe(true);
        expect(agreed.screen?.attributes).toHaveLength(15);
        expect(agreed.screen?.attributeTable[56]).toBe(0x03);
    });

    it('rejects sixteen attribute rows', () => {
        const rows = Array.from({ length: 16 }, () => '0'.repeat(16));

        expect(compileTest({ attributes: rows }).diagnostics[0]).toMatchObject({
            code: 'attribute-grid',
            message: expect.stringContaining('has 16 rows'),
        });
    });

    it('rejects a tile placed outside the 32×30 nametable', () => {
        const result = compileTest({
            layers: [{ op: 'fill', x: 31, y: 29, w: 2, h: 2, tile: 'one', palette: 0 }],
        });

        expect(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toContain('tile (32,29)');
        expect(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toContain('tile (31,30)');
    });

    it('rejects a missing glyph and names the font and character', () => {
        const result = compileTest({
            layers: [{ op: 'text', x: 0, y: 0, text: 'AB', font: 'mono', palette: 0 }],
        });

        expect(result.diagnostics[0]).toMatchObject({
            code: 'missing-glyph',
            path: 'layers[0].text',
            message: expect.stringContaining(`font 'mono' has no glyph for "B"`),
        });
    });

    it('rejects more than 256 distinct background patterns and allows exactly 256', () => {
        const over = compilePatterns(256);
        const exact = compilePatterns(255);

        expect(over.valid).toBe(false);
        expect(over.diagnostics[0]).toMatchObject({
            code: 'pattern-limit',
            message: expect.stringContaining('257 distinct background patterns'),
        });
        expect(exact.valid).toBe(true);
        expect(exact.screen?.patternTable).toHaveLength(256);
    });
});

/** `count` unique non-blank tiles, plus the built-in blank, fill the pattern table. */
function compilePatterns(count: number) {
    const tiles: Record<string, string[]> = {};
    const layers = [];
    const blankRow = '00000000';

    for (let index = 1; index <= count; index++) {
        const name = `p${index}`;
        tiles[name] = [
            index.toString(4).padStart(8, '0'),
            blankRow,
            blankRow,
            blankRow,
            blankRow,
            blankRow,
            blankRow,
            blankRow,
        ];
        const cell = index - 1;
        layers.push({ op: 'fill', x: cell % 32, y: Math.floor(cell / 32), w: 1, h: 1, tile: name, palette: 0 });
    }

    const assets: AssetDocument[] = [{ file: 'generated.json', value: { tiles } }];
    return compileScreen(testScreen({ layers }), { file: 'limit.json', assets });
}

describe('layer helpers', () => {
    it('builds panels, meters, and scaled text out of ordinary tiles', () => {
        const result = compileTest({
            layers: [
                { op: 'panel', x: 0, y: 0, w: 4, h: 4, frame: 'box', fill: 'one', palette: 0 },
                { op: 'meter', x: 0, y: 4, w: 4, value: 1, max: 2, full: 'three', empty: 'one', palette: 0 },
                { op: 'text', x: 0, y: 6, text: 'A', font: 'mono', palette: 0, scale: 2, ink: 1 },
            ],
        });
        if (result.screen === undefined) {
            throw new Error(JSON.stringify(result.diagnostics));
        }
        const image = renderScreen(result.screen, master);
        const color = (x: number, y: number) => {
            const offset = (y * 256 + x) * 3;
            return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
        };

        expect(result.valid).toBe(true);
        expect(color(0, 0)).toEqual([master.colors[0x11].r, master.colors[0x11].g, master.colors[0x11].b]);
        expect(color(8, 8)).toEqual([master.colors[0x01].r, master.colors[0x01].g, master.colors[0x01].b]);
        expect(color(0, 32)).toEqual([master.colors[0x21].r, master.colors[0x21].g, master.colors[0x21].b]);
        expect(color(16, 32)).toEqual([master.colors[0x01].r, master.colors[0x01].g, master.colors[0x01].b]);
        expect(color(0, 48)).toEqual([master.colors[0x01].r, master.colors[0x01].g, master.colors[0x01].b]);
        expect(color(15, 63)).toEqual([master.colors[0x01].r, master.colors[0x01].g, master.colors[0x01].b]);
        expect(color(16, 48)).toEqual([master.colors[0x0f].r, master.colors[0x0f].g, master.colors[0x0f].b]);
    });
});
