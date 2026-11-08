import { describe, expect, it } from 'vitest';
import { rowTemplate } from '../test/domainFixtures.ts';
import { completeSession, draftResultFromPrescription, recordResult } from './recordSession.ts';
import { createSessionFromTemplate } from './session.ts';
import { normalizeSetTiming } from './trackingTiming.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';
import { validateWorkoutTemplate } from './validateWorkoutTemplate.ts';

describe('execution-only set timing', () => {
    it('stores only edited fields that differ from the exercise default', () => {
        expect(
            normalizeSetTiming({ prepSeconds: 8, secondsPerRep: 2 }, { prepSeconds: 8, secondsPerRep: 2 })
        ).toBeUndefined();
        expect(normalizeSetTiming({ prepSeconds: 8, secondsPerRep: 2 }, { prepSeconds: 0, secondsPerRep: 2 })).toEqual({
            prepSeconds: 0,
        });
        expect(normalizeSetTiming(undefined, { prepSeconds: 5, secondsPerRep: 4 })).toEqual({ secondsPerRep: 4 });
    });
    it('reads old exercise-wide overrides as independent set properties', () => {
        const plan = rowTemplate();
        plan.timingOverrides = { [plan.exercises[0].id]: { prepSeconds: 9 } };
        const parsed = validateWorkoutTemplate(plan);
        expect(parsed.ok && parsed.value.timingOverrides).toBeUndefined();
        expect(parsed.ok && parsed.value.sets.map((set) => set.timing)).toEqual([
            { prepSeconds: 9 },
            { prepSeconds: 9 },
        ]);
        expect(plan.sets[0].timing).toBeUndefined();
    });
    it('removes execution timing from completed history while preserving performance and the workout plan', () => {
        const plan = rowTemplate();
        plan.exercises[0].timing = { prepSeconds: 8, secondsPerRep: 2 };
        plan.sets[0].timing = { prepSeconds: 1 };
        const session = createSessionFromTemplate({ id: 'timing-history' as never, template: plan, startedAt: 1 });
        expect(session.snapshot.sets[0].timing).toEqual({ prepSeconds: 1 });
        const logged = recordResult(
            session,
            draftResultFromPrescription(session.snapshot.sequence[0].id, plan.sets[0].prescription, 2)
        );
        if (!logged.ok) {
            throw Error('test result rejected');
        }
        const completed = completeSession(logged.value, 3);
        expect(completed.ok && completed.value.results).toEqual(logged.value.results);
        expect(completed.ok && completed.value.snapshot.exercises[0].timing).toBeUndefined();
        expect(completed.ok && completed.value.snapshot.sets[0].timing).toBeUndefined();
        expect(plan.sets[0].timing).toEqual({ prepSeconds: 1 });
        const imported = validateWorkoutSession({ ...logged.value, completedAt: 3 });
        expect(imported.ok && imported.value.snapshot.sets[0].timing).toBeUndefined();
    });
});
