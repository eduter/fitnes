import { isRecord, type TileLibrary } from './assets.ts';
import type { PlacedCell } from './attributes.ts';
import type { DiagnosticSink } from './diagnostics.ts';
import { SUBPALETTE_COUNT, TILE_COLS, TILE_ROWS, TILE_SIZE } from './hardware.ts';
import { isBlankPattern, remapPattern } from './tiles.ts';

/** The 32 × 30 nametable being filled in; `undefined` cells show the blank tile. */
type Nametable = (PlacedCell | undefined)[][];

interface LayoutContext {
    readonly file: string;
    readonly library: TileLibrary;
    readonly sink: DiagnosticSink;
    readonly cells: Nametable;
}

/** One layer operation. Each receives its fields already checked against `fields`. */
interface Operation {
    readonly fields: readonly string[];
    readonly place: (layer: Record<string, unknown>, info: LayerInfo, context: LayoutContext) => void;
}

interface LayerInfo {
    readonly path: string;
    readonly source: string;
    readonly palette: number;
}

const COMMON_FIELDS = ['op', 'id', 'palette', 'x', 'y'];
const FRAME_PARTS = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'] as const;

/**
 * Every way a screen can put tiles on the nametable. All of them go
 * through `put`, so no helper can place a tile that skips validation.
 * Coordinates and sizes are in tiles, never pixels.
 */
const OPERATIONS: Record<string, Operation> = {
    fill: {
        fields: ['w', 'h', 'tile'],
        place(layer, info, context) {
            const fields = read(layer, info, context, { w: 'size', h: 'size', tile: 'string' });
            if (fields === undefined) {
                return;
            }
            const { x, y, w, h, tile } = fields;
            rectangle({ x, y, w, h }, () => tile, info, context);
        },
    },
    map: {
        fields: ['rows', 'legend'],
        place(layer, info, context) {
            const fields = read(layer, info, context, {});
            if (fields === undefined) {
                return;
            }
            placeMap({ x: fields.x, y: fields.y, rows: layer.rows, legend: layer.legend }, info, context);
        },
    },
    metatile: {
        fields: ['name'],
        place(layer, info, context) {
            const fields = read(layer, info, context, { name: 'string' });
            if (fields === undefined) {
                return;
            }
            const { x, y, name } = fields;
            const block = context.library.metatiles.get(name);
            if (block === undefined) {
                unknownName({ kind: 'metatile', name, known: context.library.metatiles.keys() }, info, context);
                return;
            }
            placeBlock({ x, y, tiles: block.tiles }, info, context);
        },
    },
    text: {
        fields: ['text', 'font', 'ink', 'paper', 'scale'],
        place(layer, info, context) {
            const fields = read(layer, info, context, { text: 'string', font: 'string' });
            const scale = optionalScale(layer.scale, info, context);
            if (fields === undefined || scale === undefined) {
                return;
            }
            const { x, y, text, font } = fields;
            const ink = optionalColor(layer.ink, `${info.path}.ink`, 3, context);
            const paper = optionalColor(layer.paper, `${info.path}.paper`, 0, context);
            placeText({ x, y, text, font, ink, paper, scale }, info, context);
        },
    },
    panel: {
        fields: ['w', 'h', 'frame', 'fill'],
        place(layer, info, context) {
            const fields = read(layer, info, context, { w: 'size', h: 'size', frame: 'string' });
            if (fields === undefined) {
                return;
            }
            const { x, y, w, h, frame } = fields;
            const fill = layer.fill === undefined ? undefined : String(layer.fill);
            placePanel({ x, y, w, h, frame, fill }, info, context);
        },
    },
    hline: {
        fields: ['w', 'tile', 'start', 'end'],
        place(layer, info, context) {
            const fields = read(layer, info, context, { w: 'size', tile: 'string' });
            if (fields === undefined) {
                return;
            }
            const { x, y, w, tile } = fields;
            const ends = { start: optionalString(layer.start), end: optionalString(layer.end) };
            rectangle({ x, y, w, h: 1 }, (col) => lineTile(col, w, tile, ends), info, context);
        },
    },
    vline: {
        fields: ['h', 'tile', 'start', 'end'],
        place(layer, info, context) {
            const fields = read(layer, info, context, { h: 'size', tile: 'string' });
            if (fields === undefined) {
                return;
            }
            const { x, y, h, tile } = fields;
            const ends = { start: optionalString(layer.start), end: optionalString(layer.end) };
            rectangle({ x, y, w: 1, h }, (_col, row) => lineTile(row, h, tile, ends), info, context);
        },
    },
    meter: {
        fields: ['w', 'value', 'max', 'full', 'empty'],
        place(layer, info, context) {
            const fields = { w: 'size', value: 'count', max: 'size', full: 'string', empty: 'string' } as const;
            const values = read(layer, info, context, fields);
            if (values === undefined) {
                return;
            }
            const { x, y, w, value, max, full, empty } = values;
            const filled = Math.round((Math.min(value, max) / max) * w);
            rectangle({ x, y, w, h: 1 }, (col) => (col < filled ? full : empty), info, context);
        },
    },
};

