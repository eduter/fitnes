import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { actualMeasurement, loadConfiguration, measurementValue, setPrescription } from './prescription.ts';

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

describe('actualMeasurement', () => {
    it('records an unequal number of repetitions for each side', () => {
        const performed = { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9 } };

        expect(actualMeasurement(performed)).toEqual(performed);
    });

    it('records an unequal duration for each side', () => {
        const performed = { measurement: 'duration', countBasis: 'perSide', sides: { left: 30, right: 24.5 } };

        expect(actualMeasurement(performed)).toEqual(performed);
    });

    it('records a single value when the set is counted as a total', () => {
        const performed = { measurement: 'repetitions', countBasis: 'total', reps: 8 };

        expect(actualMeasurement(performed)).toEqual(performed);
    });

    it('rejects a per-side total, which has no sides to tell apart', () => {
        expect(
            actualMeasurement({ measurement: 'repetitions', countBasis: 'total', sides: { left: 8, right: 8 } })
        ).toBeInstanceOf(type.errors);
    });

    it('rejects a single value for a per-side measurement, which loses the asymmetry', () => {
        expect(actualMeasurement({ measurement: 'repetitions', countBasis: 'perSide', reps: 10 })).toBeInstanceOf(
            type.errors
        );
    });

    it('rejects a side that was not performed', () => {
        expect(
            actualMeasurement({ measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 0 } })
        ).toBeInstanceOf(type.errors);
    });

    it('rejects a missing side', () => {
        expect(
            actualMeasurement({ measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10 } })
        ).toBeInstanceOf(type.errors);
    });

    it('rejects a side value of the wrong measurement kind', () => {
        expect(
            actualMeasurement({ measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9.5 } })
        ).toBeInstanceOf(type.errors);
    });
});
