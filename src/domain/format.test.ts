import { describe, expect, it } from 'vitest';
import { formatLoad, formatMeasurement, formatWeight } from './format.ts';

describe('formatMeasurement', () => {
    it('labels total and per-side counts', () => {
        expect(formatMeasurement({ measurement: 'repetitions', countBasis: 'total', reps: 8 })).toBe('8 reps');
        expect(formatMeasurement({ measurement: 'repetitions', countBasis: 'perSide', reps: 8 })).toBe('8 reps / side');
        expect(formatMeasurement({ measurement: 'duration', countBasis: 'total', seconds: 30 })).toBe('30s');
        expect(formatMeasurement({ measurement: 'duration', countBasis: 'perSide', seconds: 12.5 })).toBe(
            '12.5s / side'
        );
    });

    it('shows both sides when a performed per-side value is unequal', () => {
        expect(
            formatMeasurement({ measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9 } })
        ).toBe('10 reps left, 9 reps right');
        expect(
            formatMeasurement({ measurement: 'duration', countBasis: 'perSide', sides: { left: 30, right: 24.5 } })
        ).toBe('30s left, 24.5s right');
    });

    it('collapses a performed per-side value to one number when the sides match', () => {
        expect(
            formatMeasurement({ measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 10 } })
        ).toBe('10 reps / side');
    });
});

describe('formatLoad', () => {
    it('describes each load kind without collapsing bodyweight and external', () => {
        expect(formatLoad({ kind: 'none' })).toBe('no load');
        expect(formatLoad({ kind: 'bodyweight' })).toBe('bodyweight');
        expect(formatLoad({ kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } })).toBe('40 kg total');
        expect(formatLoad({ kind: 'external', basis: 'perSide', weight: { value: 20, unit: 'kg' } })).toBe(
            '20 kg / side'
        );
        expect(formatLoad({ kind: 'external', basis: 'perSide', weight: { value: 15, unit: 'lb' } })).toBe(
            '15 lb / side'
        );
        expect(formatLoad({ kind: 'bodyweightExternal', basis: 'total', weight: { value: 10, unit: 'kg' } })).toBe(
            'bodyweight + 10 kg total'
        );
    });
});

describe('formatWeight', () => {
    it('includes the unit', () => {
        expect(formatWeight({ value: 80.2, unit: 'kg' })).toBe('80.2 kg');
    });
});
