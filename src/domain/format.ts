import type { LoadConfiguration, MeasurementValue } from './prescription.ts';
import type { Weight } from './units.ts';

/** Render a measurement value with its counting basis. */
function formatMeasurement(value: MeasurementValue): string {
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

    const external = `${formatWeight(load.weight)} ${basisLabel(load.basis)}`;
    return load.kind === 'bodyweightExternal' ? `bodyweight + ${external}` : external;
}

/** Render a mass and its unit. Values are never converted. */
function formatWeight(weight: Weight): string {
    return `${weight.value} ${weight.unit}`;
}

function basisLabel(basis: 'total' | 'perSide'): string {
    if (basis === 'total') {
        return 'total';
    }

    return '/ side';
}

export { formatLoad, formatMeasurement, formatWeight };
