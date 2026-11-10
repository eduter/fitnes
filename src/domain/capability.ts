import { countBasisFor, type ExerciseDefinition } from './exercise.ts';
import type { LoadConfiguration, MeasurementValue, SetPrescription } from './prescription.ts';

/** A prescription field that conflicts with its owning exercise. */
interface PrescriptionProblem {
    field: 'measurement' | 'executionMode' | 'load';
    message: string;
}

/** Report units or counting that conflict with the exercise's fixed movement. */
function measurementProblems(
    exercise: ExerciseDefinition,
    value: Pick<MeasurementValue, 'measurement' | 'countBasis'>
): PrescriptionProblem[] {
    const { measurement, countBasis } = value;
    if (!exercise.measurements.includes(measurement)) {
        return [
            {
                field: 'measurement',
                message: `exercise '${exercise.name}' does not support '${measurement}' measurement; allowed: ${exercise.measurements.join(', ')}`,
            },
        ];
    }
    const expected = countBasisFor(exercise.executionMode);
    if (countBasis !== expected) {
        return [
            {
                field: 'measurement',
                message: `exercise '${exercise.name}' requires '${measurement}' counted '${expected}' for '${exercise.executionMode}' movement`,
            },
        ];
    }
    return [];
}

/** Reject attempts to change an exercise's movement in a set. */
function executionModeProblems(exercise: ExerciseDefinition, prescription: SetPrescription): PrescriptionProblem[] {
    const { executionMode } = prescription;
    if (executionMode !== exercise.executionMode) {
        return [
            {
                field: 'executionMode',
                message: `exercise '${exercise.name}' requires '${exercise.executionMode}' execution`,
            },
        ];
    }
    return [];
}

/** Report every configuration that conflicts with the owning exercise. */
function prescriptionProblems(exercise: ExerciseDefinition, prescription: SetPrescription): PrescriptionProblem[] {
    return [
        ...measurementProblems(exercise, prescription.measurement),
        ...executionModeProblems(exercise, prescription),
        ...loadProblems(exercise, prescription.load),
    ];
}

/** Reject a load configuration that changes the exercise's fixed load behavior. */
function loadProblems(exercise: ExerciseDefinition, load: LoadConfiguration): PrescriptionProblem[] {
    if (load.kind !== exercise.load.kind) {
        return [
            {
                field: 'load',
                message: `exercise '${exercise.name}' does not allow '${load.kind}' load; required: ${exercise.load.kind}`,
            },
        ];
    }
    return [];
}

export { executionModeProblems, loadProblems, measurementProblems, prescriptionProblems };
export type { PrescriptionProblem };
