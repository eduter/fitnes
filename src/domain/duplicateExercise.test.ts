import { describe, expect, it } from 'vitest';
import { pullUp } from './examples.ts';
import { duplicateExercise } from './duplicateExercise.ts';
import { validateExercise } from './validateExercise.ts';

describe('duplicateExercise', () => {
    it('produces a valid definition with a fresh id', () => {
        const copy = duplicateExercise(pullUp);

        expect(copy.id).not.toBe(pullUp.id);
        expect(validateExercise(copy).ok).toBe(true);
    });

    it('keeps every capability of the source', () => {
        const copy = duplicateExercise(pullUp);

        expect(copy.name).toBe('Pull-up (copy)');
        expect(copy.measurements).toEqual(pullUp.measurements);
        expect(copy.executionModes).toEqual(pullUp.executionModes);
        expect(copy.load).toEqual(pullUp.load);
    });

    it('copies nested capability arrays so later edits cannot reach the source', () => {
        const copy = duplicateExercise(pullUp);

        copy.measurements.push('duration');
        copy.executionModes = ['unilateral'];
        copy.load.kind = 'none';

        expect(pullUp.measurements).toEqual(['repetitions']);
        expect(pullUp.load.kind).toBe('bodyweightExternal');
        expect(pullUp.executionModes).toEqual(['bilateral']);
    });

    it('suffixes an already-suffixed name instead of stacking the same suffix', () => {
        const once = duplicateExercise(pullUp);
        const twice = duplicateExercise(once);

        expect(once.name).toBe('Pull-up (copy)');
        expect(twice.name).toBe('Pull-up (copy 2)');
    });

    it('carries the optional description across', () => {
        const described = { ...pullUp, description: 'Weighted or bodyweight' };
        const copy = duplicateExercise(described);

        expect(copy.description).toBe('Weighted or bodyweight');
    });
});
