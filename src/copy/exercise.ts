import type { ExecutionMode, LoadOption, MeasurementType } from '../domain/exercise.ts';
import type { WeightUnit } from '../domain/units.ts';

/** Shared exercise and workout terminology, without an internationalization layer. */
const exerciseCopy = {
    unit: 'Unit',
    sides: 'Sides',
    weight: 'Weight',
    units: { repetitions: 'Reps', duration: 'Seconds' } satisfies Record<MeasurementType, string>,
    sideOptions: { bilateral: 'Both sides', unilateral: 'One side' } satisfies Record<ExecutionMode, string>,
    weights: {
        none: 'No weight',
        bodyweight: 'Bodyweight',
        external: 'Added weight',
        bodyweightExternal: 'Bodyweight + added weight',
    } satisfies Record<LoadOption['kind'], string>,
    timing: { prepSeconds: 'Prep time (s)', secondsPerRep: 'Rep duration (s)' },
};

/** Label a target using the same units as the exercise definition. */
function targetLabel(unit: MeasurementType, mode: ExecutionMode): string {
    return `${exerciseCopy.units[unit]}${mode === 'unilateral' ? ' per side' : ''}`;
}

/** Label total added weight in the user's selected mass unit. */
function addedWeightLabel(unit: WeightUnit): string {
    return `${exerciseCopy.weights.external} (${unit})`;
}

export { addedWeightLabel, exerciseCopy, targetLabel };
