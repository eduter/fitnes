import { describe, expect, it } from 'vitest';
import {
    dumbbellCurl,
    halfCrimpHold,
    plank,
    rowTemplate,
    setPrescription,
    useOnlyExercise,
} from '../test/domainFixtures.ts';
import { createSessionFromTemplate, type WorkoutSession } from './session.ts';
import {
    clearResult,
    completeSession,
    draftResultFromPrescription,
    recordResult,
    reopenSession,
} from './recordSession.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';

describe('draftResultFromPrescription', () => {
    it('copies the occurrence prescription so a logged set starts as prescribed', () => {
        const template = rowTemplate();
        const prescription = template.sets[0].prescription;
        const result = draftResultFromPrescription('entry-1', prescription, 2_000);

        expect(result).toEqual({
            sequenceEntryId: 'entry-1',
            measurement: prescription.measurement,
            load: prescription.load,
            completedAt: 2_000,
        });

        prescription.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 99 };
        expect(result.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 8 });
    });

    it('splits a per-side target into a side per side, so a logged set starts symmetric', () => {
        const template = rowTemplate();
        useOnlyExercise(template, dumbbellCurl);
        const prescription = {
            measurement: { measurement: 'repetitions', countBasis: 'perSide', reps: 10 },
            executionMode: 'unilateral',
            load: { kind: 'external', basis: 'perSide', weight: { value: 10, unit: 'kg' } },
        } as const;

        const result = draftResultFromPrescription('entry-1', prescription, 2_000);

        expect(result.measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 10, right: 10 },
        });
    });

    it('splits a per-side duration target into a side per side', () => {
        const prescription = {
            measurement: { measurement: 'duration', countBasis: 'perSide', seconds: 30 },
            executionMode: 'unilateral',
            load: { kind: 'bodyweight' },
        } as const;

        const result = draftResultFromPrescription('entry-1', prescription, 2_000);

        expect(result.measurement).toEqual({
            measurement: 'duration',
            countBasis: 'perSide',
            sides: { left: 30, right: 30 },
        });
    });
});

describe('per-side actuals', () => {
    /** A one-set dumbbell curl session, whose per-side target becomes a per-side actual. */
    function curlSession(): WorkoutSession {
        const template = rowTemplate();
        useOnlyExercise(template, dumbbellCurl);
        setPrescription(template, 'set-1', {
            measurement: { measurement: 'repetitions', countBasis: 'perSide', reps: 10 },
            executionMode: 'unilateral',
            load: { kind: 'external', basis: 'perSide', weight: { value: 10, unit: 'kg' } },
        });
        template.sets = [template.sets[0]];
        template.sequence = [{ id: 'entry-1', plannedSetId: 'set-1' }];
        return createSessionFromTemplate({ id: 'sess-1', template, startedAt: 1_000 });
    }

    it('records an unequal number of repetitions for each side', () => {
        const session = curlSession();
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.measurement = { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9 } };

        const recorded = recordResult(session, drafted);

        expect(recorded.ok).toBe(true);
        if (!recorded.ok) {
            return;
        }
        expect(recorded.value.results[0].measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 10, right: 9 },
        });
    });

    it('records a set skipped on both sides as zero, against a positive plan', () => {
        const session = curlSession();
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.measurement = { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 0, right: 0 } };

        const recorded = recordResult(session, drafted);

        expect(recorded.ok).toBe(true);
        if (!recorded.ok) {
            return;
        }
        expect(recorded.value.results[0].measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 0, right: 0 },
        });
    });

    it('records a set skipped on one side, keeping the side that was performed', () => {
        const session = curlSession();
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.measurement = { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 0, right: 10 } };

        const recorded = recordResult(session, drafted);

        expect(recorded.ok).toBe(true);
        if (!recorded.ok) {
            return;
        }
        expect(recorded.value.results[0].measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 0, right: 10 },
        });
    });
});

