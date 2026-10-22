import { type } from 'arktype';
import { executionMode, loadBasis } from './exercise.ts';
import { positiveCount, positiveFinite, weight } from './units.ts';

/**
 * The quantity prescribed, with its counting basis. Repetitions are positive
 * integers; duration is positive seconds. A per-side target is a single number
 * that applies to each side — the plan states an intention, not a performance,
 * so it cannot carry an asymmetry. Each branch fixes `countBasis` as a literal
 * so the union discriminates.
 */
const measurementValue = type({
    measurement: '"repetitions"',
    countBasis: '"total"',
    reps: positiveCount,
})
    .or({ measurement: '"duration"', countBasis: '"total"', seconds: positiveFinite })
    .or({ measurement: '"repetitions"', countBasis: '"perSide"', reps: positiveCount })
    .or({ measurement: '"duration"', countBasis: '"perSide"', seconds: positiveFinite })
    .onDeepUndeclaredKey('reject');
type MeasurementValue = typeof measurementValue.infer;

const sideCounts = type({ left: positiveCount, right: positiveCount }).onUndeclaredKey('reject');
const sideDurations = type({ left: positiveFinite, right: positiveFinite }).onUndeclaredKey('reject');

/**
 * The quantity actually performed. A `total` measurement keeps a single value,
 * exactly like the plan. A `perSide` measurement records each side separately,
 * because the two sides can genuinely differ (ten left, nine right) and the
 * plan — which states a target, not a performance — cannot carry that. Keeping
 * `sides` off the total variants means the asymmetry only appears where it is
 * meaningful, and a per-side actual can never silently lose one side.
 */
const actualMeasurement = type({
    measurement: '"repetitions"',
    countBasis: '"total"',
    reps: positiveCount,
})
    .or({ measurement: '"duration"', countBasis: '"total"', seconds: positiveFinite })
    .or({ measurement: '"repetitions"', countBasis: '"perSide"', sides: sideCounts })
    .or({ measurement: '"duration"', countBasis: '"perSide"', sides: sideDurations })
    .onDeepUndeclaredKey('reject');
type ActualMeasurement = typeof actualMeasurement.infer;

/**
 * The load configuration for a set. `bodyweightExternal` keeps bodyweight and
 * added external load as separate components rather than collapsing them into
 * one number, which is what weighted pull-ups require. A zero external weight
 * is valid and means no added load; it is not the same as omitting the load.
 */
const loadConfiguration = type({ kind: '"none"' })
    .or({ kind: '"bodyweight"' })
    .or({ kind: '"external"', basis: loadBasis, weight })
    .or({ kind: '"bodyweightExternal"', basis: loadBasis, weight })
    .onDeepUndeclaredKey('reject');
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
}).onDeepUndeclaredKey('reject');
type SetPrescription = typeof setPrescription.infer;

export { actualMeasurement, loadConfiguration, measurementValue, setPrescription };
export type { ActualMeasurement, LoadConfiguration, MeasurementValue, SetPrescription };
