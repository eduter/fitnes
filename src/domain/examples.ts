import type { ExerciseDefinition } from './exercise.ts';
import { exerciseId } from './ids.ts';

const bentOverRow: ExerciseDefinition = {
    id: exerciseId.assert('ex-bent-over-row'),
    name: 'Bent-over row',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['total', 'perSide'] }],
};

const pullUp: ExerciseDefinition = {
    id: exerciseId.assert('ex-pull-up'),
    name: 'Pull-up',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }, { kind: 'bodyweightExternal', bases: ['total'] }],
};

const plank: ExerciseDefinition = {
    id: exerciseId.assert('ex-plank'),
    name: 'Plank',
    measurements: [{ measurement: 'duration', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }],
};

const halfCrimpHold: ExerciseDefinition = {
    id: exerciseId.assert('ex-half-crimp-hold'),
    name: 'Half-crimp hold',
    measurements: [{ measurement: 'duration', countBasis: 'perSide' }],
    executionModes: ['unilateral'],
    loads: [{ kind: 'external', bases: ['perSide'] }],
};

const wristCurl: ExerciseDefinition = {
    id: exerciseId.assert('ex-wrist-curl'),
    name: 'Wrist curl',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['perSide'] }],
};

const airSquat: ExerciseDefinition = {
    id: exerciseId.assert('ex-air-squat'),
    name: 'Air squat',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'none' }],
};

/** Representative catalog entries covering every current capability combination. */
const exampleExercises: ExerciseDefinition[] = [bentOverRow, pullUp, plank, halfCrimpHold, wristCurl, airSquat];

export { airSquat, bentOverRow, exampleExercises, halfCrimpHold, plank, pullUp, wristCurl };
