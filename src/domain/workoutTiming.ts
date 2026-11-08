import type { ExerciseDefinition } from './exercise.ts';
import { normalizeSetTiming } from './trackingTiming.ts';
import type { WorkoutTemplate } from './workoutTemplate.ts';

/** Read old shared overrides into sparse per-set settings without mutating stored input. */
function normalizeWorkoutTiming(template: WorkoutTemplate): WorkoutTemplate {
    const copy = structuredClone(template);
    for (const set of copy.sets) {
        const defaults = copy.exercises.find((exercise) => exercise.id === set.exerciseId)?.timing;
        const timing = normalizeSetTiming(defaults, set.timing ?? copy.timingOverrides?.[set.exerciseId]);
        if (timing) {
            set.timing = timing;
        } else {
            delete set.timing;
        }
    }
    delete copy.timingOverrides;
    return copy;
}

/** History preserves planned work and performance, but not execution-only preparation or pace. */
function withoutExecutionTiming(template: WorkoutTemplate): WorkoutTemplate {
    const copy = normalizeWorkoutTiming(template);
    for (const exercise of copy.exercises) {
        delete exercise.timing;
    }
    for (const set of copy.sets) {
        delete set.timing;
    }
    return copy;
}

/** Refresh only execution settings from the current plan/catalog when starting or reopening work. */
function withExecutionTiming(
    snapshot: WorkoutTemplate,
    source: WorkoutTemplate | undefined,
    catalog: readonly ExerciseDefinition[]
): WorkoutTemplate {
    const copy = normalizeWorkoutTiming(snapshot);
    const plan = source ? normalizeWorkoutTiming(source) : undefined;
    for (const exercise of copy.exercises) {
        const definition =
            catalog.find((candidate) => candidate.id === exercise.id) ??
            plan?.exercises.find((candidate) => candidate.id === exercise.id);
        if (!definition) {
            continue;
        }
        if (definition.timing) {
            exercise.timing = structuredClone(definition.timing);
        } else {
            delete exercise.timing;
        }
    }
    for (const set of copy.sets) {
        const planned = plan?.sets.find((candidate) => candidate.id === set.id);
        if (!planned) {
            continue;
        }
        if (planned.timing) {
            set.timing = structuredClone(planned.timing);
        } else {
            delete set.timing;
        }
    }
    return normalizeWorkoutTiming(copy);
}

export { normalizeWorkoutTiming, withExecutionTiming, withoutExecutionTiming };