/**
 * Apply layers in order onto an empty nametable. Later layers overwrite
 * earlier ones cell by cell, including the subpalette each cell requests.
 */
function layoutLayers(layers: readonly unknown[], library: TileLibrary, file: string, sink: DiagnosticSink): Nametable {
    const cells: Nametable = Array.from({ length: TILE_ROWS }, () =>
        Array.from({ length: TILE_COLS }, () => undefined)
    );
    const context: LayoutContext = { file, library, sink, cells };

    for (const [index, layer] of layers.entries()) {
        const path = `layers[${index}]`;
        if (!isRecord(layer) || typeof layer.op !== 'string') {
            sink.error('schema', file, path, `layer needs an "op": one of ${Object.keys(OPERATIONS).join(', ')}`);
            continue;
        }

        const operation = OPERATIONS[layer.op];
        if (operation === undefined) {
            sink.error(
                'schema',
                file,
                `${path}.op`,
                `unknown op '${layer.op}'; use one of ${Object.keys(OPERATIONS).join(', ')}`
            );
            continue;
        }

        // Reject misspelled fields instead of silently ignoring them
        const allowed = new Set([...COMMON_FIELDS, ...operation.fields]);
        const unknown = Object.keys(layer).filter((key) => !allowed.has(key));
        for (const key of unknown) {
            sink.error(
                'schema',
                file,
                `${path}.${key}`,
                `'${layer.op}' has no field '${key}'; fields: ${[...allowed].join(', ')}`
            );
        }

        const palette = layer.palette ?? 0;
        if (typeof palette !== 'number' || !Number.isInteger(palette) || palette < 0 || palette >= SUBPALETTE_COUNT) {
            sink.error(
                'palette-reference',
                file,
                `${path}.palette`,
                `background subpalette ${JSON.stringify(palette)} does not exist; use 0–3`
            );
            continue;
        }

        const source = typeof layer.id === 'string' ? `${path} "${layer.id}"` : path;
        operation.place(layer, { path, source, palette }, context);
    }

    return cells;
}

type FieldKind = 'size' | 'count' | 'string';
type FieldValues<T extends Record<string, FieldKind>> = { [K in keyof T]: T[K] extends 'string' ? string : number } & {
    x: number;
    y: number;
};

/**
 * Read `x`, `y`, and the named fields. A missing or mistyped field is an
 * error and reads as 0 / '', which keeps later cells from reporting noise.
 */
function read<T extends Record<string, FieldKind>>(
    layer: Record<string, unknown>,
    info: LayerInfo,
    context: LayoutContext,
    fields: T
): FieldValues<T> | undefined {
    const values: Record<string, number | string> = {};
    const all: Record<string, FieldKind> = { x: 'count', y: 'count', ...fields };
    let valid = true;

    for (const [field, kind] of Object.entries(all)) {
        const value = layer[field];
        const path = `${info.path}.${field}`;
        if (kind === 'string') {
            if (typeof value !== 'string') {
                context.sink.error('schema', context.file, path, `'${field}' must be a string`);
                valid = false;
            }
            values[field] = typeof value === 'string' ? value : '';
            continue;
        }

        const min = kind === 'size' ? 1 : 0;
        if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
            context.sink.error('schema', context.file, path, `'${field}' must be an integer ≥ ${min} (tile units)`);
            valid = false;
            continue;
        }
        values[field] = value;
    }

    return valid ? (values as FieldValues<T>) : undefined;
}

function rectangle(
    area: { x: number; y: number; w: number; h: number },
    tileAt: (col: number, row: number) => string | undefined,
    info: LayerInfo,
    context: LayoutContext
): void {
    for (let row = 0; row < area.h; row++) {
        for (let col = 0; col < area.w; col++) {
            const tile = tileAt(col, row);
            if (tile !== undefined) {
                put({ col: area.x + col, row: area.y + row, tile }, info, context);
            }
        }
    }
}

function placeBlock(
    block: { x: number; y: number; tiles: readonly (readonly string[])[] },
    info: LayerInfo,
    context: LayoutContext
): void {
    for (const [row, line] of block.tiles.entries()) {
        for (const [col, tile] of line.entries()) {
            put({ col: block.x + col, row: block.y + row, tile }, info, context);
        }
    }
}

