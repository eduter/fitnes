import { duplicateName } from './duplicateName.ts';
import { generatePlannedSetId, generateSequenceEntryId, generateWorkoutTemplateId } from './generateIds.ts';
import type { PlannedSetId } from './ids.ts';
import type { WorkoutTemplate } from './workoutTemplate.ts';

/**
 * Copy a template under a new id and a `(copy)` name. Planned sets and sequence
 * entries get fresh ids too, and each entry is re-pointed at the copy of its
 * set, so the duplicate is a fully independent document rather than a second
 * reference to the same sets. Embedded exercise snapshots are copied as-is.
 */
function duplicateWorkoutTemplate(template: WorkoutTemplate): WorkoutTemplate {
    const copy = structuredClone(template);

    copy.id = generateWorkoutTemplateId();
    copy.name = duplicateName(template.name);

    const setIds = new Map<string, PlannedSetId>();
    copy.sets = copy.sets.map((set) => {
        const id = generatePlannedSetId();
        setIds.set(set.id, id);
        return { ...set, id };
    });

    copy.sequence = copy.sequence.map((entry) => {
        const plannedSetId = setIds.get(entry.plannedSetId);
        if (!plannedSetId) {
            throw new Error(`cannot duplicate template '${template.id}': set '${entry.plannedSetId}' is missing`);
        }

        return { id: generateSequenceEntryId(), plannedSetId };
    });

    return copy;
}

export { duplicateWorkoutTemplate };
