import type { ExerciseDefinition } from './exercise.ts';
import type { LoadConfiguration } from './prescription.ts';
import type { WorkoutSession } from './session.ts';
import type { Weight } from './units.ts';
import type { PlannedSet, SequenceEntry, WorkoutTemplate } from './workoutTemplate.ts';

/** The plan data needed to interpret one sequence occurrence. */
interface SequenceOccurrence {
    entry: SequenceEntry;
    set: PlannedSet;
    exercise: ExerciseDefinition;
}

/** Resolve a sequence entry to its planned set and embedded exercise definition. */
function findOccurrence(template: WorkoutTemplate, sequenceEntryId: string): SequenceOccurrence | undefined {
    const entry = template.sequence.find((candidate) => candidate.id === sequenceEntryId);
    if (!entry || entry.plannedSetId === undefined) {
        return undefined;
    }

    const set = template.sets.find((candidate) => candidate.id === entry.plannedSetId);
    if (!set) {
        return undefined;
    }

    const exercise = template.exercises.find((candidate) => candidate.id === set.exerciseId);
    if (!exercise) {
        return undefined;
    }

    return { entry, set, exercise };
}

/** True when a load configuration includes the user's body mass. */
function loadUsesBodyweight(load: LoadConfiguration): boolean {
    return load.kind === 'bodyweight' || load.kind === 'bodyweightExternal';
}

/** True when any planned set in the template uses bodyweight or weighted bodyweight. */
function templateUsesBodyweight(template: WorkoutTemplate): boolean {
    return template.sets.some((set) => loadUsesBodyweight(set.prescription.load));
}

/** The session's bodyweight snapshot as a `Weight`, if one was recorded. */
function sessionBodyweightWeight(session: WorkoutSession): Weight | undefined {
    if (!session.bodyweight) {
        return undefined;
    }

    return { value: session.bodyweight.value, unit: session.bodyweight.unit };
}

/**
 * Group consecutive sequence entries that use the same exercise, so one screen
 * section can show one exercise's sets as a block. Grouping is adjacency-only:
 * a plan that interleaves two exercises stays interleaved, because reordering
 * it for display would misrepresent the order the user is meant to follow.
 */
function groupSequenceEntries(template: WorkoutTemplate): SequenceOccurrence[][] {
    const blocks: SequenceOccurrence[][] = [];

    for (const entry of template.sequence) {
        const occurrence = findOccurrence(template, entry.id);
        if (!occurrence) {
            continue;
        }

        const current = blocks[blocks.length - 1];
        const previous = current?.[current.length - 1];

        if (previous && previous.exercise.id === occurrence.exercise.id) {
            current.push(occurrence);
            continue;
        }

        blocks.push([occurrence]);
    }

    return blocks;
}

export type { SequenceOccurrence };
export { findOccurrence, groupSequenceEntries, loadUsesBodyweight, sessionBodyweightWeight, templateUsesBodyweight };
