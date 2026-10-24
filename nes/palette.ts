import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** One sRGB interpretation of a logical NES palette index. */
interface Rgb {
    readonly r: number;
    readonly g: number;
    readonly b: number;
}

/** The 64 logical PPU colors and the RGB table chosen to display them. */
interface MasterPalette {
    readonly id: string;
    readonly reference: string;
    readonly colors: readonly Rgb[];
}

const PALETTE_LENGTH = 64;

/**
 * Load the source-controlled master palette.
 *
 * `colors[i]` is the RGB stand-in for PPU index `i` (`$00`–`$3F`). Several
 * indices are black in this table, including `$0D`, which on NTSC hardware is
 * an out-of-range "blacker than black" signal rather than a normal color.
 * `$20` and `$30` are the same near-white here; other decodings split them.
 */
function masterPalette(): MasterPalette {
    const path = fileURLToPath(new URL('./palette.json', import.meta.url));
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

    if (!isRecord(parsed) || !Array.isArray(parsed.colors) || parsed.colors.length !== PALETTE_LENGTH) {
        throw new Error(`nes palette file '${path}' must list ${PALETTE_LENGTH} colors`);
    }

    const id = parsed.id;
    const reference = parsed.reference;
    if (typeof id !== 'string' || typeof reference !== 'string') {
        throw new Error(`nes palette file '${path}' is missing id or reference`);
    }

    const colors = parsed.colors.map((entry, index) => parseHexColor(entry, index, path));
    return { id, reference, colors };
}

/**
 * Parse a palette index written as a decimal number or a `$`/`0x` hex byte.
 * Strings are always hex (`"10"` is `$10`), so they are not confused with
 * decimal JSON numbers (`10` is index 10).
 */
function parsePaletteIndex(value: unknown): number | undefined {
    if (typeof value === 'number') {
        if (!Number.isInteger(value) || value < 0 || value >= PALETTE_LENGTH) {
            return undefined;
        }
        return value;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const match = /^(?:\$|0x)?([0-9A-Fa-f]{2})$/.exec(value);
    if (match === null) {
        return undefined;
    }

    const index = Number.parseInt(match[1], 16);
    if (index >= PALETTE_LENGTH) {
        return undefined;
    }
    return index;
}

/** Format a palette index as `$0F` so diagnostics match NES documentation. */
function formatPaletteIndex(index: number): string {
    return `$${index.toString(16).toUpperCase().padStart(2, '0')}`;
}

function parseHexColor(value: unknown, index: number, path: string): Rgb {
    if (typeof value !== 'string' || !/^[0-9A-Fa-f]{6}$/.test(value)) {
        throw new Error(`nes palette file '${path}' color ${index} is not a 6-digit hex RGB value`);
    }

    return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16),
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export { formatPaletteIndex, masterPalette, PALETTE_LENGTH, parsePaletteIndex };
export type { MasterPalette, Rgb };
