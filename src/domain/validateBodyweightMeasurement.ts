import { type } from 'arktype';
import { bodyweightMeasurement, type BodyweightMeasurement } from './bodyweight.ts';
import { formatPath, type ValidationResult } from './validation.ts';

/** Validate an untrusted value as a bodyweight history reading. */
function validateBodyweightMeasurement(input: unknown): ValidationResult<BodyweightMeasurement> {
    const parsed = bodyweightMeasurement(input);

    if (parsed instanceof type.errors) {
        return { ok: false, errors: parsed.map((error) => ({ path: formatPath(error.path), message: error.message })) };
    }

    return { ok: true, value: parsed };
}

export { validateBodyweightMeasurement };
