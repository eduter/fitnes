import { describe, expect, it } from 'vitest';
import { defaultPrescription } from '../../domain/defaultPrescription.ts';
import type { SetPrescription } from '../../domain/prescription.ts';
import { airSquat, pullUp, rowTemplate } from '../../test/domainFixtures.ts';
import { prescriptionSummary } from './prescriptionSummary.ts';

function prescription(overrides: Partial<SetPrescription> = {}): SetPrescription {
    return { ...rowTemplate().sets[0]!.prescription, ...overrides };
}

describe('prescriptionSummary', () => {
    it('reads count then load for an external weighted set', () => {
        expect(prescriptionSummary(prescription())).toBe('8 reps @ 40kg');
    });

    it('marks a per-side count while keeping added weight total', () => {
        const perSide = prescription({
            measurement: { measurement: 'repetitions', countBasis: 'perSide', reps: 10 },
            load: { kind: 'external', weight: { value: 12, unit: 'kg' } },
        });

        expect(prescriptionSummary(perSide)).toBe('10 reps/side @ 12kg');
    });

    it('names bodyweight instead of a mass', () => {
        expect(prescriptionSummary(prescription({ load: { kind: 'bodyweight' } }))).toBe('8 reps @ bodyweight');
    });

    it('shows added weight on a weighted bodyweight set', () => {
        const weighted = prescription({
            load: { kind: 'bodyweightExternal', weight: { value: 10, unit: 'kg' } },
        });

        expect(prescriptionSummary(weighted)).toBe('8 reps @ bodyweight + 10kg');
    });

    it('omits the load when the set carries none', () => {
        expect(prescriptionSummary(prescription({ load: { kind: 'none' } }))).toBe('8 reps');
    });

    it('describes a hold in seconds', () => {
        const hold = prescription({ measurement: { measurement: 'duration', countBasis: 'total', seconds: 45 } });

        expect(prescriptionSummary(hold)).toBe('45s @ 40kg');
    });

    it('summarises the defaults an exercise offers', () => {
        expect(prescriptionSummary(defaultPrescription(pullUp))).toMatch(/reps/);
        expect(prescriptionSummary(defaultPrescription(airSquat))).toMatch(/reps/);
    });
});
