import { expect, it } from 'vitest';
import { isCalendarDate, shiftDate } from './date.ts';

it('steps across leap days, year boundaries and daylight-saving dates', () => {
    expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDate('2025-03-01', -1)).toBe('2025-02-28');
    expect(shiftDate('2025-12-31', 1)).toBe('2026-01-01');
    expect(shiftDate('2026-03-08', 1)).toBe('2026-03-09');
    expect(shiftDate('2026-11-01', -1)).toBe('2026-10-31');
});
it('rejects invalid input and retains calendar limits', () => {
    expect(isCalendarDate('2025-02-29')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
    expect(shiftDate('0001-01-01', -1)).toBe('0001-01-01');
    expect(() => shiftDate('2026-02-31', 1)).toThrow('Invalid calendar date');
});
