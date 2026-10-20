import type { ExerciseDefinition, LoadOption, MeasurementOption } from './exercise.ts';
import type { LoadConfiguration, MeasurementValue, SetPrescription } from './prescription.ts';

/**
 * A prescription field that conflicts with the exercise definition, with a
 * message explaining the conflict. The field name is relative to the
 * prescription so callers can prefix it with the owning document path.
 */
interface PrescriptionProblem {
    field: 'measurement' | 'executionMode' | 'load';
    message: string;
}

function findMeasurementOption(
    exercise: ExerciseDefinition,
    measurement: SetPrescription['measurement']['measurement'],
    countBasis: SetPrescription['measurement']['countBasis']
): MeasurementOption | undefined {
    return exercise.measurements.find(
        (option) => option.measurement === measurement && option.countBasis === countBasis
    );
}

function findLoadOption(exercise: ExerciseDefinition, kind: LoadOption['kind']): LoadOption | undefined {
    return exercise.loads.find((option) => option.kind === kind);
}

function describeMeasurements(exercise: ExerciseDefinition): string {
    return exercise.measurements.map((option) => `${option.measurement}/${option.countBasis}`).join(', ');
}

function describeLoads(exercise: ExerciseDefinition): string {
    return exercise.loads
        .map((option) =>
            option.kind === 'external' || option.kind === 'bodyweightExternal'
                ? `${option.kind} (${option.bases.join(', ')})`
                : option.kind
        )
        .join(', ');
}

function measurementProblems(exercise: ExerciseDefinition, value: MeasurementValue): PrescriptionProblem[] {
    const { measurement, countBasis } = value;

    if (findMeasurementOption(exercise, measurement, countBasis)) {
        return [];
    }

    const sameMeasurement = exercise.measurements.some((option) => option.measurement === measurement);
    if (sameMeasurement) {
        return [
            {
                field: 'measurement',
                message: `exercise '${exercise.name}' does not support '${measurement}' counted '${countBasis}'; allowed: ${describeMeasurements(exercise)}`,
            },
        ];
    }

    return [
        {
            field: 'measurement',
            message: `exercise '${exercise.name}' does not support '${measurement}' measurement; allowed: ${describeMeasurements(exercise)}`,
        },
    ];
}

function executionModeProblems(exercise: ExerciseDefinition, prescription: SetPrescription): PrescriptionProblem[] {
    const { executionMode } = prescription;

    if (exercise.executionModes.includes(executionMode)) {
        return [];
    }

    return [
        {
            field: 'executionMode',
            message: `exercise '${exercise.name}' does not support '${executionMode}' execution; allowed: ${exercise.executionModes.join(', ')}`,
        },
    ];
}

/**
 * Report every way `prescription` conflicts with `exercise`. Checks the
 * measurement and its counting basis, the execution mode, and the load
 * configuration including the external-load basis.
 */
function prescriptionProblems(exercise: ExerciseDefinition, prescription: SetPrescription): PrescriptionProblem[] {
    return [
        ...measurementProblems(exercise, prescription.measurement),
        ...executionModeProblems(exercise, prescription),
        ...loadProblems(exercise, prescription.load),
    ];
}

/**
 * Report every way `load` conflicts with `exercise`: whether the load kind is
 * allowed and, for external load, whether its basis is one the exercise
 * supports.
 */
function loadProblems(exercise: ExerciseDefinition, load: LoadConfiguration): PrescriptionProblem[] {
    const option = findLoadOption(exercise, load.kind);
    if (!option) {
        return [
            {
                field: 'load',
                message: `exercise '${exercise.name}' does not allow '${load.kind}' load; allowed: ${describeLoads(exercise)}`,
            },
        ];
    }

    if (load.kind === 'none' || load.kind === 'bodyweight') {
        return [];
    }

    if ((option.kind === 'external' || option.kind === 'bodyweightExternal') && option.bases.includes(load.basis)) {
        return [];
    }

    const allowedBases =
        option.kind === 'external' || option.kind === 'bodyweightExternal' ? option.bases.join(', ') : 'none';
    return [
        {
            field: 'load',
            message: `exercise '${exercise.name}' does not allow '${load.kind}' load basis '${load.basis}'; allowed: ${allowedBases}`,
        },
    ];
}

export { executionModeProblems, loadProblems, measurementProblems, prescriptionProblems };
export type { PrescriptionProblem };
