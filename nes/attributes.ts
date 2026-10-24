import type { DiagnosticSink } from './diagnostics.ts';
import {
    ATTRIBUTE_COLS,
    ATTRIBUTE_REGION_SIZE,
    ATTRIBUTE_ROWS,
    ATTRIBUTE_TABLE_BYTES,
    TILE_COLS,
    TILE_ROWS,
} from './hardware.ts';

/** A nametable entry after layout: which tile, which subpalette it asked for, and who placed it. */
interface PlacedCell {
    readonly tile: string;
    readonly palette: number;
    readonly source: string;
    /** All-zero tiles show only the universal color, so their palette request cannot conflict. */
    readonly blank: boolean;
}

/** Subpalette per 16 × 16 region: `ATTRIBUTE_ROWS` rows of `ATTRIBUTE_COLS`. */
type AttributeGrid = number[][];

/**
 * Parse a declared attribute grid: 15 strings of 16 digits `0`–`3`. The
 * visible screen is 240 pixels tall, so it has 15 region rows, not 16.
 */
function parseAttributeGrid(value: unknown, file: string, sink: DiagnosticSink): AttributeGrid | undefined {
    if (!Array.isArray(value) || !value.every((row) => typeof row === 'string')) {
        sink.error('attribute-grid', file, 'attributes', 'attributes must be an array of digit strings');
        return undefined;
    }

    if (value.length !== ATTRIBUTE_ROWS) {
        sink.error(
            'attribute-grid',
            file,
            'attributes',
            `attribute grid has ${value.length} rows; a 240-pixel screen has ${ATTRIBUTE_ROWS} rows of 16×16 regions (the last attribute byte row covers only its top half)`
        );
        return undefined;
    }

    const grid: AttributeGrid = [];
    for (const [row, line] of (value as string[]).entries()) {
        if (!new RegExp(`^[0-3]{${ATTRIBUTE_COLS}}$`).test(line)) {
            sink.error(
                'attribute-grid',
                file,
                `attributes[${row}]`,
                `row must be exactly ${ATTRIBUTE_COLS} digits 0–3 (one subpalette per 16-pixel column), got '${line}'`
            );
            return undefined;
        }
        grid.push([...line].map(Number));
    }

    return grid;
}

/**
 * Derive the subpalette of every 16 × 16 region from the cells inside it.
 * Each region gets one subpalette for all four of its tiles; disagreeing
 * non-blank cells, or cells that disagree with a declared grid, are errors.
 * The returned grid is still filled in (first request wins) so a forced
 * render can show the problem.
 */
function resolveAttributes(
    cells: readonly (readonly (PlacedCell | undefined)[])[],
    declared: AttributeGrid | undefined,
    file: string,
    sink: DiagnosticSink
): AttributeGrid {
    const grid: AttributeGrid = [];

    for (let ry = 0; ry < ATTRIBUTE_ROWS; ry++) {
        const line: number[] = [];
        for (let rx = 0; rx < ATTRIBUTE_COLS; rx++) {
            const requests = regionRequests(cells, rx, ry);
            const wanted = declared?.[ry][rx];
            const palettes = new Set(requests.map((request) => request.cell.palette));

            if (wanted !== undefined) {
                palettes.add(wanted);
            }
            if (palettes.size > 1) {
                reportConflict({ rx, ry, requests, declared: wanted }, file, sink);
            }

            line.push(wanted ?? requests[0]?.cell.palette ?? 0);
        }
        grid.push(line);
    }

    return grid;
}

/**
 * Pack the region grid into the PPU's 64-byte attribute table. Each byte
 * covers a 32 × 32 area: bits 0–1 top-left, 2–3 top-right, 4–5 bottom-left,
 * 6–7 bottom-right. Bytes 56–63 cover screen rows 224–239 plus two rows
 * past the bottom, so their upper four bits are always 0.
 */
function encodeAttributeTable(grid: AttributeGrid): Uint8Array {
    const table = new Uint8Array(ATTRIBUTE_TABLE_BYTES);

    for (const [ry, line] of grid.entries()) {
        for (const [rx, palette] of line.entries()) {
            const index = (ry >> 1) * 8 + (rx >> 1);
            const shift = ((ry & 1) << 2) | ((rx & 1) << 1);
            table[index] |= palette << shift;
        }
    }

    return table;
}

interface RegionRequest {
    readonly col: number;
    readonly row: number;
    readonly cell: PlacedCell;
}

function regionRequests(
    cells: readonly (readonly (PlacedCell | undefined)[])[],
    rx: number,
    ry: number
): RegionRequest[] {
    const requests: RegionRequest[] = [];

    for (let row = ry * 2; row < Math.min(ry * 2 + 2, TILE_ROWS); row++) {
        for (let col = rx * 2; col < Math.min(rx * 2 + 2, TILE_COLS); col++) {
            const cell = cells[row]?.[col];
            if (cell !== undefined && !cell.blank) {
                requests.push({ col, row, cell });
            }
        }
    }

    return requests;
}

function reportConflict(
    conflict: { rx: number; ry: number; requests: RegionRequest[]; declared: number | undefined },
    file: string,
    sink: DiagnosticSink
): void {
    const { rx, ry, requests, declared } = conflict;
    const x = rx * ATTRIBUTE_REGION_SIZE;
    const y = ry * ATTRIBUTE_REGION_SIZE;

    // Describe the first cell asking for each palette, so the fix is obvious
    const seen = new Set<number>();
    const parts: string[] = [];
    if (declared !== undefined) {
        parts.push(`attributes[${ry}] declares ${declared}`);
        seen.add(declared);
    }
    for (const { col, row, cell } of requests) {
        if (seen.has(cell.palette)) {
            continue;
        }
        seen.add(cell.palette);
        parts.push(`tile (${col},${row}) '${cell.tile}' from ${cell.source} uses ${cell.palette}`);
    }

    const culprit = requests.findLast((request) => request.cell.palette !== (declared ?? requests[0].cell.palette));
    sink.error(
        'attribute-conflict',
        file,
        culprit?.cell.source ?? `attributes[${ry}]`,
        `attribute region (${rx},${ry}) at pixels x ${x}–${x + 15}, y ${y}–${y + 15} mixes subpalettes: ${parts.join('; ')}. All four tiles of a 16×16 region share one subpalette`
    );
}

export { encodeAttributeTable, parseAttributeGrid, resolveAttributes };
export type { AttributeGrid, PlacedCell };
