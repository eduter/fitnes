import { massValue } from '../../domain/convertWeight.ts';
import type { WeightUnit } from '../../domain/units.ts';
import type { ActualMeasurement, LoadConfiguration } from '../../domain/prescription.ts';
import type { ActualResult } from '../../domain/session.ts';

/**
 * Which numeric cells one performed set needs. Derived from the result's own
 * measurement and load, because logging must keep the meaning the prescription
 * fixed: the user edits numbers, never the measurement or load kind.
 */
interface ResultCells {
    /** `perSide` renders one input per side, since the two sides can differ. */
    count: 'total' | 'perSide';
    /** What the count inputs hold. */
    unit: 'reps' | 'seconds';
    /** The load cell: an editable mass, a bodyweight marker, or nothing. */
    load: 'weight' | 'bodyweight' | 'none';
}

/** The cells to render for a performed set. */
function resultCells(result: ActualResult): ResultCells {
    return {
        count: result.measurement.countBasis,
        unit: result.measurement.measurement === 'repetitions' ? 'reps' : 'seconds',
        load: loadCell(result.load),
    };
}

function loadCell(load: LoadConfiguration): ResultCells['load'] {
    if (load.kind === 'none') {
        return 'none';
    }

    if (load.kind === 'bodyweight') {
        return 'bodyweight';
    }

    return 'weight';
}

/** Replace the single count of a total-counted result; ignores a per-side result. */
function withTotalCount(result: ActualResult, value: number): ActualResult {
    const { measurement } = result;

    if (measurement.countBasis !== 'total') {
        return result;
    }

    if (measurement.measurement === 'repetitions') {
        return { ...result, measurement: { measurement: 'repetitions', countBasis: 'total', reps: value } };
    }

    return { ...result, measurement: { measurement: 'duration', countBasis: 'total', seconds: value } };
}

/** Replace one side's count of a per-side result; ignores a total-counted result. */
function withSideCount(result: ActualResult, side: 'left' | 'right', value: number): ActualResult {
    const { measurement } = result;

    if (measurement.countBasis !== 'perSide') {
        return result;
    }

    const sides = { ...measurement.sides, [side]: value };

    if (measurement.measurement === 'repetitions') {
        return { ...result, measurement: { measurement: 'repetitions', countBasis: 'perSide', sides } };
    }

    return { ...result, measurement: { measurement: 'duration', countBasis: 'perSide', sides } };
}

/** Replace the external mass of a result; ignores a result with no external load. */
function withWeight(result: ActualResult, value: number, unit?: WeightUnit): ActualResult {
    const { load } = result;

    if (load.kind !== 'external' && load.kind !== 'bodyweightExternal') {
        return result;
    }

    return { ...result, load: { ...load, weight: { value, unit: unit ?? load.weight.unit } } };
}

/** The single count of a total-counted measurement, or undefined for any other shape. */
function totalCountValue(measurement: ActualMeasurement): number | undefined {
    if (measurement.countBasis !== 'total') {
        return undefined;
    }

    return measurement.measurement === 'repetitions' ? measurement.reps : measurement.seconds;
}

/** The per-side counts of a per-side measurement, or undefined for any other shape. */
function sideCountValues(measurement: ActualMeasurement): { left: number; right: number } | undefined {
    return measurement.countBasis === 'perSide' ? measurement.sides : undefined;
}

/** The external mass of a load, or undefined when the load carries none. */
function externalWeightValue(load: LoadConfiguration): number | undefined {
    return load.kind === 'external' || load.kind === 'bodyweightExternal' ? load.weight.value : undefined;
}

/**
 * Render a recorded performance as the few characters a reference column can
 * hold, so last time's numbers sit beside this time's inputs. Deliberately
 * terser than `formatLoad`/`formatMeasurement`: `60kg×8`, `BW×5`, `10/10`,
 * `BW×45s`.
 */
function formatSetReference(result: ActualResult, unit?: WeightUnit): string {
    const count = formatReferenceCount(result.measurement);
    const load = formatReferenceLoad(result.load, unit);

    return load === '' ? count : `${load}×${count}`;
}

function formatReferenceCount(measurement: ActualMeasurement): string {
    const suffix = measurement.measurement === 'repetitions' ? '' : 's';

    if (measurement.countBasis === 'total') {
        return `${totalCountValue(measurement)}${suffix}`;
    }

    const sides = sideCountValues(measurement);
    return sides ? `${sides.left}/${sides.right}${suffix}` : `?${suffix}`;
}

function formatReferenceLoad(load: LoadConfiguration, unit?: WeightUnit): string {
    if (load.kind === 'none') {
        return '';
    }

    if (load.kind === 'bodyweight') {
        return 'BW';
    }

    const weight = massValue(load.weight, unit ?? load.weight.unit);
    const amount = weight === undefined ? '?' : `${weight}${unit ?? load.weight.unit}`;
    return load.kind === 'bodyweightExternal' ? `BW+${amount}` : amount;
}

/**
 * Describe a block's prescribed targets in one line. Identical targets collapse
 * to `8 reps × 3`; differing ones are listed in sequence, because a compact
 * summary that hid the difference would misreport the plan.
 */
function summarizeTargets(targets: string[]): string {
    const first = targets[0];

    if (first === undefined) {
        return '';
    }

    if (targets.every((target) => target === first)) {
        return `${first} × ${targets.length}`;
    }

    return targets.join(' · ');
}

export {
    externalWeightValue,
    formatSetReference,
    resultCells,
    sideCountValues,
    summarizeTargets,
    totalCountValue,
    withSideCount,
    withTotalCount,
    withWeight,
};
export type { ResultCells };