/** `rows` are strings; each character is looked up in `legend`. A `null` legend entry leaves the cell as is. */
function placeMap(
    map: { x: number; y: number; rows: unknown; legend: unknown },
    info: LayerInfo,
    context: LayoutContext
): void {
    const { x, y, rows, legend } = map;
    const { sink, file } = context;

    if (!Array.isArray(rows) || !rows.every((row) => typeof row === 'string')) {
        sink.error('schema', file, `${info.path}.rows`, "'rows' must be an array of strings");
        return;
    }
    if (!isRecord(legend)) {
        sink.error('schema', file, `${info.path}.legend`, "'legend' must map single characters to tile names");
        return;
    }

    for (const [row, line] of rows.entries()) {
        for (const [col, char] of [...line].entries()) {
            const tile = legend[char];
            if (tile === null) {
                continue;
            }
            if (typeof tile !== 'string') {
                sink.error(
                    'tile-reference',
                    file,
                    `${info.path}.rows[${row}]`,
                    `character '${char}' at column ${col} is not in the legend`
                );
                continue;
            }
            put({ col: x + col, row: y + row, tile }, info, context);
        }
    }
}

/**
 * Lay glyphs left to right; `\n` starts a new line one glyph-height down.
 * `ink` and `paper` recolor glyph pixel values 3 and 0, which makes new
 * pattern tiles rather than drawing anything outside the tile system.
 */
function placeText(
    text: { x: number; y: number; text: string; font: string; ink: number; paper: number; scale: number },
    info: LayerInfo,
    context: LayoutContext
): void {
    const { library, sink, file } = context;
    const font = library.fonts.get(text.font);
    if (font === undefined) {
        unknownName({ kind: 'font', name: text.font, known: library.fonts.keys() }, info, context);
        return;
    }

    let col = text.x;
    let row = text.y;
    for (const [index, char] of [...text.text].entries()) {
        if (char === '\n') {
            col = text.x;
            row += font.rows * text.scale;
            continue;
        }

        const glyph = font.glyphs.get(char);
        if (glyph === undefined) {
            const available = [...font.glyphs.keys()].join('');
            sink.error(
                'missing-glyph',
                file,
                `${info.path}.text`,
                `font '${font.name}' has no glyph for ${JSON.stringify(char)} (character ${index}); it has: ${available}`
            );
            col += text.scale;
            continue;
        }

        const tiles = glyph.tiles.map((line) => line.map((tile) => recolor(tile, text, library)));
        const prefix = `${text.font}:${char}:${text.ink}:${text.paper}`;
        placeBlock({ x: col, y: row, tiles: enlargeTiles(tiles, text.scale, library, prefix) }, info, context);
        col += glyph.cols * text.scale;
    }
}

/**
 * Repeat each glyph pixel into a `scale`×`scale` block and cut the result
 * back into ordinary background tiles. Scale 1 keeps the glyph's own tiles.
 */
function enlargeTiles(
    tiles: readonly (readonly string[])[],
    scale: number,
    library: TileLibrary,
    prefix: string
): string[][] {
    if (scale === 1) {
        return tiles.map((line) => [...line]);
    }

    const tileRows = tiles.length;
    const tileCols = tiles[0].length;
    const width = tileCols * TILE_SIZE;
    const source = stitch(tiles, library, width);

    const enlarged: string[][] = [];
    for (let row = 0; row < tileRows * scale; row++) {
        const line: string[] = [];
        for (let col = 0; col < tileCols * scale; col++) {
            const name = `${prefix}@${scale}[${row},${col}]`;
            if (!library.background.has(name)) {
                library.background.set(name, {
                    pattern: scaledTile(source, { width, scale, row, col }),
                    file: '(scaled glyph)',
                    path: name,
                });
            }
            line.push(name);
        }
        enlarged.push(line);
    }
    return enlarged;
}

function stitch(tiles: readonly (readonly string[])[], library: TileLibrary, width: number): Uint8Array {
    const height = tiles.length * TILE_SIZE;
    const source = new Uint8Array(width * height);

    for (const [row, line] of tiles.entries()) {
        for (const [col, name] of line.entries()) {
            const pattern = library.background.get(name)?.pattern;
            if (pattern === undefined) {
                continue;
            }
            for (let y = 0; y < TILE_SIZE; y++) {
                for (let x = 0; x < TILE_SIZE; x++) {
                    source[(row * TILE_SIZE + y) * width + col * TILE_SIZE + x] = pattern[y * TILE_SIZE + x];
                }
            }
        }
    }

    return source;
}

