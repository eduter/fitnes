import { describe, expect, it } from 'vitest';
import { buildLibrary } from './assets.ts';
import { DiagnosticSink } from './diagnostics.ts';

const SOLID = ['11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111'];

function build(value: unknown) {
    const sink = new DiagnosticSink();
    const library = buildLibrary([{ file: 'assets.json', value }], sink);
    return { library, diagnostics: sink.items };
}

describe('buildLibrary', () => {
    it('loads an 8×8 tile and always provides the blank tile', () => {
        const { library, diagnostics } = build({ tiles: { solid: SOLID } });

        expect(diagnostics).toEqual([]);
        expect(library.background.get('solid')?.pattern.every((value) => value === 1)).toBe(true);
        expect(library.background.get('blank')?.pattern.every((value) => value === 0)).toBe(true);
    });

    it('rejects a tile that is not exactly 8×8', () => {
        const { diagnostics } = build({ tiles: { wide: SOLID.map((row) => `${row}1`), short: SOLID.slice(1) } });

        expect(diagnostics).toEqual([
            expect.objectContaining({
                code: 'tile-size',
                path: 'tiles["wide"]',
                message: expect.stringContaining('9×8'),
            }),
            expect.objectContaining({
                code: 'tile-size',
                path: 'tiles["short"]',
                message: expect.stringContaining('8×7'),
            }),
        ]);
    });

    it('rejects pixels outside the four 2-bit values and names the coordinate', () => {
        const art = [...SOLID];
        art[2] = '11141111';

        const { diagnostics } = build({ tiles: { bad: art } });

        expect(diagnostics).toEqual([
            expect.objectContaining({
                code: 'tile-pixel',
                path: 'tiles["bad"][2]',
                message: expect.stringContaining("'4' at (3,2)"),
            }),
        ]);
    });

    it('rejects ragged rows', () => {
        const art = [...SOLID];
        art[5] = '1111111';

        expect(build({ tiles: { bad: art } }).diagnostics[0]).toMatchObject({
            code: 'tile-size',
            path: 'tiles["bad"][5]',
        });
    });

    it('slices a 16×16 metatile into four named 8×8 tiles', () => {
        const art = [...SOLID, ...SOLID].map((row) => row + row.replaceAll('1', '2'));

        const { library, diagnostics } = build({ metatiles: { icon: art } });

        expect(diagnostics).toEqual([]);
        expect(library.metatiles.get('icon')).toEqual({
            cols: 2,
            rows: 2,
            tiles: [
                ['icon[0,0]', 'icon[0,1]'],
                ['icon[1,0]', 'icon[1,1]'],
            ],
        });
        expect(library.background.get('icon[1,1]')?.pattern[0]).toBe(2);
    });

    it('builds fonts from glyph tiles and requires one glyph height', () => {
        const { library, diagnostics } = build({
            fonts: { tiny: { glyphs: { A: SOLID, B: [...SOLID, ...SOLID] } } },
        });

        expect(library.fonts.get('tiny')?.glyphs.get('A')?.tiles).toEqual([['tiny:A']]);
        expect(diagnostics).toEqual([
            expect.objectContaining({ code: 'tile-size', message: expect.stringContaining('16 pixels tall') }),
        ]);
    });

    it('rejects a name defined twice, including the built-in blank tile', () => {
        const { diagnostics } = build({ tiles: { blank: SOLID } });

        expect(diagnostics[0]).toMatchObject({ code: 'duplicate-name', message: expect.stringContaining('built-in') });
    });

    it('keeps sprite tiles out of the background namespace', () => {
        const { library } = build({ spriteTiles: { cursor: SOLID } });

        expect(library.sprite.has('cursor')).toBe(true);
        expect(library.background.has('cursor')).toBe(false);
    });
});
