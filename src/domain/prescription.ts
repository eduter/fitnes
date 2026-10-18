import { type } from 'arktype';
import { executionMode, loadBasis, measurementCountBasis } from './exercise.ts';
import { positiveCount, positiveFinite, weight } from './units.ts';

/**
 * The quantity performed or prescribed, with its counting basis. Repetitions
 * are positive integers; duration is positive seconds. The two variants are
 * mutually exclusive so a set cannot carry both.
 */
const measurementValue = type({
    measurement: '"repetitions"',
    countBasis: measurementCountBasis,
    reps: positiveCount,
}).or({
    measurement: '"duration"',
    countBasis: measurementCountBasis,
    seconds: positiveFinite,
});
type MeasurementValue = typeof measurementValue.infer;

/**
 * The load configuration for a set. `bodyweightExternal` keeps bodyweight and
 * added external load as separate components rather than collapsing them into
 * one number, which is what weighted pull-ups require. A zero external weight
 * is valid and means no added load; it is not the same as omitting the load.
 */
const loadConfiguration = type({ kind: '"none"' })
    .or({ kind: '"bodyweight"' })
    .or({ kind: '"external"', basis: loadBasis, weight })
    .or({ kind: '"bodyweightExternal"', basis: loadBasis, weight });
type LoadConfiguration = typeof loadConfiguration.infer;

/**
 * A per-set prescription: what measurement, execution mode, and load the set
 * calls for. Compatibility with the referenced exercise definition is checked
 * during workout-template validation, not here.
 */
const setPrescription = type({
    measurement: measurementValue,
    executionMode,
    load: loadConfiguration,
});
type SetPrescription = typeof setPrescription.infer;

export { loadConfiguration, measurementValue, setPrescription };
export type { LoadConfiguration, MeasurementValue, SetPrescription };
