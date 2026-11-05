import { findOccurrence } from '../../domain/lookups.ts';
import type { ActualResult, WorkoutSession } from '../../domain/session.ts';

/**
 * The most recent recorded performance for the same exercise, per sequence
 * entry. This is the number a lifter actually needs while logging — "what did I
 * do last time" — so it is resolved once for the whole session rather than per
 * row, and matched by exercise plus set position within that exercise.
 */
function previousPerformance(session: WorkoutSession, sessions: WorkoutSession[]): Record<string, ActualResult> {
    const earlier = sessions
        .filter((candidate) => candidate.id !== session.id && candidate.startedAt < session.startedAt)
        .sort((left, right) => right.startedAt - left.startedAt);

    const byEntryId: Record<string, ActualResult> = {};

    for (const occurrence of session.snapshot.sequence) {
        const resolved = findOccurrence(session.snapshot, occurrence.id);
        if (!resolved) {
            continue;
        }

        const position = setPositionInExercise(session, resolved.entry.id);
        const found = findEarlierResult(earlier, resolved.exercise.id, position);
        if (found) {
            byEntryId[occurrence.id] = found;
        }
    }

    return byEntryId;
}

/**
 * Which set of this exercise the entry is, counting only the session's own
 * occurrences. Position, not sequence index, is what makes last week's third
 * set comparable to this week's third set.
 */
function setPositionInExercise(session: WorkoutSession, sequenceEntryId: string): number {
    const exerciseId = findOccurrence(session.snapshot, sequenceEntryId)?.exercise.id;
    if (exerciseId === undefined) {
        return 0;
    }

    let position = 0;

    for (const entry of session.snapshot.sequence) {
        if (entry.id === sequenceEntryId) {
            return position;
        }

        if (findOccurrence(session.snapshot, entry.id)?.exercise.id === exerciseId) {
            position += 1;
        }
    }

    return position;
}

/**
 * The result at `position` among that exercise's results in the newest earlier
 * session that recorded it. A shorter earlier session falls back to its last
 * set, which is more useful than showing nothing when a plan gained a set.
 */
function findEarlierResult(earlier: WorkoutSession[], exerciseId: string, position: number): ActualResult | undefined {
    for (const candidate of earlier) {
        const results = resultsForExercise(candidate, exerciseId);
        if (results.length === 0) {
            continue;
        }

        return results[position] ?? results[results.length - 1];
    }

    return undefined;
}

function resultsForExercise(session: WorkoutSession, exerciseId: string): ActualResult[] {
    const results: ActualResult[] = [];

    for (const entry of session.snapshot.sequence) {
        if (findOccurrence(session.snapshot, entry.id)?.exercise.id !== exerciseId) {
            continue;
        }

        const result = session.results.find((candidate) => candidate.sequenceEntryId === entry.id);
        if (result) {
            results.push(result);
        }
    }

    return results;
}

export { previousPerformance };