describe('skipped sets', () => {
    it('records a skipped bilateral set as zero against a positive plan', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 0 };

        const recorded = recordResult(session, drafted);

        expect(recorded.ok).toBe(true);
        if (!recorded.ok) {
            return;
        }
        expect(recorded.value.results[0].measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 0,
        });
    });

    it('records a skipped hold as zero seconds', () => {
        const template = rowTemplate();
        useOnlyExercise(template, halfCrimpHold);
        template.sets = [template.sets[0]];
        template.sequence = [{ id: 'entry-1', plannedSetId: 'set-1' }];
        setPrescription(template, 'set-1', {
            measurement: { measurement: 'duration', countBasis: 'perSide', seconds: 30 },
            executionMode: 'unilateral',
            load: { kind: 'external', basis: 'perSide', weight: { value: 20, unit: 'kg' } },
        });
        const session = createSessionFromTemplate({ id: 'sess-1', template, startedAt: 1_000 });
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.measurement = { measurement: 'duration', countBasis: 'perSide', sides: { left: 0, right: 0 } };

        const recorded = recordResult(session, drafted);

        expect(recorded.ok).toBe(true);
    });
});

describe('recordResult', () => {
    it('appends a valid result without mutating the original session', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 7 };

        const recorded = recordResult(session, drafted);

        expect(session.results).toEqual([]);
        expect(recorded.ok).toBe(true);
        if (!recorded.ok) {
            return;
        }
        expect(recorded.value.results).toHaveLength(1);
        expect(recorded.value.results[0].measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 7,
        });
        expect(validateWorkoutSession(recorded.value).ok).toBe(true);
    });

    it('replaces an existing result for the same occurrence', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });
        const first = recordResult(
            session,
            draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000)
        );
        expect(first.ok).toBe(true);
        if (!first.ok) {
            return;
        }

        const replacement = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 3_000);
        replacement.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 5 };
        const updated = recordResult(first.value, replacement);

        expect(updated.ok).toBe(true);
        if (!updated.ok) {
            return;
        }
        expect(updated.value.results).toHaveLength(1);
        expect(updated.value.results[0].measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 5,
        });
        expect(updated.value.results[0].completedAt).toBe(3_000);
    });

    it('rejects a result that changes the prescription meaning', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });
        const drafted = draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000);
        drafted.load = { kind: 'external', basis: 'perSide', weight: { value: 20, unit: 'kg' } };

        const recorded = recordResult(session, drafted);

        expect(recorded.ok).toBe(false);
        if (recorded.ok) {
            return;
        }
        expect(recorded.errors.map((issue) => issue.path)).toContain('results[0].load');
    });
});

describe('clearResult', () => {
    it('removes the result for one occurrence', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });
        const withResult = recordResult(
            session,
            draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000)
        );
        expect(withResult.ok).toBe(true);
        if (!withResult.ok) {
            return;
        }

        const cleared = clearResult(withResult.value, 'entry-1');

        expect(cleared.ok).toBe(true);
        if (!cleared.ok) {
            return;
        }
        expect(cleared.value.results).toEqual([]);
    });
});

describe('completeSession and reopenSession', () => {
    it('completes a session and can reopen it', () => {
        const template = rowTemplate();
        useOnlyExercise(template, plank);
        for (const set of template.sets) {
            setPrescription(template, set.id, {
                measurement: { measurement: 'duration', countBasis: 'total', seconds: 45 },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            });
        }
        template.sets = [template.sets[0]];
        template.sequence = [{ id: 'entry-1', plannedSetId: template.sets[0].id }];

        const session = createSessionFromTemplate({
            id: 'sess-1',
            template,
            startedAt: 1_000,
            bodyweight: { id: 'bw-1', measuredAt: 1_000, value: 80, unit: 'kg' },
        });
        const withResult = recordResult(
            session,
            draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000)
        );
        expect(withResult.ok).toBe(true);
        if (!withResult.ok) {
            return;
        }

        const completed = completeSession(withResult.value, 3_000);
        expect(completed.ok).toBe(true);
        if (!completed.ok) {
            return;
        }
        expect(completed.value.completedAt).toBe(3_000);

        const reopened = reopenSession(completed.value);
        expect(reopened.ok).toBe(true);
        if (!reopened.ok) {
            return;
        }
        expect(reopened.value.completedAt).toBeUndefined();
        expect(reopened.value.results).toHaveLength(1);
    });

    it('rejects completing before a result timestamp', () => {
        const session = createSessionFromTemplate({ id: 'sess-1', template: rowTemplate(), startedAt: 1_000 });
        const withResult = recordResult(
            session,
            draftResultFromPrescription('entry-1', session.snapshot.sets[0].prescription, 2_000)
        );
        expect(withResult.ok).toBe(true);
        if (!withResult.ok) {
            return;
        }

        const completed = completeSession(withResult.value, 1_500);
        expect(completed.ok).toBe(false);
    });
});
