import type { ActualResult, WorkoutSession } from './session.ts';
import type { SetPrescription } from './prescription.ts';
import type { SequenceEntryId } from './ids.ts';
import type { ValidationResult } from './validation.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';

/**
 * Copy a planned set's prescription into an actual result. Numeric values start
 * as prescribed so logging "as planned" is a no-edit save; callers may then
 * change counts or weights without changing measurement or load meaning.
 */
function draftResultFromPrescription(
    sequenceEntryId: SequenceEntryId,
    prescription: SetPrescription,
    completedAt: number
): ActualResult {
    return {
        sequenceEntryId,
        measurement: structuredClone(prescription.measurement),
        load: structuredClone(prescription.load),
        completedAt,
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

/** Remove the result for one sequence occurrence. */
function clearResult(session: WorkoutSession, sequenceEntryId: SequenceEntryId): ValidationResult<WorkoutSession> {
    const next = structuredClone(session);
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

export { clearResult, completeSession, draftResultFromPrescription, recordResult, reopenSession };
