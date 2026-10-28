import { duplicateName } from './duplicateName.ts';
import type { ExerciseDefinition } from './exercise.ts';
import { generateExerciseId } from './generateIds.ts';

/**
 * Copy a catalog exercise under a new id and a `(copy)` name. Capability arrays
 * are deep-copied so editing the copy cannot reach back into the original.
 */
function duplicateExercise(exercise: ExerciseDefinition): ExerciseDefinition {
    const copy = structuredClone(exercise);

    copy.id = generateExerciseId();
    copy.name = duplicateName(exercise.name);

    return copy;
}

export { duplicateExercise };
