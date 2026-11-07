import { describe, expect, it } from 'vitest';
import {
    formatDate,
    fromDateLocalValue,
    toDateLocalValue,
    formatDateTime,
    fromDatetimeLocalValue,
    toDatetimeLocalValue,
} from './datetime.ts';

describe('datetime local round-trip', () => {
    it('converts epoch millis through a datetime-local string', () => {
        const stamp = new Date(2026, 5, 15, 7, 8, 0).getTime();
        const local = toDatetimeLocalValue(stamp);

        expect(local).toBe('2026-06-15T07:08');
        expect(fromDatetimeLocalValue(local)).toBe(stamp);
    });

    it('formats a timestamp with the runtime locale', () => {
        const stamp = new Date(2026, 0, 2, 3, 4).getTime();
        expect(formatDateTime(stamp)).toBe(new Date(stamp).toLocaleString());
    });
});

describe('local calendar dates', () => {
    it('round-trips a day at local midnight without UTC conversion', () => {
        const stamp = new Date(2026, 10, 5, 19, 45).getTime();
        expect(toDateLocalValue(stamp)).toBe('2026-11-05');
        expect(fromDateLocalValue('2026-11-05')).toBe(new Date(2026, 10, 5).getTime());
        expect(formatDate(stamp)).toBe(new Date(stamp).toLocaleDateString());
    });
    it('rejects invalid calendar dates rather than normalizing them into another month', () => {
        expect(fromDateLocalValue('2026-02-30')).toBeNaN();
        expect(fromDateLocalValue('')).toBeNaN();
    });
});