function scaledTile(source: Uint8Array, tile: { width: number; scale: number; row: number; col: number }): Uint8Array {
    const { width, scale, row, col } = tile;
    const pattern = new Uint8Array(TILE_SIZE * TILE_SIZE);

    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const sy = Math.floor((row * TILE_SIZE + y) / scale);
            const sx = Math.floor((col * TILE_SIZE + x) / scale);
            pattern[y * TILE_SIZE + x] = source[sy * width + sx];
        }
    }

    return pattern;
}

function recolor(tile: string, colors: { ink: number; paper: number }, library: TileLibrary): string {
    const { ink, paper } = colors;
    if (ink === 3 && paper === 0) {
        return tile;
    }

    const name = `${tile}~ink${ink}paper${paper}`;
    const base = library.background.get(tile);
    if (base !== undefined && !library.background.has(name)) {
        library.background.set(name, { ...base, pattern: remapPattern(base.pattern, [paper, 1, 2, ink]) });
    }
    return name;
}

/** Frame tiles are `<frame>.tl`, `.t`, `.tr`, `.l`, `.r`, `.bl`, `.b`, `.br`; `fill` covers the inside. */
function placePanel(
    panel: { x: number; y: number; w: number; h: number; frame: string; fill: string | undefined },
    info: LayerInfo,
    context: LayoutContext
): void {
    const { x, y, w, h, frame, fill } = panel;

    if (w < 2 || h < 2) {
        context.sink.error(
            'schema',
            context.file,
            info.path,
            `panel is ${w}×${h} tiles; it needs at least 2×2 for its frame`
        );
        return;
    }

    const missing = FRAME_PARTS.filter((part) => !context.library.background.has(`${frame}.${part}`));
    if (missing.length > 0) {
        context.sink.error(
            'tile-reference',
            context.file,
            `${info.path}.frame`,
            `frame '${frame}' is missing tiles ${missing.map((part) => `'${frame}.${part}'`).join(', ')}`
        );
        return;
    }

    rectangle(
        { x, y, w, h },
        (col, row) => {
            const vertical = row === 0 ? 't' : row === h - 1 ? 'b' : '';
            const horizontal = col === 0 ? 'l' : col === w - 1 ? 'r' : '';
            const part = `${vertical}${horizontal}`;
            return part === '' ? fill : `${frame}.${part}`;
        },
        info,
        context
    );
}

function lineTile(index: number, length: number, tile: string, ends: { start?: string; end?: string }): string {
    if (index === 0 && ends.start !== undefined) {
        return ends.start;
    }
    if (index === length - 1 && ends.end !== undefined) {
        return ends.end;
    }
    return tile;
}

/** The single entry point that writes a nametable cell. */
function put(target: { col: number; row: number; tile: string }, info: LayerInfo, context: LayoutContext): void {
    const { col, row, tile } = target;
    const { library, sink, file, cells } = context;

    if (col < 0 || row < 0 || col >= TILE_COLS || row >= TILE_ROWS) {
        sink.error(
            'out-of-bounds',
            file,
            info.path,
            `tile (${col},${row}) is outside the ${TILE_COLS}×${TILE_ROWS} nametable (rows 0–${TILE_ROWS - 1}; pixel ${col * 8},${row * 8})`
        );
        return;
    }

    const entry = library.background.get(tile);
    if (entry === undefined) {
        unknownName({ kind: 'background tile', name: tile, known: library.background.keys() }, info, context);
        return;
    }

    cells[row][col] = { tile, palette: info.palette, source: info.source, blank: isBlankPattern(entry.pattern) };
}

function unknownName(
    missing: { kind: string; name: string; known: Iterable<string> },
    info: LayerInfo,
    context: LayoutContext
): void {
    const stem = missing.name.split(/[.:[~]/)[0];
    const similar = [...missing.known].filter((name) => name.startsWith(stem) && !name.includes('~')).slice(0, 6);
    const hint = similar.length > 0 ? `; similar: ${similar.join(', ')}` : '';
    context.sink.error('tile-reference', context.file, info.path, `unknown ${missing.kind} '${missing.name}'${hint}`);
}

function optionalColor(value: unknown, path: string, fallback: number, context: LayoutContext): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3) {
        context.sink.error('palette-reference', context.file, path, 'must be a subpalette entry 0–3');
        return fallback;
    }
    return value;
}

function optionalScale(value: unknown, info: LayerInfo, context: LayoutContext): number | undefined {
    if (value === undefined) {
        return 1;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4) {
        context.sink.error('schema', context.file, `${info.path}.scale`, 'text scale must be an integer from 1 to 4');
        return undefined;
    }
    return value;
}

function optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

export { layoutLayers, OPERATIONS };
export type { Nametable };
