import { type } from 'arktype';
import { exerciseDefinition } from './exercise.ts';
import { exerciseId, plannedSetId, sequenceEntryId, workoutTemplateId } from './ids.ts';
import { setPrescription } from './prescription.ts';
import { trackingTiming } from './trackingTiming.ts';

/**
 * A single prescribed set. It references an exercise by ID and carries its own
 * prescription, so different sets of the same exercise may target different
 * reps and loads.
 */
const plannedSet = type({
    id: plannedSetId,
    exerciseId,
    prescription: setPrescription,
    'timing?': trackingTiming,
}).onDeepUndeclaredKey('reject');
type PlannedSet = typeof plannedSet.infer;

/**
 * One ordered step: either a planned-set reference or an explicit rest duration. Entries are separate
 * from sets so a workout can interleave sets from different exercises in any
 * order. A given `plannedSetId` may appear at most once in a sequence: the
 * sequence lists what to do, and repetitions of work are modelled as distinct
 * planned sets. This keeps each occurrence's performance independently
 * addressable without inventing an occurrence counter.
 */
const sequenceEntry = type({
    id: sequenceEntryId,
    'plannedSetId?': plannedSetId,
    'restSeconds?': 'number.integer > 0 & number <= 9999',
})
    .onUndeclaredKey('reject')
    .narrow(
        (entry, ctx) =>
            (entry.plannedSetId !== undefined) !== (entry.restSeconds !== undefined) ||
            ctx.mustBe('exactly one set reference or rest duration')
    );
type SequenceEntry = typeof sequenceEntry.infer;

/**
 * An editable workout plan. Exercise definitions are embedded so prescriptions
 * can be interpreted without a separate catalog lookup, and the execution
 * sequence references planned sets by ID rather than nesting them.
 */
const workoutTemplate = type({
    id: workoutTemplateId,
    name: 'string > 0',
    'description?': 'string',
    schemaVersion: '1',
    exercises: exerciseDefinition.array(),
    // Read compatibility only; validation converts this older field to sparse set timing.
    'timingOverrides?': type({ '[string]': trackingTiming }),
    sets: plannedSet.array(),
    sequence: sequenceEntry.array(),
}).onDeepUndeclaredKey('reject');
type WorkoutTemplate = typeof workoutTemplate.infer;

export type { PlannedSet, SequenceEntry, WorkoutTemplate };
export { plannedSet, sequenceEntry, workoutTemplate };
