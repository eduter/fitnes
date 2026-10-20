import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { loadConfiguration, measurementValue, setPrescription } from './prescription.ts';

describe('prescription schemas', () => {
    it('rejects fields from the other measurement variant', () => {
        const repetitionsWithSeconds = {
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 8,
            seconds: 30,
        };
        const durationWithReps = {
            measurement: 'duration',
            countBasis: 'total',
            seconds: 30,
            reps: 8,
        };

        expect(measurementValue(repetitionsWithSeconds)).toBeInstanceOf(type.errors);
        expect(measurementValue(durationWithReps)).toBeInstanceOf(type.errors);
    });

    it('rejects fields from another load variant', () => {
        const bodyweightWithWeight = {
            kind: 'bodyweight',
            weight: { value: 80, unit: 'kg' },
        };
        const noneWithBasis = { kind: 'none', basis: 'total' };

        expect(loadConfiguration(bodyweightWithWeight)).toBeInstanceOf(type.errors);
        expect(loadConfiguration(noneWithBasis)).toBeInstanceOf(type.errors);
    });

    it('rejects unknown fields nested in a prescription', () => {
        const prescription = {
            measurement: {
                measurement: 'repetitions',
                countBasis: 'total',
                reps: 8,
                note: 'work set',
            },
            executionMode: 'bilateral',
            load: {
                kind: 'external',
                basis: 'total',
                weight: { value: 40, unit: 'kg', approximate: true },
            },
        };

        expect(setPrescription(prescription)).toBeInstanceOf(type.errors);
    });
});
