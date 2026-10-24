import fitnesAssets from '../../nes/assets/fitnes.json' with { type: 'json' };

/** Family installed on the document and named from CSS. */
const HUD_FONT_FAMILY = 'FitNES HUD';

/**
 * TrueType requires unitsPerEm of at least 16. 64 units, 8 per NES pixel,
 * is one tile per em, so `font-size: 8 * var(--px)` draws one logical pixel
 * per device pixel of the column scale.
 */
const UNITS_PER_EM = 64;
const PIXEL = UNITS_PER_EM / 8;

/**
 * Marks the UI uses that the tile font does not. Drawn here so the pattern
 * table stays a background font and the page can still say "3/5 · 80×8".
 */
const EXTRA_GLYPHS: Record<string, readonly string[]> = {
    // The tile M shares N's diagonal, so a menu label reads as N. This one has a valley.
    M: ['30000030', '33000330', '30303030', '30030030', '30000030', '30000030', '30000030', '00000000'],
    '>': ['30000000', '33000000', '33300000', '33330000', '33300000', '33000000', '30000000', '00000000'],
    '<': ['00000030', '00000330', '00003330', '00033330', '00003330', '00000330', '00000030', '00000000'],
    '^': ['00330000', '03333000', '33000330', '30000030', '00000000', '00000000', '00000000', '00000000'],
    '=': ['00000000', '33333300', '00000000', '33333300', '00000000', '00000000', '00000000', '00000000'],
    '*': ['30000300', '03333000', '00330000', '33333330', '00330000', '03333000', '30000300', '00000000'],
    '@': ['00333300', '33000330', '33033330', '33300330', '33333330', '33000000', '00333300', '00000000'],
    '·': ['00000000', '00000000', '00000000', '00330000', '00330000', '00000000', '00000000', '00000000'],
    '—': ['00000000', '00000000', '00000000', '03333330', '00000000', '00000000', '00000000', '00000000'],
    '–': ['00000000', '00000000', '00000000', '00333300', '00000000', '00000000', '00000000', '00000000'],
    '→': ['00000000', '00033000', '00003300', '33333330', '00003300', '00033000', '00000000', '00000000'],
    '…': ['00000000', '00000000', '00000000', '00000000', '00000000', '03030300', '00000000', '00000000'],
    '×': ['30000030', '03000300', '00330000', '00000000', '00330000', '03000300', '30000030', '00000000'],
};

const NOTDEF: readonly string[] = [
    '33333333',
    '30000003',
    '30000003',
    '30000003',
    '30000003',
    '30000003',
    '30000003',
    '33333333',
];

interface GlyphMapping {
    codePoint: number;
    glyphId: number;
}

/**
 * Build a monospaced TrueType font from the FitNES HUD bitmaps.
 * Lowercase letters use the uppercase tiles. An 8-unit em is one tile.
 */
function buildHudFont(): Uint8Array {
    const rowsById: (readonly string[])[] = [NOTDEF];
    const patternIds = new Map<string, number>([[NOTDEF.join('|'), 0]]);
    const mappings: GlyphMapping[] = [];

    for (const [character, rows] of Object.entries(allGlyphs())) {
        const codePoint = character.codePointAt(0);
        if (codePoint === undefined || [...character].length !== 1) {
            throw new Error(`hud font glyph name '${character}' must be one character`);
        }
        assertRows(character, rows);

        const key = rows.join('|');
        let glyphId = patternIds.get(key);
        if (glyphId === undefined) {
            glyphId = rowsById.length;
            rowsById.push(rows);
            patternIds.set(key, glyphId);
        }
        mappings.push({ codePoint, glyphId });
    }

    mappings.sort((left, right) => left.codePoint - right.codePoint);

    // Lowercase points at the same tile as uppercase
    for (let index = 0; index < 26; index++) {
        const upper = mappings.find((mapping) => mapping.codePoint === 65 + index);
        if (!upper) {
            continue;
        }
        mappings.push({ codePoint: 97 + index, glyphId: upper.glyphId });
    }
    mappings.sort((left, right) => left.codePoint - right.codePoint);

    const encoded = rowsById.map((rows) => encodeGlyph(rows));
    const glyf = concat(encoded.map((glyph) => glyph.bytes));
    const loca = encodeLoca(encoded.map((glyph) => glyph.size));
    const cmap = encodeCmap(mappings);
    const maxPoints = Math.max(...encoded.map((glyph) => glyph.points));
    const maxContours = Math.max(...encoded.map((glyph) => glyph.contours));

    const tables = new Map<string, Uint8Array>([
        ['OS/2', encodeOs2(mappings)],
        ['cmap', cmap],
        ['glyf', glyf],
        ['head', encodeHead()],
        ['hhea', encodeHhea(rowsById.length)],
        ['hmtx', encodeHmtx(rowsById.length)],
        ['loca', loca],
        ['maxp', encodeMaxp(rowsById.length, maxPoints, maxContours)],
        ['name', encodeName()],
        ['post', encodePost()],
    ]);

    return packFont(tables);
}

