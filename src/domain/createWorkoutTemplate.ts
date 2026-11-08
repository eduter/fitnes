import type { ExerciseDefinition } from './exercise.ts';
import type { WorkoutTemplateId } from './ids.ts';
import { validateWorkoutTemplate } from './validateWorkoutTemplate.ts';
import type { ValidationResult } from './validation.ts';
import type { PlannedSet, SequenceEntry, WorkoutTemplate } from './workoutTemplate.ts';

/** Inputs for building a template from catalog definitions and planned work. */
interface CreateWorkoutTemplateInput {
    id: WorkoutTemplateId;
    name: string;
    description?: string;
    catalog: readonly ExerciseDefinition[];
    sets: PlannedSet[];
    sequence: SequenceEntry[];
    existingSnapshots?: readonly ExerciseDefinition[];
}

/**
 * Build a workout template by copying referenced catalog (or existing snapshot)
 * definitions into the document. The catalog remains the editable source of
 * truth; templates keep independent copies so later catalog edits cannot change
 * a saved plan unless {@link refreshTemplateExercises} is called.
 */
function createWorkoutTemplate(input: CreateWorkoutTemplateInput): ValidationResult<WorkoutTemplate> {
    const { id, name, description, catalog, sets, sequence, existingSnapshots = [] } = input;

    const template: WorkoutTemplate = {
        id,
        name,
        schemaVersion: 1,
        exercises: snapshotReferencedExercises(sets, catalog, existingSnapshots),
        sets: structuredClone(sets),
        sequence: structuredClone(sequence),
    };

    if (description !== undefined && description !== '') {
        template.description = description;
    }

    return validateWorkoutTemplate(template);
}

/**
 * Replace a template's embedded exercise definitions with the current catalog
 * copies for the same ids. Prescriptions and sequence are left unchanged.
 */
function refreshTemplateExercises(
    template: WorkoutTemplate,
    catalog: readonly ExerciseDefinition[]
): ValidationResult<WorkoutTemplate> {
    return createWorkoutTemplate({
        id: template.id,
        name: template.name,
        description: template.description,
        catalog,
        sets: template.sets,
        sequence: template.sequence,
    });
}

function snapshotReferencedExercises(
    sets: PlannedSet[],
    catalog: readonly ExerciseDefinition[],
    existingSnapshots: readonly ExerciseDefinition[]
): ExerciseDefinition[] {
    const byId = new Map<string, ExerciseDefinition>();

    for (const exercise of catalog) {
        if (!byId.has(exercise.id)) {
            byId.set(exercise.id, structuredClone(exercise));
        }
    }

    // Existing snapshots win so catalog drift cannot rewrite a saved template.
    for (const exercise of existingSnapshots) {
        byId.set(exercise.id, structuredClone(exercise));
    }

    const exercises: ExerciseDefinition[] = [];
    const seen = new Set<string>();

    for (const set of sets) {
        if (seen.has(set.exerciseId)) {
            continue;
        }
        seen.add(set.exerciseId);

        const definition = byId.get(set.exerciseId);
        if (definition) {
            exercises.push(definition);
        }
    }

    return exercises;
}

export type { CreateWorkoutTemplateInput };
export { createWorkoutTemplate, refreshTemplateExercises };
