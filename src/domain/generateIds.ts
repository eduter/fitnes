import { generateId } from '../utils/id.ts';
import {
    bodyweightMeasurementId,
    exerciseId,
    plannedSetId,
    sequenceEntryId,
    workoutSessionId,
    workoutTemplateId,
    type BodyweightMeasurementId,
    type ExerciseId,
    type PlannedSetId,
    type SequenceEntryId,
    type WorkoutSessionId,
    type WorkoutTemplateId,
} from './ids.ts';

/** Generate a new catalog exercise id. */
function generateExerciseId(): ExerciseId {
    return exerciseId.assert(generateId());
}

/** Generate a new planned-set id. */
function generatePlannedSetId(): PlannedSetId {
    return plannedSetId.assert(generateId());
}

/** Generate a new sequence-entry id. */
function generateSequenceEntryId(): SequenceEntryId {
    return sequenceEntryId.assert(generateId());
}

/** Generate a new workout-template id. */
function generateWorkoutTemplateId(): WorkoutTemplateId {
    return workoutTemplateId.assert(generateId());
}

/** Generate a new workout-session id. */
function generateWorkoutSessionId(): WorkoutSessionId {
    return workoutSessionId.assert(generateId());
}

/** Generate a new bodyweight-measurement id. */
function generateBodyweightMeasurementId(): BodyweightMeasurementId {
    return bodyweightMeasurementId.assert(generateId());
}

export {
    generateBodyweightMeasurementId,
    generateExerciseId,
    generatePlannedSetId,
    generateSequenceEntryId,
    generateWorkoutSessionId,
    generateWorkoutTemplateId,
};
