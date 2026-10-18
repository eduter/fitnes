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
    if (exercise.loads.length === 0) {
        return 'no load';
    }
    return exercise.loads
        .map((option) => (option.kind === 'external' ? `external (${option.bases.join(', ')})` : option.kind))
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

function externalBasisProblems(exercise: ExerciseDefinition, load: LoadConfiguration): PrescriptionProblem[] {
    if (load.kind !== 'external' && load.kind !== 'bodyweightExternal') {
        return [];
    }

    const external = findLoadOption(exercise, 'external');
    if (external?.kind !== 'external') {
        return [
            {
                field: 'load',
                message: `exercise '${exercise.name}' does not allow external load; allowed: ${describeLoads(exercise)}`,
            },
        ];
    }

    if (external.bases.includes(load.basis)) {
        return [];
    }

    return [
        {
            field: 'load',
            message: `exercise '${exercise.name}' does not allow external load basis '${load.basis}'; allowed: ${external.bases.join(', ')}`,
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
    const problems: PrescriptionProblem[] = [];

    if (load.kind === 'none') {
        if (exercise.loads.length > 0) {
            problems.push({
                field: 'load',
                message: `exercise '${exercise.name}' requires load; allowed: ${describeLoads(exercise)}`,
            });
        }
        return problems;
    }

    if (load.kind === 'bodyweight' || load.kind === 'bodyweightExternal') {
        if (!findLoadOption(exercise, 'bodyweight')) {
            problems.push({
                field: 'load',
                message: `exercise '${exercise.name}' does not allow bodyweight load; allowed: ${describeLoads(exercise)}`,
            });
        }
    }

    problems.push(...externalBasisProblems(exercise, load));

    return problems;
}

export { executionModeProblems, loadProblems, measurementProblems, prescriptionProblems };
export type { PrescriptionProblem };
