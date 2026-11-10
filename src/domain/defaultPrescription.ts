import { countBasisFor, type ExerciseDefinition, type LoadOption } from './exercise.ts';
import type { LoadConfiguration, MeasurementValue, SetPrescription } from './prescription.ts';

const DEFAULT_REPS = 8;
const DEFAULT_SECONDS = 30;
const DEFAULT_WEIGHT = { value: 0, unit: 'kg' } as const;

/**
 * Build a prescription using the first supported unit and the exercise's fixed
 * movement and load behavior. External load starts at zero so "no added weight" is
 * explicit rather than omitted.
 */
function defaultPrescription(exercise: ExerciseDefinition): SetPrescription {
    const measurementOption = exercise.measurements[0];
    const executionMode = exercise.executionMode;
    const loadOption = exercise.load;

    if (!measurementOption || !executionMode || !loadOption) {
        throw new Error(`exercise '${exercise.name}' is missing a required capability`);
    }

    return {
        measurement: defaultMeasurement(measurementOption, countBasisFor(executionMode)),
        executionMode,
        load: defaultLoad(loadOption),
    };
}

function defaultMeasurement(
    measurement: MeasurementValue['measurement'],
    countBasis: MeasurementValue['countBasis']
): MeasurementValue {
    if (measurement === 'repetitions') {
        return { measurement, countBasis, reps: DEFAULT_REPS };
    }

    return { measurement, countBasis, seconds: DEFAULT_SECONDS };
}

function defaultLoad(option: LoadOption): LoadConfiguration {
    if (option.kind === 'none' || option.kind === 'bodyweight') {
        return { kind: option.kind };
    }

    return {
        kind: option.kind,
        weight: { ...DEFAULT_WEIGHT },
    };
}

export { defaultPrescription };
