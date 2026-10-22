import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { exerciseDefinition } from './exercise.ts';

const bentOverRow = {
    id: 'ex-bent-over-row',
    name: 'Bent-over row',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['total', 'perSide'] }],
};

const pullUp = {
    id: 'ex-pull-up',
    name: 'Pull-up',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }, { kind: 'bodyweightExternal', bases: ['total'] }],
};

const plank = {
    id: 'ex-plank',
    name: 'Plank',
    measurements: [{ measurement: 'duration', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }],
};

const halfCrimpHold = {
    id: 'ex-half-crimp-hold',
    name: 'Half-crimp hold',
    measurements: [{ measurement: 'duration', countBasis: 'perSide' }],
    executionModes: ['unilateral'],
    loads: [{ kind: 'external', bases: ['perSide'] }],
};

const wristCurl = {
    id: 'ex-wrist-curl',
    name: 'Wrist curl',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['perSide'] }],
};

describe('exerciseDefinition', () => {
    it('accepts the required example capabilities', () => {
        for (const exercise of [bentOverRow, pullUp, plank, halfCrimpHold, wristCurl]) {
            expect(exerciseDefinition(exercise)).not.toBeInstanceOf(type.errors);
        }
    });

    it('accepts an exercise that explicitly uses no load', () => {
        const bodyweightSquat = {
            id: 'ex-air-squat',
            name: 'Air squat',
            measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
            executionModes: ['bilateral'],
            loads: [{ kind: 'none' }],
        };

        expect(exerciseDefinition(bodyweightSquat)).not.toBeInstanceOf(type.errors);
    });

    it('accepts optional descriptive metadata', () => {
        const withDescription = { ...plank, description: 'Isometric core hold' };

        expect(exerciseDefinition(withDescription)).not.toBeInstanceOf(type.errors);
    });

    it('rejects unknown top-level and nested fields', () => {
        expect(exerciseDefinition({ ...plank, aliases: ['front plank'] })).toBeInstanceOf(type.errors);
        expect(
            exerciseDefinition({
                ...bentOverRow,
                loads: [{ kind: 'external', bases: ['total'], equipment: 'barbell' }],
            })
        ).toBeInstanceOf(type.errors);
    });

    it('rejects an empty id or name', () => {
        expect(exerciseDefinition({ ...plank, id: '' })).toBeInstanceOf(type.errors);
        expect(exerciseDefinition({ ...plank, name: '' })).toBeInstanceOf(type.errors);
    });

    it('rejects an unknown measurement type', () => {
        const invalid = { ...plank, measurements: [{ measurement: 'distance', countBasis: 'total' }] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects an unknown execution mode', () => {
        const invalid = { ...plank, executionModes: ['alternating'] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects an unknown load basis', () => {
        const invalid = { ...bentOverRow, loads: [{ kind: 'external', bases: ['each-side-ish'] }] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects external load without any basis', () => {
        const invalid = { ...bentOverRow, loads: [{ kind: 'external', bases: [] }] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects bodyweight plus external load without any basis', () => {
        const invalid = { ...pullUp, loads: [{ kind: 'bodyweightExternal', bases: [] }] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects duplicate measurement options and execution modes', () => {
        const duplicateMeasurement = {
            ...plank,
            measurements: [
                { measurement: 'duration', countBasis: 'total' },
                { measurement: 'duration', countBasis: 'total' },
            ],
        };
        const duplicateMode = { ...plank, executionModes: ['bilateral', 'bilateral'] };

        expect(exerciseDefinition(duplicateMeasurement)).toBeInstanceOf(type.errors);
        expect(exerciseDefinition(duplicateMode)).toBeInstanceOf(type.errors);
    });

    it('rejects a measurement with no capabilities', () => {
        const invalid = { ...plank, measurements: [] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects an exercise with no load capabilities', () => {
        const invalid = { ...plank, loads: [] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });
});