/** Install the HUD face. Later text uses `font-family: "FitNES HUD"`. */
async function installHudFont(): Promise<void> {
    const bytes = buildHudFont();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const face = new FontFace(HUD_FONT_FAMILY, buffer);
    await face.load();
    document.fonts.add(face);
}

function allGlyphs(): Record<string, readonly string[]> {
    return { ...fitnesAssets.fonts.hud.glyphs, ...EXTRA_GLYPHS };
}

function assertRows(character: string, rows: readonly string[]): void {
    if (rows.length !== 8 || rows.some((row) => row.length !== 8)) {
        throw new Error(`hud font glyph '${character}' must be 8×8`);
    }
}

interface EncodedGlyph {
    bytes: Uint8Array;
    size: number;
    points: number;
    contours: number;
}

/** One clockwise square per lit pixel. Shared edges cancel under the nonzero winding rule. */
function encodeGlyph(rows: readonly string[]): EncodedGlyph {
    const contours: { x: number; y: number }[][] = [];
    for (let row = 0; row < 8; row++) {
        const line = rows[row] ?? '';
        for (let col = 0; col < 8; col++) {
            const pixel = line[col];
            if (pixel === undefined || pixel === '0' || pixel === '.') {
                continue;
            }
            const x = col * PIXEL;
            const y = (7 - row) * PIXEL;
            contours.push([
                { x, y: y + PIXEL },
                { x: x + PIXEL, y: y + PIXEL },
                { x: x + PIXEL, y },
                { x, y },
            ]);
        }
    }

    if (contours.length === 0) {
        return { bytes: new Uint8Array(0), size: 0, points: 0, contours: 0 };
    }

    const buffer = new Buf();
    let xMin = UNITS_PER_EM;
    let yMin = UNITS_PER_EM;
    let xMax = 0;
    let yMax = 0;
    for (const contour of contours) {
        for (const point of contour) {
            xMin = Math.min(xMin, point.x);
            yMin = Math.min(yMin, point.y);
            xMax = Math.max(xMax, point.x);
            yMax = Math.max(yMax, point.y);
        }
    }

    buffer.i16(contours.length);
    buffer.i16(xMin);
    buffer.i16(yMin);
    buffer.i16(xMax);
    buffer.i16(yMax);

    let end = -1;
    for (const contour of contours) {
        end += contour.length;
        buffer.u16(end);
    }
    buffer.u16(0);

    const flags: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    let previousX = 0;
    let previousY = 0;
    for (const contour of contours) {
        for (const point of contour) {
            flags.push(pointFlag(point.x - previousX, point.y - previousY, xs, ys));
            previousX = point.x;
            previousY = point.y;
        }
    }
    for (const flag of flags) {
        buffer.u8(flag);
    }
    for (const x of xs) {
        buffer.u8(x);
    }
    for (const y of ys) {
        buffer.u8(y);
    }
    buffer.align(2);

    const bytes = buffer.finish();
    return { bytes, size: bytes.length, points: flags.length, contours: contours.length };
}

function pointFlag(dx: number, dy: number, xs: number[], ys: number[]): number {
    let flag = 0x01;
    flag |= axisFlag(dx, xs, 0x02, 0x10);
    flag |= axisFlag(dy, ys, 0x04, 0x20);
    return flag;
}

function axisFlag(delta: number, out: number[], shortBit: number, positiveBit: number): number {
    if (delta === 0) {
        return positiveBit;
    }
    if (Math.abs(delta) > 255) {
        throw new Error(`hud font delta ${delta} does not fit a byte`);
    }
    out.push(Math.abs(delta));
    return shortBit | (delta > 0 ? positiveBit : 0);
}

function encodeLoca(sizes: readonly number[]): Uint8Array {
    const buffer = new Buf();
    let offset = 0;
    buffer.u32(0);
    for (const size of sizes) {
        offset += size;
        buffer.u32(offset);
    }
    return buffer.finish();
}

