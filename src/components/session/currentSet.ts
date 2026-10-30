import { findOccurrence } from '../../domain/lookups.ts';
import type { SequenceOccurrence } from '../../domain/lookups.ts';
import type { WorkoutSession } from '../../domain/session.ts';

/** One unlogged occurrence in the plan's exact execution order. */
interface CurrentSet {
    occurrence: SequenceOccurrence;
    position: number;
    exerciseSet: number;
}

/** Resolve the first unlogged occurrence; clearing a result naturally makes it current again. */
function currentSet(session: WorkoutSession): CurrentSet | undefined {
    const { snapshot, results } = session;
    const recorded = new Set(results.map((result) => result.sequenceEntryId));
    const index = snapshot.sequence.findIndex((entry) => !recorded.has(entry.id));
    const entry = snapshot.sequence[index];
    if (!entry) {
        return undefined;
    }

    const occurrence = findOccurrence(snapshot, entry.id);
    if (!occurrence) {
        return undefined;
    }

    const exerciseSet = snapshot.sequence
        .slice(0, index + 1)
        .filter((candidate) => findOccurrence(snapshot, candidate.id)?.exercise.id === occurrence.exercise.id).length;

    return { occurrence, position: index + 1, exerciseSet };
}

export { currentSet };
export type { CurrentSet };
