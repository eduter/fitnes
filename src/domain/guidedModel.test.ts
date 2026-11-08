import { describe, expect, it } from 'vitest';
import { rowTemplate } from '../test/domainFixtures.ts';
import { createWorkoutTemplate, refreshTemplateExercises } from './createWorkoutTemplate.ts';
import { EXPORT_SCHEMA_VERSION, parseDataExport } from './dataExport.ts';
import { duplicateWorkoutTemplate } from './duplicateWorkoutTemplate.ts';
import { recordRest } from './recordSession.ts';
import { createSessionFromTemplate } from './session.ts';
import { effectiveTiming } from './trackingTiming.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';
import { validateWorkoutTemplate } from './validateWorkoutTemplate.ts';

describe('persistent guided workouts', () => {
    it('keeps old plans valid and resolves independent timing overrides including zero prep', () => {
        const plan = rowTemplate();
        expect(validateWorkoutTemplate(plan).ok).toBe(true);
        plan.exercises[0].timing = { prepSeconds: 12, secondsPerRep: 4 };
        plan.timingOverrides = { [plan.exercises[0].id]: { prepSeconds: 0 } };
        expect(effectiveTiming(plan.exercises[0].timing, plan.timingOverrides[plan.exercises[0].id])).toEqual({
            prepSeconds: 0,
            secondsPerRep: 4,
        });
        const built = createWorkoutTemplate({ ...plan, catalog: plan.exercises });
        expect(built.ok && built.value.timingOverrides).toEqual(plan.timingOverrides);
        const refreshed = refreshTemplateExercises(plan, plan.exercises);
        expect(refreshed.ok && refreshed.value.timingOverrides).toEqual(plan.timingOverrides);
    });
    it('preserves interleaved rests in duplicates and independent session snapshots', () => {
        const plan = rowTemplate();
        plan.sequence.splice(1, 0, { id: 'rest-1', restSeconds: 90 } as (typeof plan.sequence)[number]);
        expect(validateWorkoutTemplate(plan).ok).toBe(true);
        const copy = duplicateWorkoutTemplate(plan);
        expect(copy.sequence[1].restSeconds).toBe(90);
        expect(copy.sequence[1].id).not.toBe(plan.sequence[1].id);
        const session = createSessionFromTemplate({ id: 'session' as never, template: plan, startedAt: 1 });
        plan.sequence[1].restSeconds = 120;
        expect(session.snapshot.sequence[1].restSeconds).toBe(90);
        const saved = recordRest(session, session.snapshot.sequence[1].id);
        expect(saved.ok && saved.value.completedRestIds).toEqual([session.snapshot.sequence[1].id]);
        expect(validateWorkoutSession({ ...session, completedRestIds: [session.snapshot.sequence[0].id] }).ok).toBe(
            false
        );
        expect(
            validateWorkoutSession({
                ...session,
                completedRestIds: [session.snapshot.sequence[1].id, session.snapshot.sequence[1].id],
            }).ok
        ).toBe(false);
    });
    it('round-trips timing, explicit rest and recorded rest completion through the new export version', () => {
        const plan = rowTemplate();
        plan.exercises[0].timing = { prepSeconds: 9, secondsPerRep: 2 };
        plan.timingOverrides = { [plan.exercises[0].id]: { prepSeconds: 0 } };
        plan.sequence.push({ id: 'rest-export', restSeconds: 30 } as (typeof plan.sequence)[number]);
        const session = createSessionFromTemplate({ id: 'export-session' as never, template: plan, startedAt: 1 });
        session.completedRestIds = [plan.sequence[2].id];
        const parsed = parseDataExport(
            JSON.stringify({
                schemaVersion: EXPORT_SCHEMA_VERSION,
                exercises: plan.exercises,
                templates: [plan],
                sessions: [session],
                bodyweightMeasurements: [],
            })
        );
        expect(parsed.ok && parsed.value.templates[0].timingOverrides).toEqual(plan.timingOverrides);
        expect(parsed.ok && parsed.value.sessions[0].completedRestIds).toEqual(session.completedRestIds);
        expect(parsed.ok && parsed.value.sessions[0].snapshot.sequence[2].restSeconds).toBe(30);
    });
    it('rejects ambiguous or invalid rest steps and bad timing configuration', () => {
        const plan = rowTemplate();
        plan.sequence[0] = { ...plan.sequence[0], restSeconds: 10 };
        expect(validateWorkoutTemplate(plan).ok).toBe(false);
        plan.sequence[0] = { id: plan.sequence[0].id, restSeconds: 0 };
        expect(validateWorkoutTemplate(plan).ok).toBe(false);
        const invalid = rowTemplate();
        invalid.exercises[0].timing = { secondsPerRep: 0 };
        expect(validateWorkoutTemplate(invalid).ok).toBe(false);
        invalid.exercises[0].timing = { prepSeconds: 0 };
        invalid.timingOverrides = { unknown: { prepSeconds: 1 } };
        expect(validateWorkoutTemplate(invalid).ok).toBe(false);
    });
});
