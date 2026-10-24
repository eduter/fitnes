import { describe, expect, it } from 'vitest';
import { formatPaletteIndex, masterPalette, PALETTE_LENGTH, parsePaletteIndex } from './palette.ts';

describe('masterPalette', () => {
    const palette = masterPalette();

    it('lists the 64 logical PPU colors from the FCEUX decoding', () => {
        expect(palette.id).toBe('fceux-default');
        expect(palette.colors).toHaveLength(PALETTE_LENGTH);
        expect(palette.reference.toLowerCase()).toContain('fceux');
        expect(palette.colors[0x0f]).toEqual({ r: 0, g: 0, b: 0 });
        expect(palette.colors[0x16]).toEqual({ r: 0xd8, g: 0x28, b: 0x00 });
        expect(palette.colors[0x30]).toEqual({ r: 0xfc, g: 0xfc, b: 0xfc });
        expect(palette.colors[0x20]).toEqual(palette.colors[0x30]);
    });
});

describe('parsePaletteIndex', () => {
    it('accepts decimal numbers and hex byte strings', () => {
        expect(parsePaletteIndex(15)).toBe(0x0f);
        expect(parsePaletteIndex('$0F')).toBe(0x0f);
        expect(parsePaletteIndex('0x10')).toBe(0x10);
        expect(parsePaletteIndex('10')).toBe(0x10);
        expect(parsePaletteIndex(10)).toBe(10);
    });

    it('rejects values outside the master palette', () => {
        expect(parsePaletteIndex(64)).toBeUndefined();
        expect(parsePaletteIndex(-1)).toBeUndefined();
        expect(parsePaletteIndex('$40')).toBeUndefined();
        expect(parsePaletteIndex('F')).toBeUndefined();
        expect(parsePaletteIndex(1.5)).toBeUndefined();
        expect(parsePaletteIndex('red')).toBeUndefined();
    });

    it('formats indexes as NES hex bytes', () => {
        expect(formatPaletteIndex(15)).toBe('$0F');
        expect(formatPaletteIndex(0x21)).toBe('$21');
    });
});
