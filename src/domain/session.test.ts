import { describe, expect, it } from 'vitest';
import { plank, pullUp, rowTemplate, setPrescription, useOnlyExercise } from '../test/domainFixtures.ts';
import type { BodyweightMeasurement } from './bodyweight.ts';
import { createSessionFromTemplate, totalLoad, type WorkoutSession } from './session.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';

const bodyweight: BodyweightMeasurement = { id: 'bw-1', measuredAt: 1_000, value: 80, unit: 'kg' };

function pathsOf(input: unknown): string[] {
    const result = validateWorkoutSession(input);

    if (result.ok) {
        throw new Error('expected validation to fail');
    }
    return result.errors.map((issue) => issue.path);
}

function rowResult(sequenceEntryId: string, reps: number, kg: number, completedAt = 2_000): unknown {
    return {
        sequenceEntryId,
        measurement: { measurement: 'repetitions', countBasis: 'total', reps },
        load: { kind: 'external', basis: 'total', weight: { value: kg, unit: 'kg' } },
        completedAt,
    };
}

describe('createSessionFromTemplate', () => {
    it('snapshots the plan independently of later template edits', () => {
        const template = rowTemplate();
        const session = createSessionFromTemplate({ id: 'sess-1', template, startedAt: 1_000 });

        template.name = 'Renamed';
        template.sets[0].prescription.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 99 };
        template.sequence.pop();

        expect(session.snapshot.name).toBe('Row day');
        expect(session.snapshot.sets[0].prescription.measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 8,
        });
        expect(session.snapshot.sequence).toHaveLength(2);
    });

    it('records the source template id and start time', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });

        expect(session.templateId).toBe('tmpl-rows');
        expect(session.startedAt).toBe(1_000);
        expect(session.results).toEqual([]);
    });

    it('copies the bodyweight measurement by value, keeping its source id', () => {
        const session = createSessionFromTemplate({
            id: 'sess-1',
            template: rowTemplate(),
            startedAt: 1_000,
            bodyweight,
        });

        expect(session.bodyweight).toEqual({
            value: 80,
            unit: 'kg',
            source: {
                measurementId: 'bw-1',
                measuredAt: 1_000,
            },
        });

        // Mutating the source measurement must not change the session.
        bodyweight.value = 90;
        expect(session.bodyweight?.value).toBe(80);
    });

    it('omits bodyweight when none is supplied', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });

        expect(session.bodyweight).toBeUndefined();
    });
});

describe('totalLoad', () => {
    it('sums bodyweight and total external load in the same unit', () => {
        expect(
            totalLoad(
                { kind: 'bodyweightExternal', basis: 'total', weight: { value: 10, unit: 'kg' } },
                { value: 80, unit: 'kg' }
            )
        ).toEqual({
            value: 90,
            unit: 'kg',
        });
    });

    it('returns the total external load on its own', () => {
        expect(totalLoad({ kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } }, undefined)).toEqual({
            value: 40,
            unit: 'kg',
        });
    });

    it('returns the bodyweight for a bodyweight-only load', () => {
        expect(totalLoad({ kind: 'bodyweight' }, { value: 80, unit: 'kg' })).toEqual({ value: 80, unit: 'kg' });
    });

    it('returns undefined for per-hand or per-side load', () => {
        expect(
            totalLoad({ kind: 'external', basis: 'perSide', weight: { value: 20, unit: 'kg' } }, undefined)
        ).toBeUndefined();
        expect(
            totalLoad(
                { kind: 'bodyweightExternal', basis: 'perSide', weight: { value: 20, unit: 'kg' } },
                { value: 80, unit: 'kg' }
            )
        ).toBeUndefined();
    });

    it('returns undefined on a unit mismatch rather than converting', () => {
        expect(
            totalLoad(
                { kind: 'bodyweightExternal', basis: 'total', weight: { value: 20, unit: 'lb' } },
                { value: 80, unit: 'kg' }
            )
        ).toBeUndefined();
    });

    it('returns undefined for no load', () => {
        expect(totalLoad({ kind: 'none' }, { value: 80, unit: 'kg' })).toBeUndefined();
    });
});

