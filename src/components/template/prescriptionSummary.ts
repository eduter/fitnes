import type { SetPrescription } from '../../domain/prescription.ts';

/**
 * One-line description of what a planned set asks for, in the order a lifter
 * reads it: what to do, then what to load. Kept short because it sits on a
 * collapsed row whose whole job is to be skimmable.
 */
function prescriptionSummary(prescription: SetPrescription): string {
    const count = countSummary(prescription);
    const load = loadSummary(prescription);

    return load === '' ? count : `${count} @ ${load}`;
}

function countSummary(prescription: SetPrescription): string {
    const { measurement } = prescription;
    const side = measurement.countBasis === 'perSide' ? '/side' : '';

    if (measurement.measurement === 'repetitions') {
        return `${measurement.reps} reps${side}`;
    }

    return `${measurement.seconds}s${side}`;
}

function loadSummary(prescription: SetPrescription): string {
    const { load } = prescription;

    if (load.kind === 'none') {
        return '';
    }

    if (load.kind === 'bodyweight') {
        return 'bodyweight';
    }

    const weight = `${load.weight.value}${load.weight.unit}${load.basis === 'perSide' ? '/side' : ''}`;
    return load.kind === 'bodyweightExternal' ? `bodyweight + ${weight}` : weight;
}

export { prescriptionSummary };
