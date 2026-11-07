import type { Weight, WeightUnit } from './units.ts';

const kilogramsPerPound = 0.45359237;

/** Convert a mass explicitly for the configured UI unit, leaving stored records unchanged. */
function convertWeight(weight: Weight, unit: WeightUnit): Weight {
    if (weight.unit === unit) {
        return { ...weight };
    }
    return { value: unit === 'kg' ? weight.value * kilogramsPerPound : weight.value / kilogramsPerPound, unit };
}

/** Round a converted value for an input's displayed precision. */
function massValue(weight: Weight, unit: WeightUnit, digits = 2): number {
    return Number(convertWeight(weight, unit).value.toFixed(digits));
}

/** Format in the configured unit; bodyweight uses an explicit one-place precision. */
function formatMass(weight: Weight, unit: WeightUnit, digits = 2): string {
    const value = massValue(weight, unit, digits);
    return `${digits === 1 ? value.toFixed(1) : value} ${unit}`;
}

export { convertWeight, massValue, formatMass };
