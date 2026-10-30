import { describe, expect, it } from 'vitest';
import { formatDateTime, fromDatetimeLocalValue, toDatetimeLocalValue } from './datetime.ts';

describe('datetime local round-trip', () => {
    it('converts epoch millis through a datetime-local string', () => {
        const stamp = new Date(2026, 5, 15, 7, 8, 0).getTime();
        const local = toDatetimeLocalValue(stamp);

        expect(local).toBe('2026-06-15T07:08');
        expect(fromDatetimeLocalValue(local)).toBe(stamp);
    });

    it('keeps display timestamps compact without seconds or a year', () => {
        const stamp = new Date(2026, 0, 2, 3, 4).getTime();
        const label = formatDateTime(stamp);
        expect(label).toContain('03:04');
        expect(label).not.toContain('2026');
        expect(label).not.toContain('03:04:00');
    });
});
