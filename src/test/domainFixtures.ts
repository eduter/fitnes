import type { ExerciseDefinition } from '../domain/exercise.ts';
import type { LoadConfiguration, SetPrescription } from '../domain/prescription.ts';
import type { PlannedSet, SequenceEntry, WorkoutTemplate } from '../domain/workoutTemplate.ts';

const bentOverRow: ExerciseDefinition = {
    id: 'ex-bent-over-row',
    name: 'Bent-over row',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['total', 'perHand'] }],
};

const pullUp: ExerciseDefinition = {
    id: 'ex-pull-up',
    name: 'Pull-up',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }, { kind: 'external', bases: ['total'] }],
};

const plank: ExerciseDefinition = {
    id: 'ex-plank',
    name: 'Plank',
    measurements: [{ measurement: 'duration', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }],
};

const halfCrimpHold: ExerciseDefinition = {
    id: 'ex-half-crimp-hold',
    name: 'Half-crimp hold',
    measurements: [{ measurement: 'duration', countBasis: 'perSide' }],
    executionModes: ['unilateral'],
    loads: [{ kind: 'external', bases: ['perHand'] }],
};

const wristCurl: ExerciseDefinition = {
    id: 'ex-wrist-curl',
    name: 'Wrist curl',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['perHand'] }],
};

const airSquat: ExerciseDefinition = {
    id: 'ex-air-squat',
    name: 'Air squat',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [],
};

const examples: ExerciseDefinition[] = [bentOverRow, pullUp, plank, halfCrimpHold, wristCurl];

/** A two-set row template used as a valid baseline; returns a fresh mutable copy each call. */
function rowTemplate(): WorkoutTemplate {
    return {
        id: 'tmpl-rows',
        name: 'Row day',
        schemaVersion: 1,
        exercises: [structuredClone(bentOverRow)],
        sets: [
            {
                id: 'set-1',
                exerciseId: 'ex-bent-over-row',
                prescription: {
                    measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
                    executionMode: 'bilateral',
                    load: { kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } },
                },
            },
            {
                id: 'set-2',
                exerciseId: 'ex-bent-over-row',
                prescription: {
                    measurement: { measurement: 'repetitions', countBasis: 'total', reps: 6 },
                    executionMode: 'bilateral',
                    load: { kind: 'external', basis: 'total', weight: { value: 45, unit: 'kg' } },
                },
            },
        ],
        sequence: [
            { id: 'entry-1', plannedSetId: 'set-1' },
            { id: 'entry-2', plannedSetId: 'set-2' },
        ],
    };
}

/**
 * Replace a set's prescription. The replacement is cast because tests
 * deliberately supply invalid values that validation should reject.
 */
function setPrescription(template: WorkoutTemplate, setId: string, prescription: unknown): void {
    const set = template.sets.find((candidate) => candidate.id === setId);
    if (!set) {
        throw new Error(`no planned set '${setId}' in template`);
    }
    set.prescription = prescription as SetPrescription;
}

/** Replace a set's load configuration; see {@link setPrescription}. */
function setLoad(template: WorkoutTemplate, setId: string, load: unknown): void {
    const set = template.sets.find((candidate) => candidate.id === setId);
    if (!set) {
        throw new Error(`no planned set '${setId}' in template`);
    }
    set.prescription.load = load as LoadConfiguration;
}

/** Append a planned set; see {@link setPrescription}. */
function addSet(template: WorkoutTemplate, set: unknown): void {
    template.sets.push(set as PlannedSet);
}

/** Append an exercise definition. */
function addExercise(template: WorkoutTemplate, exercise: ExerciseDefinition): void {
    template.exercises.push(exercise);
}

/** Make `exercise` the template's only exercise and point every set at it. */
function useOnlyExercise(template: WorkoutTemplate, exercise: ExerciseDefinition): void {
    template.exercises = [structuredClone(exercise)];
    for (const set of template.sets) {
        set.exerciseId = exercise.id;
    }
}

/** Replace the whole execution sequence. */
function setSequence(template: WorkoutTemplate, sequence: unknown[]): void {
    template.sequence = sequence as SequenceEntry[];
}

export {
    addExercise,
    addSet,
    airSquat,
    bentOverRow,
    examples,
    halfCrimpHold,
    plank,
    pullUp,
    rowTemplate,
    setLoad,
    setPrescription,
    setSequence,
    useOnlyExercise,
    wristCurl,
};
