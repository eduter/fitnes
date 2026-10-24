import { describe, expect, it } from 'vitest';
import { encodeAttributeTable, type PlacedCell, parseAttributeGrid, resolveAttributes } from './attributes.ts';
import { DiagnosticSink } from './diagnostics.ts';

type Grid = (PlacedCell | undefined)[][];

function emptyCells(): Grid {
    return Array.from({ length: 30 }, () => Array.from({ length: 32 }, () => undefined));
}

function place(cells: Grid, col: number, row: number, palette: number, blank = false): void {
    cells[row][col] = { tile: `t${col}_${row}`, palette, source: `layers[${col}]`, blank };
}

function uniformGrid(palette: number, rows = 15): string[] {
    return Array.from({ length: rows }, () => String(palette).repeat(16));
}

describe('resolveAttributes', () => {
    it('gives each 16×16 region the palette its tiles share', () => {
        const sink = new DiagnosticSink();
        const cells = emptyCells();
        place(cells, 2, 2, 3);
        place(cells, 3, 3, 3);

        const grid = resolveAttributes(cells, undefined, 'screen.json', sink);

        expect(sink.items).toEqual([]);
        expect(grid).toHaveLength(15);
        expect(grid[1][1]).toBe(3);
        expect(grid[0][0]).toBe(0);
    });

    it('reports two subpalettes inside one region with pixel bounds and tile names', () => {
        const sink = new DiagnosticSink();
        const cells = emptyCells();
        place(cells, 16, 10, 0);
        place(cells, 17, 11, 2);

        resolveAttributes(cells, undefined, 'screen.json', sink);

        expect(sink.items).toEqual([
            expect.objectContaining({
                code: 'attribute-conflict',
                path: 'layers[17]',
                message: expect.stringMatching(
                    /region \(8,5\) at pixels x 128–143, y 80–95.*tile \(16,10\) 't16_10'.*uses 0.*tile \(17,11\) 't17_11'.*uses 2/
                ),
            }),
        ]);
    });

    it('does not split regions on 8-pixel boundaries', () => {
        const sink = new DiagnosticSink();
        const cells = emptyCells();
        place(cells, 1, 0, 0);
        place(cells, 2, 0, 1);

        resolveAttributes(cells, undefined, 'screen.json', sink);

        expect(sink.items).toEqual([]);
    });

    it('lets blank tiles sit in any region, since they only show the universal color', () => {
        const sink = new DiagnosticSink();
        const cells = emptyCells();
        place(cells, 0, 0, 1);
        place(cells, 1, 0, 2, true);

        const grid = resolveAttributes(cells, undefined, 'screen.json', sink);

        expect(sink.items).toEqual([]);
        expect(grid[0][0]).toBe(1);
    });

    it('treats the bottom tile row 29 as part of region row 14', () => {
        const sink = new DiagnosticSink();
        const cells = emptyCells();
        place(cells, 0, 28, 1);
        place(cells, 0, 29, 2);

        resolveAttributes(cells, undefined, 'screen.json', sink);

        expect(sink.items[0]).toMatchObject({
            code: 'attribute-conflict',
            message: expect.stringContaining('region (0,14) at pixels x 0–15, y 224–239'),
        });
    });

    it('enforces a declared attribute grid against placed tiles', () => {
        const sink = new DiagnosticSink();
        const cells = emptyCells();
        place(cells, 4, 4, 1);
        const declared = parseAttributeGrid(uniformGrid(0), 'screen.json', sink);

        resolveAttributes(cells, declared, 'screen.json', sink);

        expect(sink.items[0]).toMatchObject({
            code: 'attribute-conflict',
            message: expect.stringContaining('attributes[2] declares 0'),
        });
    });
});

describe('parseAttributeGrid', () => {
    it('rejects sixteen region rows, which would extend past the 240-line screen', () => {
        const sink = new DiagnosticSink();

        expect(parseAttributeGrid(uniformGrid(0, 16), 'screen.json', sink)).toBeUndefined();
        expect(sink.items[0]).toMatchObject({
            code: 'attribute-grid',
            message: expect.stringContaining('has 16 rows; a 240-pixel screen has 15 rows'),
        });
    });

    it('rejects palette digits beyond the four background subpalettes', () => {
        const sink = new DiagnosticSink();
        const rows = uniformGrid(0);
        rows[3] = '0000000040000000';

        parseAttributeGrid(rows, 'screen.json', sink);

        expect(sink.items[0]).toMatchObject({ code: 'attribute-grid', path: 'attributes[3]' });
    });
});

describe('encodeAttributeTable', () => {
    it('packs quadrants into 2-bit fields of 32×32 bytes', () => {
        const grid = uniformGrid(0).map((row) => [...row].map(Number));
        grid[0][0] = 1;
        grid[0][1] = 2;
        grid[1][0] = 3;
        grid[1][1] = 1;

        const table = encodeAttributeTable(grid);

        expect(table).toHaveLength(64);
        expect(table[0]).toBe(0b01_11_10_01);
    });

    it('leaves the off-screen bottom half of the last attribute byte row empty', () => {
        const grid = uniformGrid(3).map((row) => [...row].map(Number));

        const table = encodeAttributeTable(grid);

        expect(table[0]).toBe(0xff);
        for (let index = 56; index < 64; index++) {
            expect(table[index]).toBe(0x0f);
        }
    });
});
