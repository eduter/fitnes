import type { ActualMeasurement, LoadConfiguration, MeasurementValue } from './prescription.ts';
import type { Weight } from './units.ts';

/**
 * Render a measurement with its counting basis. A performed per-side value
 * shows both sides, since they can differ; a planned per-side target shows the
 * one number it prescribes.
 */
function formatMeasurement(value: ActualMeasurement | MeasurementValue): string {
    if (value.countBasis === 'perSide' && 'sides' in value) {
        const { left, right } = value.sides;
        const suffix = value.measurement === 'repetitions' ? ' reps' : 's';
        return left === right ? `${left}${suffix} / side` : `${left}${suffix} left, ${right}${suffix} right`;
    }

    const amount = value.measurement === 'repetitions' ? `${value.reps} reps` : `${value.seconds}s`;
    return value.countBasis === 'perSide' ? `${amount} / side` : amount;
}

/** Render a load configuration without combining bodyweight and external into one number. */
function formatLoad(load: LoadConfiguration): string {
    if (load.kind === 'none') {
        return 'no load';
    }

    if (load.kind === 'bodyweight') {
        return 'bodyweight';
    }

    const external = formatWeight(load.weight);
    if (load.kind === 'bodyweightExternal') {
        const sign = load.weight.value < 0 ? '-' : '+';
        return `bodyweight ${sign} ${formatWeight({ ...load.weight, value: Math.abs(load.weight.value) })}`;
    }
    return external;
}

/** Render a mass and its unit. Values are never converted. */
function formatWeight(weight: Weight): string {
    return `${weight.value} ${weight.unit}`;
}

export { formatLoad, formatMeasurement, formatWeight };
