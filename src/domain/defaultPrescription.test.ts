import { describe, expect, it } from 'vitest';
import { airSquat, bentOverRow, halfCrimpHold, plank, pullUp } from '../test/domainFixtures.ts';
import { defaultPrescription } from './defaultPrescription.ts';
import { prescriptionProblems } from './capability.ts';

describe('defaultPrescription', () => {
    it('inherits fixed movement and load behavior with the first supported unit', () => {
        expect(defaultPrescription(bentOverRow)).toEqual({
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            executionMode: 'bilateral',
            load: { kind: 'external', weight: { value: 0, unit: 'kg' } },
        });
        expect(defaultPrescription(pullUp)).toEqual({
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            executionMode: 'bilateral',
            load: { kind: 'bodyweightExternal', weight: { value: 0, unit: 'kg' } },
        });
        expect(defaultPrescription(plank)).toEqual({
            measurement: { measurement: 'duration', countBasis: 'total', seconds: 30 },
            executionMode: 'bilateral',
            load: { kind: 'bodyweight' },
        });
        expect(defaultPrescription(halfCrimpHold)).toEqual({
            measurement: { measurement: 'duration', countBasis: 'perSide', seconds: 30 },
            executionMode: 'unilateral',
            load: { kind: 'external', weight: { value: 0, unit: 'kg' } },
        });
        expect(defaultPrescription(airSquat)).toEqual({
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            executionMode: 'bilateral',
            load: { kind: 'none' },
        });
    });

    it('is always compatible with the exercise that produced it', () => {
        for (const exercise of [bentOverRow, pullUp, plank, halfCrimpHold, airSquat]) {
            expect(prescriptionProblems(exercise, defaultPrescription(exercise))).toEqual([]);
        }
    });
});
