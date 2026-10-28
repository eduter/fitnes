import { type } from 'arktype';

/**
 * Stable string identifiers for domain entities. Branding keeps IDs from one
 * entity kind out of another's fields, while remaining plain strings on the
 * wire so records stay JSON-serializable.
 */
const exerciseId = type('string > 0').brand('ExerciseId');
type ExerciseId = typeof exerciseId.infer;

const plannedSetId = type('string > 0').brand('PlannedSetId');
type PlannedSetId = typeof plannedSetId.infer;

const sequenceEntryId = type('string > 0').brand('SequenceEntryId');
type SequenceEntryId = typeof sequenceEntryId.infer;

const workoutTemplateId = type('string > 0').brand('WorkoutTemplateId');
type WorkoutTemplateId = typeof workoutTemplateId.infer;

const workoutSessionId = type('string > 0').brand('WorkoutSessionId');
type WorkoutSessionId = typeof workoutSessionId.infer;

const bodyweightMeasurementId = type('string > 0').brand('BodyweightMeasurementId');
type BodyweightMeasurementId = typeof bodyweightMeasurementId.infer;

export { bodyweightMeasurementId, exerciseId, plannedSetId, sequenceEntryId, workoutSessionId, workoutTemplateId };
export type { BodyweightMeasurementId, ExerciseId, PlannedSetId, SequenceEntryId, WorkoutSessionId, WorkoutTemplateId };
