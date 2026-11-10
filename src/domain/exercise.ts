import { type } from 'arktype';
import { exerciseId } from './ids.ts';
import { trackingTiming } from './trackingTiming.ts';

/** Whether a target applies once to the movement or separately to each side. */
type MeasurementCountBasis = 'total' | 'perSide';

/** The quantity a set prescribes: repetitions or seconds. */
const measurementType = type('"repetitions" | "duration"');
type MeasurementType = typeof measurementType.infer;

/** Whether the exercise uses both sides together or one side at a time. */
const executionMode = type('"bilateral" | "unilateral"');
type ExecutionMode = typeof executionMode.infer;

/** Fixed load behavior; added weight is always the total held during the movement. */
const loadOption = type({ kind: '"none"' })
    .or({ kind: '"bodyweight"' })
    .or({ kind: '"external"' })
    .or({ kind: '"bodyweightExternal"' })
    .onDeepUndeclaredKey('reject');
type LoadOption = typeof loadOption.infer;

const measurements = measurementType
    .array()
    .atLeastLength(1)
    .narrow((values, ctx) => new Set(values).size === values.length || ctx.mustBe('unique'));

/** A reusable exercise with supported movements and fixed load behavior and supported measurement units. */
const exerciseDefinition = type({
    id: exerciseId,
    name: 'string > 0',
    'description?': 'string',
    'timing?': trackingTiming,
    measurements,
    executionModes: executionMode
        .array()
        .atLeastLength(1)
        .narrow((modes, ctx) => new Set(modes).size === modes.length || ctx.mustBe('unique')),
    load: loadOption,
}).onDeepUndeclaredKey('reject');
type ExerciseDefinition = typeof exerciseDefinition.infer;

/** Derive counting from the exercise movement rather than exposing a second choice. */
function countBasisFor(mode: ExecutionMode): MeasurementCountBasis {
    return mode === 'unilateral' ? 'perSide' : 'total';
}

export type { ExecutionMode, ExerciseDefinition, LoadOption, MeasurementCountBasis, MeasurementType };
export { countBasisFor, executionMode, exerciseDefinition, loadOption, measurementType };
