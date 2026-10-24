import { describe, expect, it } from 'vitest';
import { iconNames, icons } from './icons.ts';

describe('icons', () => {
    it('draws each symbol as a square of 8 and of 16 pixels', () => {
        expect(iconNames).toEqual(['home', 'plan', 'move', 'body', 'history']);

        for (const name of iconNames) {
            expect(square(icons[name].small, 8)).toBe(true);
            expect(square(icons[name].large, 16)).toBe(true);
        }
    });
});

/** True when every row is `size` long and uses only empty, ink, and gold. */
function square(rows: readonly string[], size: number): boolean {
    if (rows.length !== size) {
        return false;
    }

    return rows.every((row) => row.length === size && /^[.12]+$/.test(row));
}
