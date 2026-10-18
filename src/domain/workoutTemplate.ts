import { type } from 'arktype';
import { exerciseDefinition } from './exercise.ts';
import { exerciseId, plannedSetId, sequenceEntryId, workoutTemplateId } from './ids.ts';
import { setPrescription } from './prescription.ts';

/**
 * A single prescribed set. It references an exercise by ID and carries its own
 * prescription, so different sets of the same exercise may target different
 * reps and loads.
 */
const plannedSet = type({
    id: plannedSetId,
    exerciseId,
    prescription: setPrescription,
});
type PlannedSet = typeof plannedSet.infer;

/**
 * One occurrence of a planned set in the execution order. Entries are separate
 * from sets so a workout can interleave sets from different exercises in any
 * order. A given `plannedSetId` may appear at most once in a sequence: the
 * sequence lists what to do, and repetitions of work are modelled as distinct
 * planned sets. This keeps each occurrence's performance independently
 * addressable without inventing an occurrence counter.
 */
const sequenceEntry = type({
    id: sequenceEntryId,
    plannedSetId,
});
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
    sets: plannedSet.array(),
    sequence: sequenceEntry.array(),
});
type WorkoutTemplate = typeof workoutTemplate.infer;

export { plannedSet, sequenceEntry, workoutTemplate };
export type { PlannedSet, SequenceEntry, WorkoutTemplate };
