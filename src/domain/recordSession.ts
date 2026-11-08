import type { SequenceEntryId } from './ids.ts';
import type { ActualMeasurement, SetPrescription } from './prescription.ts';
import type { ActualResult, WorkoutSession } from './session.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';
import type { ValidationResult } from './validation.ts';

/**
 * Copy a planned set's prescription into an actual result. Numeric values start
 * as prescribed so logging "as planned" is a no-edit save; callers may then
 * change counts or weights without changing measurement or load meaning. A
 * per-side target becomes a per-side actual with both sides at that target,
 * which the caller can then adjust independently.
 */
function draftResultFromPrescription(
    sequenceEntryId: SequenceEntryId,
    prescription: SetPrescription,
    completedAt: number
): ActualResult {
    return {
        sequenceEntryId,
        measurement: draftMeasurement(prescription.measurement),
        load: structuredClone(prescription.load),
        completedAt,
    };
}

/** Widen a prescribed target into the performed shape, splitting a per-side target across both sides. */
function draftMeasurement(prescribed: SetPrescription['measurement']): ActualMeasurement {
    if (prescribed.countBasis === 'total') {
        return structuredClone(prescribed);
    }

    if (prescribed.measurement === 'repetitions') {
        return {
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: prescribed.reps, right: prescribed.reps },
        };
    }

    return {
        measurement: 'duration',
        countBasis: 'perSide',
        sides: { left: prescribed.seconds, right: prescribed.seconds },
    };
}

/** Add or replace the result for one sequence occurrence. */
function recordResult(session: WorkoutSession, result: ActualResult): ValidationResult<WorkoutSession> {
    const next = structuredClone(session);
    const index = next.results.findIndex((candidate) => candidate.sequenceEntryId === result.sequenceEntryId);

    if (index === -1) {
        next.results.push(structuredClone(result));
    } else {
        next.results[index] = structuredClone(result);
    }

    return validateWorkoutSession(next);
}

/** Persist completion of an explicit rest without inventing an exercise performance. */
function recordRest(session: WorkoutSession, entryId: SequenceEntryId): ValidationResult<WorkoutSession> {
    return validateWorkoutSession({
        ...session,
        completedRestIds: [...new Set([...(session.completedRestIds ?? []), entryId])],
    });
}

/** Remove the result for one sequence occurrence. */
function clearResult(session: WorkoutSession, sequenceEntryId: SequenceEntryId): ValidationResult<WorkoutSession> {
    const next = structuredClone(session);
    if (next.completedRestIds) {
        next.completedRestIds = next.completedRestIds.filter((id) => id !== sequenceEntryId);
    }
    next.results = next.results.filter((result) => result.sequenceEntryId !== sequenceEntryId);
    return validateWorkoutSession(next);
}

/** Mark a session as finished at `completedAt`. */
function completeSession(session: WorkoutSession, completedAt: number): ValidationResult<WorkoutSession> {
    const next = structuredClone(session);
    next.completedAt = completedAt;
    return validateWorkoutSession(next);
}

/** Clear `completedAt` so results can be edited again. */
function reopenSession(session: WorkoutSession): ValidationResult<WorkoutSession> {
    const next = structuredClone(session);
    delete next.completedAt;
    return validateWorkoutSession(next);
}

export { clearResult, completeSession, draftResultFromPrescription, recordRest, recordResult, reopenSession };
