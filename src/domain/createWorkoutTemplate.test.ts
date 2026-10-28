import { describe, expect, it } from 'vitest';
import { bentOverRow, plank, pullUp, rowTemplate } from '../test/domainFixtures.ts';
import { createWorkoutTemplate, refreshTemplateExercises } from './createWorkoutTemplate.ts';
import type { ExerciseDefinition } from './exercise.ts';

describe('createWorkoutTemplate', () => {
    it('snapshots referenced catalog exercises and ignores unused ones', () => {
        const source = rowTemplate();
        const catalogRow: ExerciseDefinition = {
            ...structuredClone(bentOverRow),
            description: 'catalog row',
        };
        const result = createWorkoutTemplate({
            id: source.id,
            name: source.name,
            catalog: [catalogRow, structuredClone(plank)],
            sets: source.sets,
            sequence: source.sequence,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.value.exercises).toEqual([catalogRow]);
        expect(result.value.schemaVersion).toBe(1);

        catalogRow.name = 'Renamed in catalog';
        expect(result.value.exercises[0].name).toBe('Bent-over row');
    });

    it('keeps existing snapshots when the catalog later changes', () => {
        const source = rowTemplate();
        source.exercises[0] = { ...source.exercises[0], description: 'template copy' };

        const result = createWorkoutTemplate({
            id: source.id,
            name: source.name,
            catalog: [{ ...structuredClone(bentOverRow), description: 'newer catalog' }],
            sets: source.sets,
            sequence: source.sequence,
            existingSnapshots: source.exercises,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.value.exercises[0].description).toBe('template copy');
    });

    it('reports a planned set whose exercise is missing from the catalog', () => {
        const source = rowTemplate();
        const result = createWorkoutTemplate({
            id: source.id,
            name: source.name,
            catalog: [structuredClone(plank)],
            sets: source.sets,
            sequence: source.sequence,
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.errors.map((issue) => issue.path)).toContain('sets[0].exerciseId');
    });

    it('omits an empty description so the document stays strict', () => {
        const source = rowTemplate();
        const result = createWorkoutTemplate({
            id: source.id,
            name: source.name,
            description: '',
            catalog: source.exercises,
            sets: source.sets,
            sequence: source.sequence,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.value).not.toHaveProperty('description');
    });
});

describe('refreshTemplateExercises', () => {
    it('replaces embedded definitions with the current catalog copies', () => {
        const template = rowTemplate();
        template.exercises[0] = { ...template.exercises[0], description: 'stale' };

        const result = refreshTemplateExercises(template, [
            { ...structuredClone(bentOverRow), description: 'fresh' },
            structuredClone(pullUp),
        ]);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.value.exercises).toEqual([{ ...bentOverRow, description: 'fresh' }]);
        expect(result.value.sets).toEqual(template.sets);
    });
});
