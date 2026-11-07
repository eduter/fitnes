import { describe, expect, it } from 'vitest';
import { convertWeight, massValue, formatMass } from './convertWeight.ts';

describe('configured mass units', () => {
    it('converts pounds and kilograms without changing the source record', () => {
        const weight = { value: 100, unit: 'kg' as const };
        expect(convertWeight(weight, 'lb').value).toBeCloseTo(220.46226218);
        expect(convertWeight(convertWeight(weight, 'lb'), 'kg').value).toBeCloseTo(100);
        expect(weight).toEqual({ value: 100, unit: 'kg' });
    });
    it('rounds only the displayed value and shows one decimal for bodyweight', () => {
        expect(massValue({ value: 100, unit: 'kg' }, 'lb', 1)).toBe(220.5);
        expect(formatMass({ value: 80, unit: 'kg' }, 'kg', 1)).toBe('80.0 kg');
        expect(formatMass({ value: 40, unit: 'kg' }, 'lb')).toBe('88.18 lb');
    });
});
