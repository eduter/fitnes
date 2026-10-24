import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { type AssetDocument, BLANK_TILE, buildLibrary, readAssetFiles, type TileLibrary } from './assets.ts';
import { type AttributeGrid, encodeAttributeTable, resolveAttributes } from './attributes.ts';
import { type Diagnostic, DiagnosticSink } from './diagnostics.ts';
import { PATTERN_TABLE_TILES } from './hardware.ts';
import { layoutLayers } from './layout.ts';
import { parseScreen, type ScreenPalettes } from './screen.ts';
import { type Pattern, patternKey } from './tiles.ts';

/**
 * A screen reduced to what the PPU would hold: a background pattern table,
 * a 32 × 30 nametable of pattern indices, the attribute table, and palettes.
 */
interface CompiledScreen {
    readonly name: string;
    readonly palettes: ScreenPalettes;
    readonly patternTable: readonly Pattern[];
    readonly nametable: readonly (readonly number[])[];
    readonly attributes: AttributeGrid;
    readonly attributeTable: Uint8Array;
    readonly scale: number;
}

/** The result of compiling: the screen when layout got that far, and every diagnostic. */
interface CompileResult {
    readonly screen: CompiledScreen | undefined;
    readonly diagnostics: readonly Diagnostic[];
    readonly valid: boolean;
}

/** Read a screen file and the asset files it lists (relative to the screen), then compile. */
function compileScreenFile(path: string): CompileResult {
    const sink = new DiagnosticSink();

    let value: unknown;
    try {
        value = JSON.parse(readFileSync(path, 'utf8'));
    } catch (cause) {
        sink.error('schema', path, '', `cannot read screen file: ${(cause as Error).message}`);
        return { screen: undefined, diagnostics: sink.items, valid: false };
    }

    const assetPaths = isAssetList(value) ? value.assets.map((asset) => resolve(dirname(path), asset)) : [];
    const documents = readAssetFiles(assetPaths, sink);
    return compileScreen(value, { file: path, assets: documents }, sink);
}

/**
 * Compile a parsed screen against already-read asset documents. Validation
 * never repairs the design: a result with errors is `valid: false` even
 * when a screen could still be drawn from it.
 */
function compileScreen(
    value: unknown,
    input: { file: string; assets: readonly AssetDocument[] },
    sink: DiagnosticSink = new DiagnosticSink()
): CompileResult {
    const { file, assets } = input;

    // Assets and screen header
    const library = buildLibrary(assets, sink);
    const source = parseScreen(value, file, sink);
    if (source === undefined) {
        return { screen: undefined, diagnostics: sink.items, valid: false };
    }

    // Layout, then the hardware tables derived from it
    const cells = layoutLayers(source.layers, library, file, sink);
    const attributes = resolveAttributes(cells, source.attributes, file, sink);
    const tileNames = cells.map((line) => line.map((cell) => cell?.tile ?? BLANK_TILE));
    const { patternTable, nametable } = buildPatternTable(tileNames, library, file, sink);

    const screen: CompiledScreen = {
        name: source.name,
        palettes: source.palettes,
        patternTable,
        nametable,
        attributes,
        attributeTable: encodeAttributeTable(attributes),
        scale: source.scale,
    };
    return { screen, diagnostics: sink.items, valid: !sink.hasErrors() };
}

/**
 * Assign pattern-table slots in nametable order, blank first. Byte-identical
 * tiles share a slot, as a CHR build would; more than 256 distinct patterns
 * cannot be shown at once without mid-frame bank switching.
 */
function buildPatternTable(
    tileNames: readonly (readonly string[])[],
    library: TileLibrary,
    file: string,
    sink: DiagnosticSink
): { patternTable: Pattern[]; nametable: number[][] } {
    const patternTable: Pattern[] = [];
    const slots = new Map<string, number>();
    const firstUser = new Map<number, string>();

    const slotFor = (name: string): number => {
        const pattern = library.background.get(name)?.pattern ?? new Uint8Array(64);
        const key = patternKey(pattern);
        let slot = slots.get(key);
        if (slot === undefined) {
            slot = patternTable.length;
            slots.set(key, slot);
            patternTable.push(pattern);
            firstUser.set(slot, name);
        }
        return slot;
    };

    slotFor(BLANK_TILE);
    const nametable = tileNames.map((line) => line.map(slotFor));

    if (patternTable.length > PATTERN_TABLE_TILES) {
        const overflow = [...firstUser.entries()]
            .filter(([slot]) => slot >= PATTERN_TABLE_TILES)
            .slice(0, 5)
            .map(([, name]) => `'${name}'`);
        sink.error(
            'pattern-limit',
            file,
            'layers',
            `screen uses ${patternTable.length} distinct background patterns; a pattern table holds ${PATTERN_TABLE_TILES}. First tiles past the limit: ${overflow.join(', ')}. Reuse tiles or drop ink/paper variants`
        );
    }

    return { patternTable, nametable };
}

function isAssetList(value: unknown): value is { assets: string[] } {
    const assets = (value as { assets?: unknown } | null)?.assets;
    return Array.isArray(assets) && assets.every((asset) => typeof asset === 'string');
}

export { compileScreen, compileScreenFile };
export type { CompiledScreen, CompileResult };
