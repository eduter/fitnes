import { readFileSync } from 'node:fs';
import type { DiagnosticSink } from './diagnostics.ts';
import { TILE_SIZE } from './hardware.ts';
import { type Pattern, parsePixelArt, sliceArt } from './tiles.ts';

/** A named tile in one of the two pattern tables, with where it was defined. */
interface LibraryTile {
    readonly pattern: Pattern;
    readonly file: string;
    readonly path: string;
}

/** A rectangle of background tiles placed as a unit: a metatile or a glyph. */
interface TileBlock {
    readonly cols: number;
    readonly rows: number;
    readonly tiles: readonly (readonly string[])[];
}

/** A bitmap font whose glyphs are background tile blocks of one height. */
interface Font {
    readonly name: string;
    readonly rows: number;
    readonly glyphs: ReadonlyMap<string, TileBlock>;
}

/**
 * Every graphic a screen can reference by name. Background and sprite tiles
 * live in separate namespaces because the PPU fetches them from separate
 * pattern tables.
 */
interface TileLibrary {
    readonly background: Map<string, LibraryTile>;
    readonly sprite: Map<string, LibraryTile>;
    readonly metatiles: Map<string, TileBlock>;
    readonly fonts: Map<string, Font>;
}

/** An asset document as read from disk, before validation. */
interface AssetDocument {
    readonly file: string;
    readonly value: unknown;
}

/** The all-zero tile every nametable cell shows until a layer places something. */
const BLANK_TILE = 'blank';
const SECTIONS = new Set(['tiles', 'metatiles', 'fonts', 'spriteTiles']);

/** Read asset JSON files; unreadable or unparsable files become diagnostics. */
function readAssetFiles(paths: readonly string[], sink: DiagnosticSink): AssetDocument[] {
    const documents: AssetDocument[] = [];

    for (const file of paths) {
        try {
            documents.push({ file, value: JSON.parse(readFileSync(file, 'utf8')) });
        } catch (cause) {
            sink.error('asset-file', file, '', `cannot read asset file: ${(cause as Error).message}`);
        }
    }

    return documents;
}

/**
 * Validate asset documents and merge them into one library. Names are
 * global across files, so a duplicate is an error rather than an override.
 */
function buildLibrary(documents: readonly AssetDocument[], sink: DiagnosticSink): TileLibrary {
    const library: TileLibrary = {
        background: new Map([[BLANK_TILE, { pattern: new Uint8Array(64), file: '(built-in)', path: BLANK_TILE }]]),
        sprite: new Map(),
        metatiles: new Map(),
        fonts: new Map(),
    };

    for (const { file, value } of documents) {
        if (!isRecord(value)) {
            sink.error('schema', file, '', 'asset file must be a JSON object');
            continue;
        }

        for (const key of Object.keys(value)) {
            if (!SECTIONS.has(key)) {
                sink.error('schema', file, key, `unknown section; expected one of ${[...SECTIONS].join(', ')}`);
            }
        }

        addTiles(library.background, value.tiles, { file, section: 'tiles' }, sink);
        addTiles(library.sprite, value.spriteTiles, { file, section: 'spriteTiles' }, sink);
        addMetatiles(library, value.metatiles, file, sink);
        addFonts(library, value.fonts, file, sink);
    }

    return library;
}

function addTiles(
    table: Map<string, LibraryTile>,
    section: unknown,
    where: { file: string; section: string },
    sink: DiagnosticSink
): void {
    const { file } = where;

    for (const [name, art, path] of entries(section, where, sink)) {
        if (!claimName(table, name, { file, path }, sink)) {
            continue;
        }

        const parsed = parsePixelArt(art, { file, path, exactTile: true }, sink);
        if (parsed !== undefined) {
            table.set(name, { pattern: sliceArt(parsed)[0][0], file, path });
        }
    }
}

