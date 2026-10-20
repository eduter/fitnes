import { describe, expect, it } from 'vitest';
import { airSquat, bentOverRow, halfCrimpHold, plank, pullUp } from '../test/domainFixtures.ts';
import { defaultPrescription } from './defaultPrescription.ts';
import { prescriptionProblems } from './capability.ts';

describe('defaultPrescription', () => {
    it('picks the first allowed measurement, execution mode, and load for each example', () => {
        expect(defaultPrescription(bentOverRow)).toEqual({
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            executionMode: 'bilateral',
            load: { kind: 'external', basis: 'total', weight: { value: 0, unit: 'kg' } },
        });
        expect(defaultPrescription(pullUp)).toEqual({
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            executionMode: 'bilateral',
            load: { kind: 'bodyweight' },
        });
        expect(defaultPrescription(plank)).toEqual({
            measurement: { measurement: 'duration', countBasis: 'total', seconds: 30 },
            executionMode: 'bilateral',
            load: { kind: 'bodyweight' },
        });
        expect(defaultPrescription(halfCrimpHold)).toEqual({
            measurement: { measurement: 'duration', countBasis: 'perSide', seconds: 30 },
            executionMode: 'unilateral',
            load: { kind: 'external', basis: 'perHand', weight: { value: 0, unit: 'kg' } },
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
