import { describe, expect, it } from 'vitest';
import { plank } from '../test/domainFixtures.ts';
import { validateBodyweightMeasurement } from './validateBodyweightMeasurement.ts';
import { validateExercise } from './validateExercise.ts';

describe('validateExercise', () => {
    it('returns the parsed definition for a valid exercise', () => {
        const result = validateExercise(plank);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.value).toEqual(plank);
    });

    it('returns field paths for an incomplete definition', () => {
        const result = validateExercise({ ...plank, loads: [] });

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.errors.some((issue) => issue.path === 'loads')).toBe(true);
    });
});

describe('validateBodyweightMeasurement', () => {
    it('accepts a finite positive reading', () => {
        const result = validateBodyweightMeasurement({
            id: 'bw-1',
            measuredAt: 1_000,
            value: 80.5,
            unit: 'kg',
        });

        expect(result.ok).toBe(true);
    });

    it('rejects a non-finite value', () => {
        const result = validateBodyweightMeasurement({
            id: 'bw-1',
            measuredAt: 1_000,
            value: Number.POSITIVE_INFINITY,
            unit: 'kg',
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.errors.map((issue) => issue.path)).toContain('value');
    });
});