function encodeCmap(mappings: readonly GlyphMapping[]): Uint8Array {
    const runs: { start: number; end: number; startId: number }[] = [];
    for (const mapping of mappings) {
        const last = runs[runs.length - 1];
        if (
            last &&
            mapping.codePoint === last.end + 1 &&
            mapping.glyphId === last.startId + (mapping.codePoint - last.start)
        ) {
            last.end = mapping.codePoint;
            continue;
        }
        runs.push({ start: mapping.codePoint, end: mapping.codePoint, startId: mapping.glyphId });
    }

    const segments = runs.length + 1;
    const searchRange = 2 * 2 ** Math.floor(Math.log2(segments));
    const entrySelector = Math.log2(searchRange / 2);
    const rangeShift = 2 * segments - searchRange;
    const buffer = new Buf();

    buffer.u16(0);
    buffer.u16(1);
    buffer.u16(3);
    buffer.u16(1);
    buffer.u32(12);

    buffer.u16(4);
    const lengthAt = buffer.length;
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(segments * 2);
    buffer.u16(searchRange);
    buffer.u16(entrySelector);
    buffer.u16(rangeShift);
    for (const run of runs) {
        buffer.u16(run.end);
    }
    buffer.u16(0xffff);
    buffer.u16(0);
    for (const run of runs) {
        buffer.u16(run.start);
    }
    buffer.u16(0xffff);
    for (const run of runs) {
        buffer.i16(run.startId - run.start);
    }
    buffer.i16(1);
    for (let index = 0; index < segments; index++) {
        buffer.u16(0);
    }

    const formatLength = buffer.length - 12;
    buffer.view.setUint16(lengthAt, formatLength);
    return buffer.finish();
}

function encodeHead(): Uint8Array {
    const buffer = new Buf();
    buffer.u32(0x00010000);
    buffer.u32(0x00010000);
    buffer.u32(0);
    buffer.u32(0x5f0f3cf5);
    buffer.u16(0b11);
    buffer.u16(UNITS_PER_EM);
    buffer.u32(0);
    buffer.u32(0);
    buffer.u32(0);
    buffer.u32(0);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(UNITS_PER_EM);
    buffer.u16(0);
    buffer.u16(8);
    buffer.i16(2);
    buffer.i16(1);
    buffer.i16(0);
    return buffer.finish();
}

function encodeHhea(glyphCount: number): Uint8Array {
    const buffer = new Buf();
    buffer.u32(0x00010000);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(0);
    buffer.i16(0);
    buffer.u16(UNITS_PER_EM);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(1);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(0);
    buffer.u16(glyphCount);
    return buffer.finish();
}

function encodeHmtx(glyphCount: number): Uint8Array {
    const buffer = new Buf();
    for (let index = 0; index < glyphCount; index++) {
        buffer.u16(UNITS_PER_EM);
        buffer.i16(0);
    }
    return buffer.finish();
}

function encodeMaxp(glyphCount: number, maxPoints: number, maxContours: number): Uint8Array {
    const buffer = new Buf();
    buffer.u32(0x00010000);
    buffer.u16(glyphCount);
    buffer.u16(maxPoints);
    buffer.u16(maxContours);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(2);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(0);
    buffer.u16(0);
    return buffer.finish();
}

function encodePost(): Uint8Array {
    const buffer = new Buf();
    buffer.u32(0x00030000);
    buffer.u32(0);
    buffer.i16(0);
    buffer.i16(1);
    buffer.u32(1);
    buffer.u32(0);
    buffer.u32(0);
    buffer.u32(0);
    buffer.u32(0);
    return buffer.finish();
}

function encodeOs2(mappings: readonly GlyphMapping[]): Uint8Array {
    const codes = mappings.map((mapping) => mapping.codePoint);
    const buffer = new Buf();
    buffer.u16(3);
    buffer.i16(UNITS_PER_EM);
    buffer.u16(400);
    buffer.u16(5);
    buffer.u16(0);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(0);
    buffer.i16(0);
    buffer.i16(1);
    buffer.i16(4);
    buffer.i16(0);
    for (let index = 0; index < 10; index++) {
        buffer.u8(0);
    }
    // Basic Latin, Latin-1, General Punctuation. Arrows sit in range 2.
    buffer.u32(0x80000003);
    buffer.u32(0x00000020);
    buffer.u32(0);
    buffer.u32(0);
    buffer.u32(tagValue('FTNS'));
    buffer.u16(0x0040);
    buffer.u16(Math.min(...codes));
    buffer.u16(Math.max(...codes));
    buffer.i16(UNITS_PER_EM);
    buffer.i16(0);
    buffer.i16(0);
    buffer.u16(UNITS_PER_EM);
    buffer.u16(0);
    buffer.u32(1);
    buffer.u32(0);
    buffer.i16(UNITS_PER_EM);
    buffer.i16(UNITS_PER_EM);
    buffer.u16(0);
    buffer.u16(32);
    buffer.u16(0);
    return buffer.finish();
}

