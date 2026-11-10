import type { ExerciseDefinition } from './exercise.ts';
import { exerciseId } from './ids.ts';

const bentOverRow: ExerciseDefinition = {
    id: exerciseId.assert('ex-bent-over-row'),
    name: 'Bent-over row',
    measurements: ['repetitions'],
    executionModes: ['bilateral', 'unilateral'],
    load: { kind: 'external' },
};

const pullUp: ExerciseDefinition = {
    id: exerciseId.assert('ex-pull-up'),
    name: 'Pull-up',
    measurements: ['repetitions'],
    executionModes: ['bilateral'],
    load: { kind: 'bodyweightExternal' },
};

const plank: ExerciseDefinition = {
    id: exerciseId.assert('ex-plank'),
    name: 'Plank',
    measurements: ['duration'],
    executionModes: ['bilateral'],
    load: { kind: 'bodyweight' },
};

const halfCrimpHold: ExerciseDefinition = {
    id: exerciseId.assert('ex-half-crimp-hold'),
    name: 'Half-crimp hold',
    measurements: ['duration'],
    executionModes: ['unilateral'],
    load: { kind: 'external' },
};

const wristCurl: ExerciseDefinition = {
    id: exerciseId.assert('ex-wrist-curl'),
    name: 'Wrist curl',
    measurements: ['repetitions'],
    executionModes: ['unilateral'],
    load: { kind: 'external' },
};

const airSquat: ExerciseDefinition = {
    id: exerciseId.assert('ex-air-squat'),
    name: 'Air squat',
    measurements: ['repetitions'],
    executionModes: ['bilateral'],
    load: { kind: 'none' },
};

const dumbbellCurl: ExerciseDefinition = {
    id: exerciseId.assert('ex-dumbbell-curl'),
    name: 'Dumbbell curl',
    measurements: ['repetitions'],
    executionModes: ['unilateral'],
    load: { kind: 'external' },
};

/** Representative catalog entries covering every current capability combination. */
const exampleExercises: ExerciseDefinition[] = [
    bentOverRow,
    pullUp,
    plank,
    halfCrimpHold,
    wristCurl,
    airSquat,
    dumbbellCurl,
];

export { airSquat, bentOverRow, dumbbellCurl, exampleExercises, halfCrimpHold, plank, pullUp, wristCurl };