describe('validateWorkoutSession', () => {
    function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
        return {
            ...createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 }),
            ...overrides,
        };
    }

    it('accepts a session with results for each occurrence', () => {
        const withResults = session({
            results: [rowResult('entry-1', 8, 40), rowResult('entry-2', 6, 45)] as WorkoutSession['results'],
        });

        expect(validateWorkoutSession(withResults).ok).toBe(true);
    });

    it('accepts actual values that differ from prescribed targets', () => {
        const withResults = session({
            results: [rowResult('entry-1', 7, 42), rowResult('entry-2', 5, 47)] as WorkoutSession['results'],
        });

        expect(validateWorkoutSession(withResults).ok).toBe(true);
    });

    it('accepts a partially completed session with fewer results', () => {
        const partial = session({ results: [rowResult('entry-1', 8, 40)] as WorkoutSession['results'] });

        expect(validateWorkoutSession(partial).ok).toBe(true);
    });

    it('accepts a session with no results yet', () => {
        expect(validateWorkoutSession(session()).ok).toBe(true);
    });

    it('rejects a result referencing an unknown sequence occurrence', () => {
        const bad = session({ results: [rowResult('entry-9', 8, 40)] as WorkoutSession['results'] });

        expect(pathsOf(bad)).toEqual(['results[0].sequenceEntryId']);
    });

    it('rejects two results for the same occurrence', () => {
        const bad = session({
            results: [rowResult('entry-1', 8, 40), rowResult('entry-1', 8, 40)] as WorkoutSession['results'],
        });

        expect(pathsOf(bad)).toEqual(['results[1].sequenceEntryId']);
    });

    it('rejects a result whose measurement the exercise does not allow', () => {
        const bad = session({
            results: [
                {
                    sequenceEntryId: 'entry-1',
                    measurement: { measurement: 'duration', countBasis: 'total', seconds: 30 },
                    load: { kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } },
                    completedAt: 2_000,
                },
            ] as WorkoutSession['results'],
        });

        expect(pathsOf(bad)).toEqual(['results[0].measurement']);
    });

    it('rejects a result whose measurement type differs from its prescription', () => {
        const bad = session();
        bad.snapshot.exercises[0].measurements.push({ measurement: 'duration', countBasis: 'total' });
        bad.results = [
            {
                sequenceEntryId: 'entry-1',
                measurement: { measurement: 'duration', countBasis: 'total', seconds: 30 },
                load: { kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } },
                completedAt: 2_000,
            },
        ];

        expect(pathsOf(bad)).toEqual(['results[0].measurement']);
    });

    it('rejects a result whose count basis differs from its prescription', () => {
        const bad = session();
        bad.snapshot.exercises[0].measurements.push({ measurement: 'repetitions', countBasis: 'perSide' });
        bad.results = [
            {
                sequenceEntryId: 'entry-1',
                measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 8, right: 8 } },
                load: { kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } },
                completedAt: 2_000,
            },
        ];

        expect(pathsOf(bad)).toEqual(['results[0].measurement']);
    });

    it('rejects a result whose load basis differs from its prescription', () => {
        const bad = session({
            results: [
                {
                    sequenceEntryId: 'entry-1',
                    measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
                    load: { kind: 'external', basis: 'perSide', weight: { value: 20, unit: 'kg' } },
                    completedAt: 2_000,
                },
            ],
        });

        expect(pathsOf(bad)).toEqual(['results[0].load']);
    });

    it('rejects a result whose load kind differs from its prescription', () => {
        const template = rowTemplate();
        useOnlyExercise(template, pullUp);
        for (const set of template.sets) {
            setPrescription(template, set.id, {
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            });
        }
        const bad = createSessionFromTemplate({ id: 'sess-1', template, startedAt: 1_000 });
        bad.results = [
            {
                sequenceEntryId: 'entry-1',
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
                load: {
                    kind: 'bodyweightExternal',
                    basis: 'total',
                    weight: { value: 10, unit: 'kg' },
                },
                completedAt: 2_000,
            },
        ];

        expect(pathsOf(bad)).toEqual(['results[0].load']);
    });

    it('rejects a result whose load the exercise does not allow', () => {
        const template = rowTemplate();
        useOnlyExercise(template, pullUp);
        for (const set of template.sets) {
            setPrescription(template, set.id, {
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            });
        }
        const bad = {
            ...createSessionFromTemplate({ id: 'sess-1', template, startedAt: 1_000 }),
            results: [
                {
                    sequenceEntryId: 'entry-1',
                    measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
                    load: { kind: 'external', basis: 'perSide', weight: { value: 10, unit: 'kg' } },
                    completedAt: 2_000,
                },
            ],
        };

        expect(pathsOf(bad)).toEqual(['results[0].load']);
    });

    it('rejects a completion time before the start time', () => {
        const bad = session({ completedAt: 500 });

        expect(pathsOf(bad)).toEqual(['completedAt']);
    });

    it('rejects a result completed before the session starts', () => {
        const bad = session({
            results: [rowResult('entry-1', 8, 40, 500)] as WorkoutSession['results'],
        });

        expect(pathsOf(bad)).toEqual(['results[0].completedAt']);
    });

    it('rejects a result completed after the session ends', () => {
        const bad = session({
            completedAt: 1_500,
            results: [rowResult('entry-1', 8, 40, 2_000)] as WorkoutSession['results'],
        });

        expect(pathsOf(bad)).toEqual(['results[0].completedAt']);
    });

    it('accepts result timestamps on the session boundaries', () => {
        const onBoundaries = session({
            completedAt: 2_000,
            results: [
                rowResult('entry-1', 8, 40, 1_000),
                rowResult('entry-2', 6, 45, 2_000),
            ] as WorkoutSession['results'],
        });

        expect(validateWorkoutSession(onBoundaries).ok).toBe(true);
    });

    it('rejects an invalid plan snapshot', () => {
        const bad = session();
        bad.snapshot.sets[0].exerciseId = 'ex-missing';

        expect(pathsOf(bad)).toEqual(['snapshot.sets[0].exerciseId']);
    });

    it('rejects a source template id that differs from the snapshot', () => {
        const bad = session({ templateId: 'tmpl-other' });

        expect(pathsOf(bad)).toEqual(['templateId']);
    });

    it('rejects a non-positive bodyweight snapshot value', () => {
        const bad = session({ bodyweight: { value: 0, unit: 'kg' } });

        expect(pathsOf(bad)).toContain('bodyweight.value');
    });

    it('requires bodyweight source id and timestamp together', () => {
        const withIdOnly = session({
            bodyweight: { value: 80, unit: 'kg', source: { measurementId: 'bw-1' } },
        });
        const withTimestampOnly = session({
            bodyweight: { value: 80, unit: 'kg', source: { measuredAt: 1_000 } },
        });

        expect(validateWorkoutSession(withIdOnly).ok).toBe(false);
        expect(validateWorkoutSession(withTimestampOnly).ok).toBe(false);
    });

    it('rejects a non-finite bodyweight snapshot value', () => {
        for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            const bad = session({ bodyweight: { value, unit: 'kg' } });

            expect(pathsOf(bad)).toContain('bodyweight.value');
        }
    });

    it('rejects unknown fields anywhere in the document', () => {
        const atTopLevel = { ...session(), source: 'import' };
        const nested = session({
            results: [{ ...rowResult('entry-1', 8, 40), perceivedEffort: 8 }] as WorkoutSession['results'],
        });

        expect(validateWorkoutSession(atTopLevel).ok).toBe(false);
        expect(validateWorkoutSession(nested).ok).toBe(false);
    });

    it('survives a JSON round-trip and re-validates', () => {
        const original = session({ results: [rowResult('entry-1', 8, 40)] as WorkoutSession['results'] });
        const serialized = JSON.parse(JSON.stringify(original));

        const result = validateWorkoutSession(serialized);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toEqual(original);
        }
    });

    it('keeps an unloaded bodyweight exercise valid end to end', () => {
        const template = rowTemplate();
        template.exercises = [structuredClone(plank)];
        template.sets = [
            {
                id: 'set-1',
                exerciseId: 'ex-plank',
                prescription: {
                    measurement: { measurement: 'duration', countBasis: 'total', seconds: 60 },
                    executionMode: 'bilateral',
                    load: { kind: 'bodyweight' },
                },
            },
        ];
        template.sequence = [{ id: 'entry-1', plannedSetId: 'set-1' }];

        const created = createSessionFromTemplate({ id: 'sess-2', template, startedAt: 1_000, bodyweight });
        const result = validateWorkoutSession(created);

        expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
    });
});
