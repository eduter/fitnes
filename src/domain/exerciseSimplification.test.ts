import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { exerciseDefinition } from './exercise.ts';
import { defaultPrescription } from './defaultPrescription.ts';
import { prescriptionProblems } from './capability.ts';

const pullUp = {
    id: 'ex-pull-up',
    name: 'Pull-up',
    measurements: ['repetitions'],
    executionModes: ['bilateral'],
    load: { kind: 'bodyweightExternal' },
} as const;

describe('exercise-owned configuration', () => {
    it('accepts one movement and one load configuration without counting or weight bases', () => {
        expect(exerciseDefinition(pullUp)).not.toBeInstanceOf(type.errors);
    });
    it('derives counting from movement and uses zero added weight for ordinary pull-ups', () => {
        const exercise = exerciseDefinition.assert(pullUp);
        const prescription = defaultPrescription(exercise);
        expect(prescription).toEqual({
            executionMode: 'bilateral',
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            load: { kind: 'bodyweightExternal', weight: { value: 0, unit: 'kg' } },
        });
        expect(prescriptionProblems(exercise, prescription)).toEqual([]);
    });
    it('rejects a per-side target for both-sides-together movement', () => {
        const exercise = exerciseDefinition.assert(pullUp);
        const prescription = defaultPrescription(exercise);
        prescription.measurement = { measurement: 'repetitions', countBasis: 'perSide', reps: 8 };
        expect(prescriptionProblems(exercise, prescription).some((issue) => issue.field === 'measurement')).toBe(true);
    });
    it('derives a target for each side for one-side-at-a-time movement', () => {
        const exercise = exerciseDefinition.assert({ ...pullUp, executionModes: ['unilateral'] });
        expect(defaultPrescription(exercise).measurement.countBasis).toBe('perSide');
    });
});

it('validates either supported sides choice while rejecting contradictory counting', () => {
    const exercise = exerciseDefinition.assert({ ...pullUp, executionModes: ['bilateral', 'unilateral'] });
    const prescription = defaultPrescription(exercise);
    prescription.executionMode = 'unilateral';
    expect(prescriptionProblems(exercise, prescription)).not.toEqual([]);
    prescription.measurement.countBasis = 'perSide';
    expect(prescriptionProblems(exercise, prescription)).toEqual([]);
});