function encodeName(): Uint8Array {
    const records: { id: number; text: string }[] = [
        { id: 0, text: 'FitNES' },
        { id: 1, text: HUD_FONT_FAMILY },
        { id: 2, text: 'Regular' },
        { id: 4, text: HUD_FONT_FAMILY },
        { id: 6, text: 'FitNESHUD' },
    ];
    const strings = new Buf();
    const directory = records.map((record) => {
        const offset = strings.length;
        for (const char of record.text) {
            strings.u16(char.charCodeAt(0));
        }
        return { ...record, offset, length: record.text.length * 2 };
    });
    const stringBytes = strings.finish();
    const buffer = new Buf();
    buffer.u16(0);
    buffer.u16(records.length);
    buffer.u16(stringStorageOffset(records.length));
    for (const record of directory) {
        buffer.u16(3);
        buffer.u16(1);
        buffer.u16(0x0409);
        buffer.u16(record.id);
        buffer.u16(record.length);
        buffer.u16(record.offset);
    }
    buffer.bytes(stringBytes);
    return buffer.finish();
}

function stringStorageOffset(count: number): number {
    return 6 + count * 12;
}

function packFont(tables: Map<string, Uint8Array>): Uint8Array {
    const tags = [...tables.keys()].sort();
    const count = tags.length;
    const searchRange = 16 * 2 ** Math.floor(Math.log2(count));
    const entrySelector = Math.log2(searchRange / 16);
    const rangeShift = count * 16 - searchRange;
    const directory = 12 + count * 16;

    let offset = directory;
    const placed = tags.map((tag) => {
        const bytes = tables.get(tag);
        if (!bytes) {
            throw new Error(`hud font is missing the ${tag} table`);
        }
        const start = offset;
        offset += bytes.length + ((4 - (bytes.length % 4)) % 4);
        return { tag, bytes, start };
    });

    const file = new Buf();
    file.u32(0x00010000);
    file.u16(count);
    file.u16(searchRange);
    file.u16(entrySelector);
    file.u16(rangeShift);
    for (const table of placed) {
        file.u32(tagValue(table.tag));
        file.u32(tableChecksum(table.bytes));
        file.u32(table.start);
        file.u32(table.bytes.length);
    }
    for (const table of placed) {
        file.bytes(table.bytes);
        file.align(4);
    }

    const bytes = file.finish();
    const head = placed.find((table) => table.tag === 'head');
    if (!head) {
        throw new Error('hud font is missing the head table');
    }
    const adjustment = (0xb1b0afba - checksum(bytes)) >>> 0;
    new DataView(bytes.buffer).setUint32(head.start + 8, adjustment);
    return bytes;
}

function tagValue(tag: string): number {
    return (tag.charCodeAt(0) << 24) | (tag.charCodeAt(1) << 16) | (tag.charCodeAt(2) << 8) | tag.charCodeAt(3);
}

function tableChecksum(bytes: Uint8Array): number {
    const padded = new Uint8Array(bytes.length + ((4 - (bytes.length % 4)) % 4));
    padded.set(bytes);
    return checksum(padded);
}

function checksum(bytes: Uint8Array): number {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let sum = 0;
    for (let offset = 0; offset < bytes.length; offset += 4) {
        sum = (sum + view.getUint32(offset)) >>> 0;
    }
    return sum;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

/** A growing big-endian buffer for one TrueType table. */
class Buf {
    private data = new Uint8Array(256);
    view = new DataView(this.data.buffer);
    length = 0;

    u8(value: number): void {
        this.grow(1);
        this.data[this.length] = value & 0xff;
        this.length += 1;
    }

    u16(value: number): void {
        this.grow(2);
        this.view.setUint16(this.length, value);
        this.length += 2;
    }

    i16(value: number): void {
        this.grow(2);
        this.view.setInt16(this.length, value);
        this.length += 2;
    }

    u32(value: number): void {
        this.grow(4);
        this.view.setUint32(this.length, value >>> 0);
        this.length += 4;
    }

    bytes(value: Uint8Array): void {
        this.grow(value.length);
        this.data.set(value, this.length);
        this.length += value.length;
    }

    align(multiple: number): void {
        while (this.length % multiple !== 0) {
            this.u8(0);
        }
    }

    finish(): Uint8Array {
        return this.data.slice(0, this.length);
    }

    private grow(extra: number): void {
        if (this.length + extra <= this.data.length) {
            return;
        }
        const next = new Uint8Array(Math.max(this.data.length * 2, this.length + extra));
        next.set(this.data.subarray(0, this.length));
        this.data = next;
        this.view = new DataView(next.buffer);
    }
}

export { buildHudFont, HUD_FONT_FAMILY, installHudFont };
