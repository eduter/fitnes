import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { exerciseDefinition } from './exercise.ts';

const bentOverRow = {
    id: 'ex-bent-over-row',
    name: 'Bent-over row',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['total', 'perHand'] }],
};

const pullUp = {
    id: 'ex-pull-up',
    name: 'Pull-up',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral'],
    loads: [{ kind: 'bodyweight' }, { kind: 'external', bases: ['total'] }],
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
    loads: [{ kind: 'external', bases: ['perHand'] }],
};

const wristCurl = {
    id: 'ex-wrist-curl',
    name: 'Wrist curl',
    measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
    executionModes: ['bilateral', 'unilateral'],
    loads: [{ kind: 'external', bases: ['perHand'] }],
};

describe('exerciseDefinition', () => {
    it('accepts the required example capabilities', () => {
        for (const exercise of [bentOverRow, pullUp, plank, halfCrimpHold, wristCurl]) {
            expect(exerciseDefinition(exercise)).not.toBeInstanceOf(type.errors);
        }
    });

    it('accepts an exercise that uses no load', () => {
        const bodyweightSquat = {
            id: 'ex-air-squat',
            name: 'Air squat',
            measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
            executionModes: ['bilateral'],
            loads: [],
        };

        expect(exerciseDefinition(bodyweightSquat)).not.toBeInstanceOf(type.errors);
    });

    it('accepts optional descriptive metadata', () => {
        const withDescription = { ...plank, description: 'Isometric core hold' };

        expect(exerciseDefinition(withDescription)).not.toBeInstanceOf(type.errors);
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
});
