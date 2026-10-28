import { describe, expect, it } from 'vitest';
import { duplicateWorkoutTemplate } from './duplicateWorkoutTemplate.ts';
import { rowTemplate } from '../test/domainFixtures.ts';
import { validateWorkoutTemplate } from './validateWorkoutTemplate.ts';

describe('duplicateWorkoutTemplate', () => {
    it('produces a valid template with a fresh id and suffixed name', () => {
        const source = rowTemplate();
        const copy = duplicateWorkoutTemplate(source);

        expect(copy.id).not.toBe(source.id);
        expect(copy.name).toBe('Row day (copy)');
        expect(validateWorkoutTemplate(copy).ok).toBe(true);
    });

    it('gives every planned set and sequence entry a new id', () => {
        const source = rowTemplate();
        const copy = duplicateWorkoutTemplate(source);

        expect(copy.sets).toHaveLength(source.sets.length);
        expect(copy.sequence).toHaveLength(source.sequence.length);

        for (const set of copy.sets) {
            expect(source.sets.some((candidate) => candidate.id === set.id)).toBe(false);
        }
        for (const entry of copy.sequence) {
            expect(source.sequence.some((candidate) => candidate.id === entry.id)).toBe(false);
        }
    });

    it('remaps each sequence entry to the matching copy of its planned set', () => {
        const source = rowTemplate();
        const copy = duplicateWorkoutTemplate(source);

        for (const [index, entry] of copy.sequence.entries()) {
            const original = source.sequence[index]!;
            const originalSet = source.sets.find((candidate) => candidate.id === original.plannedSetId)!;
            const copiedSet = copy.sets.find((candidate) => candidate.id === entry.plannedSetId)!;

            expect(copiedSet.exerciseId).toBe(originalSet.exerciseId);
            expect(copiedSet.prescription).toEqual(originalSet.prescription);
        }
    });

    it('leaves the source untouched and independent of the copy', () => {
        const source = rowTemplate();
        const snapshot = structuredClone(source);
        const copy = duplicateWorkoutTemplate(source);

        copy.name = 'Renamed';
        copy.sets[0]!.prescription.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 99 };
        copy.exercises[0]!.name = 'Renamed exercise';

        expect(source).toEqual(snapshot);
    });

    it('deep-copies planned sets rather than sharing them', () => {
        const source = rowTemplate();
        const copy = duplicateWorkoutTemplate(source);

        expect(copy.sets[0]!.prescription).not.toBe(source.sets[0]!.prescription);
        expect(copy.sets[0]!.prescription).toEqual(source.sets[0]!.prescription);
        expect(copy.exercises[0]).not.toBe(source.exercises[0]);
    });

    it('keeps the embedded exercise snapshots', () => {
        const source = rowTemplate();
        const copy = duplicateWorkoutTemplate(source);

        expect(copy.exercises).toEqual(source.exercises);
        expect(copy.schemaVersion).toBe(source.schemaVersion);
    });
});
