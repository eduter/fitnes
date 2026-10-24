import { describe, expect, it } from 'vitest';
import { buildHudFont } from './hudFont.ts';

describe('buildHudFont', () => {
    const font = buildHudFont();

    it('checksums as a TrueType font', () => {
        expect(checksum(font)).toBe(0xb1b0afba);
        expect(font[0]).toBe(0);
        expect(font[1]).toBe(1);
        expect(font[2]).toBe(0);
        expect(font[3]).toBe(0);
    });

    it('maps letters, digits, and the menu marks onto tiles', () => {
        expect(contourCount(font, 'A'.codePointAt(0) ?? 0)).toBeGreaterThan(0);
        expect(contourCount(font, '0'.codePointAt(0) ?? 0)).toBeGreaterThan(0);
        expect(contourCount(font, '·'.codePointAt(0) ?? 0)).toBeGreaterThan(0);
        expect(contourCount(font, '×'.codePointAt(0) ?? 0)).toBeGreaterThan(0);
        expect(contourCount(font, ' '.codePointAt(0) ?? 0)).toBe(0);
    });

    it('keeps M distinct from N', () => {
        expect(glyphId(font, 'M'.codePointAt(0) ?? 0)).not.toBe(glyphId(font, 'N'.codePointAt(0) ?? 0));
        expect(contourCount(font, 'M'.codePointAt(0) ?? 0)).toBeGreaterThan(0);
    });

    it('reuses the uppercase tile for lowercase', () => {
        expect(glyphId(font, 'a'.codePointAt(0) ?? 0)).toBe(glyphId(font, 'A'.codePointAt(0) ?? 0));
    });
});

function checksum(bytes: Uint8Array): number {
    const padded = new Uint8Array(bytes.length + ((4 - (bytes.length % 4)) % 4));
    padded.set(bytes);
    const view = new DataView(padded.buffer);
    let sum = 0;
    for (let offset = 0; offset < padded.length; offset += 4) {
        sum = (sum + view.getUint32(offset)) >>> 0;
    }
    return sum;
}

function contourCount(font: Uint8Array, codePoint: number): number {
    const id = glyphId(font, codePoint);
    const glyf = table(font, 'glyf');
    const loca = table(font, 'loca');
    const view = new DataView(loca.buffer, loca.byteOffset, loca.byteLength);
    const start = view.getUint32(id * 4);
    const end = view.getUint32((id + 1) * 4);
    if (start === end) {
        return 0;
    }
    return new DataView(glyf.buffer, glyf.byteOffset + start, end - start).getInt16(0);
}

function glyphId(font: Uint8Array, codePoint: number): number {
    const cmap = table(font, 'cmap');
    const view = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
    const subtable = view.getUint32(8);
    const segCount = view.getUint16(subtable + 6) / 2;
    const endBase = subtable + 14;
    const startBase = endBase + segCount * 2 + 2;
    const deltaBase = startBase + segCount * 2;
    for (let index = 0; index < segCount; index++) {
        const end = view.getUint16(endBase + index * 2);
        const start = view.getUint16(startBase + index * 2);
        if (codePoint < start || codePoint > end) {
            continue;
        }
        const delta = view.getInt16(deltaBase + index * 2);
        return (codePoint + delta) & 0xffff;
    }
    return 0;
}

function table(font: Uint8Array, tag: string): Uint8Array {
    const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
    const count = view.getUint16(4);
    for (let index = 0; index < count; index++) {
        const at = 12 + index * 16;
        const name = String.fromCharCode(font[at] ?? 0, font[at + 1] ?? 0, font[at + 2] ?? 0, font[at + 3] ?? 0);
        if (name !== tag) {
            continue;
        }
        const offset = view.getUint32(at + 8);
        const length = view.getUint32(at + 12);
        return font.subarray(offset, offset + length);
    }
    throw new Error(`font has no ${tag} table`);
}
