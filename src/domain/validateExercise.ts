import { type } from 'arktype';
import { exerciseDefinition, type ExerciseDefinition } from './exercise.ts';
import { formatPath, type ValidationResult } from './validation.ts';

/** Validate an untrusted value as a catalog exercise definition. */
function validateExercise(input: unknown): ValidationResult<ExerciseDefinition> {
    const parsed = exerciseDefinition(input);

    if (parsed instanceof type.errors) {
        return { ok: false, errors: parsed.map((error) => ({ path: formatPath(error.path), message: error.message })) };
    }

    return { ok: true, value: parsed };
}

export { validateExercise };