function addMetatiles(library: TileLibrary, section: unknown, file: string, sink: DiagnosticSink): void {
    for (const [name, art, path] of entries(section, { file, section: 'metatiles' }, sink)) {
        if (library.metatiles.has(name)) {
            sink.error('duplicate-name', file, path, `metatile '${name}' is already defined`);
            continue;
        }

        const block = addBlock(library, { prefix: `${name}`, art }, { file, path }, sink);
        if (block !== undefined) {
            library.metatiles.set(name, block);
        }
    }
}

/** Fonts take `{ "name": { "glyphs": { "A": [pixel rows] } } }`; all glyphs share one height. */
function addFonts(library: TileLibrary, section: unknown, file: string, sink: DiagnosticSink): void {
    for (const [name, font, path] of entries(section, { file, section: 'fonts' }, sink)) {
        if (library.fonts.has(name)) {
            sink.error('duplicate-name', file, path, `font '${name}' is already defined`);
            continue;
        }

        if (!isRecord(font) || !isRecord(font.glyphs)) {
            sink.error('schema', file, path, 'font must be an object with a "glyphs" object');
            continue;
        }

        // Each glyph becomes a block of ordinary background tiles
        const glyphs = new Map<string, TileBlock>();
        let rows: number | undefined;
        for (const [char, art] of Object.entries(font.glyphs)) {
            const glyphPath = `${path}.glyphs[${JSON.stringify(char)}]`;
            if ([...char].length !== 1) {
                sink.error('schema', file, glyphPath, 'glyph keys must be exactly one character');
                continue;
            }

            const block = addBlock(library, { prefix: `${name}:${char}`, art }, { file, path: glyphPath }, sink);
            if (block === undefined) {
                continue;
            }

            rows ??= block.rows;
            if (block.rows !== rows) {
                sink.error(
                    'tile-size',
                    file,
                    glyphPath,
                    `glyph is ${block.rows * TILE_SIZE} pixels tall; font '${name}' glyphs are ${rows * TILE_SIZE}`
                );
                continue;
            }
            glyphs.set(char, block);
        }

        library.fonts.set(name, { name, rows: rows ?? 1, glyphs });
    }
}

/** Slice art into background tiles named `prefix` (1 × 1) or `prefix[row,col]`. */
function addBlock(
    library: TileLibrary,
    source: { prefix: string; art: unknown },
    where: { file: string; path: string },
    sink: DiagnosticSink
): TileBlock | undefined {
    const { prefix, art } = source;
    const { file, path } = where;

    const parsed = parsePixelArt(art, { file, path, exactTile: false }, sink);
    if (parsed === undefined) {
        return undefined;
    }

    const sliced = sliceArt(parsed);
    const single = sliced.length === 1 && sliced[0].length === 1;
    const tiles = sliced.map((line, row) =>
        line.map((pattern, col) => {
            const name = single ? prefix : `${prefix}[${row},${col}]`;
            if (claimName(library.background, name, where, sink)) {
                library.background.set(name, { pattern, file, path });
            }
            return name;
        })
    );

    return { cols: sliced[0].length, rows: sliced.length, tiles };
}

function claimName(
    table: Map<string, LibraryTile>,
    name: string,
    where: { file: string; path: string },
    sink: DiagnosticSink
): boolean {
    const existing = table.get(name);
    if (existing === undefined) {
        return true;
    }

    sink.error(
        'duplicate-name',
        where.file,
        where.path,
        `tile '${name}' is already defined in ${existing.file} ${existing.path}`
    );
    return false;
}

function entries(
    section: unknown,
    where: { file: string; section: string },
    sink: DiagnosticSink
): [string, unknown, string][] {
    if (section === undefined) {
        return [];
    }

    if (!isRecord(section)) {
        sink.error('schema', where.file, where.section, 'section must be an object keyed by name');
        return [];
    }

    return Object.entries(section).map(([name, value]) => [name, value, `${where.section}[${JSON.stringify(name)}]`]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export { BLANK_TILE, buildLibrary, isRecord, readAssetFiles };
export type { AssetDocument, Font, LibraryTile, TileBlock, TileLibrary };
