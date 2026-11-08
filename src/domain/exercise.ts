import { type } from 'arktype';
import { exerciseId } from './ids.ts';
import { trackingTiming } from './trackingTiming.ts';

/**
 * How a measurement is counted. `total` counts once for the set; `perSide`
 * counts once per side. The distinction is independent of the exercise's
 * execution mode: a unilateral set may still record one total repetition count.
 */
const measurementCountBasis = type('"total" | "perSide"');
type MeasurementCountBasis = typeof measurementCountBasis.infer;

/** The quantity a set prescribes. Repetitions are counts; duration is a time in seconds. */
const measurementType = type('"repetitions" | "duration"');
type MeasurementType = typeof measurementType.infer;

/** Whether an exercise is performed with both sides together or one side at a time. */
const executionMode = type('"bilateral" | "unilateral"');
type ExecutionMode = typeof executionMode.infer;

/** What a stated external-load value means. Never converted between bases implicitly. */
const loadBasis = type('"total" | "perSide"');
type LoadBasis = typeof loadBasis.infer;

const loadBases = loadBasis
    .array()
    .atLeastLength(1)
    .narrow((bases, ctx) => new Set(bases).size === bases.length || ctx.mustBe('unique'));

/**
 * A supported way to perform an exercise, pairing a measurement with the
 * counting basis it uses. Enumerating valid pairs prevents contradictions such
 * as "duration per hand".
 */
const measurementOption = type({
    measurement: measurementType,
    countBasis: measurementCountBasis,
}).onUndeclaredKey('reject');
type MeasurementOption = typeof measurementOption.infer;

/**
 * A complete supported load configuration. Combined bodyweight and external
 * load is explicit so configuring a weighted bodyweight exercise does not also
 * permit an external-only prescription.
 */
const loadOption = type({ kind: '"none"' })
    .or({ kind: '"bodyweight"' })
    .or({ kind: '"external"', bases: loadBases })
    .or({ kind: '"bodyweightExternal"', bases: loadBases })
    .onDeepUndeclaredKey('reject');
type LoadOption = typeof loadOption.infer;

const measurementOptions = measurementOption
    .array()
    .atLeastLength(1)
    .narrow((options, ctx) => {
        const seen = new Set(options.map((option) => `${option.measurement}/${option.countBasis}`));
        return seen.size === options.length || ctx.mustBe('unique by measurement and count basis');
    });

const executionModes = executionMode
    .array()
    .atLeastLength(1)
    .narrow((modes, ctx) => new Set(modes).size === modes.length || ctx.mustBe('unique'));

const loadOptions = loadOption
    .array()
    .atLeastLength(1)
    .narrow((options, ctx) => {
        const seen = new Set(options.map((option) => option.kind));
        return seen.size === options.length || ctx.mustBe('unique by load kind');
    });

/**
 * A reusable catalog entry describing what kinds of performance an exercise
 * allows. Every exercise is defined once; workout prescriptions then choose a
 * configuration from `measurements`, `executionModes`, and `loads`.
 */
const exerciseDefinition = type({
    id: exerciseId,
    name: 'string > 0',
    'description?': 'string',
    'timing?': trackingTiming,
    measurements: measurementOptions,
    executionModes,
    loads: loadOptions,
}).onDeepUndeclaredKey('reject');
type ExerciseDefinition = typeof exerciseDefinition.infer;

export type {
    ExecutionMode,
    ExerciseDefinition,
    LoadBasis,
    LoadOption,
    MeasurementCountBasis,
    MeasurementOption,
    MeasurementType,
};
export {
    executionMode,
    exerciseDefinition,
    loadBasis,
    loadOption,
    measurementCountBasis,
    measurementOption,
    measurementType,
};
