import { countBasisFor, type ExerciseDefinition, type ExecutionMode } from './exercise.ts';
import type { LoadConfiguration, MeasurementValue, SetPrescription } from './prescription.ts';

/** A prescription field that conflicts with its owning exercise. */
interface PrescriptionProblem {
    field: 'measurement' | 'executionMode' | 'load';
    message: string;
}

/** Report units or counting that conflict with the set's selected movement. */
function measurementProblems(
    exercise: ExerciseDefinition,
    value: Pick<MeasurementValue, 'measurement' | 'countBasis'>,
    mode: ExecutionMode
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
    const expected = countBasisFor(mode);
    if (countBasis !== expected) {
        return [
            {
                field: 'measurement',
                message: `exercise '${exercise.name}' requires '${measurement}' counted '${expected}' for '${mode}' movement`,
            },
        ];
    }
    return [];
}

/** Reject a set movement the exercise does not support. */
function executionModeProblems(exercise: ExerciseDefinition, prescription: SetPrescription): PrescriptionProblem[] {
    const { executionMode } = prescription;
    if (!exercise.executionModes.includes(executionMode)) {
        return [
            {
                field: 'executionMode',
                message: `exercise '${exercise.name}' supports '${exercise.executionModes.join(', ')}' execution`,
            },
        ];
    }
    return [];
}

/** Report every configuration that conflicts with the owning exercise. */
function prescriptionProblems(exercise: ExerciseDefinition, prescription: SetPrescription): PrescriptionProblem[] {
    return [
        ...measurementProblems(exercise, prescription.measurement, prescription.executionMode),
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
