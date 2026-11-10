import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { exerciseDefinition } from './exercise.ts';

const bentOverRow = {
    id: 'ex-bent-over-row',
    name: 'Bent-over row',
    measurements: ['repetitions'],
    executionMode: 'bilateral',
    load: { kind: 'external' },
};

const pullUp = {
    id: 'ex-pull-up',
    name: 'Pull-up',
    measurements: ['repetitions'],
    executionMode: 'bilateral',
    load: { kind: 'bodyweightExternal' },
};

const plank = {
    id: 'ex-plank',
    name: 'Plank',
    measurements: ['duration'],
    executionMode: 'bilateral',
    load: { kind: 'bodyweight' },
};

const halfCrimpHold = {
    id: 'ex-half-crimp-hold',
    name: 'Half-crimp hold',
    measurements: ['duration'],
    executionMode: 'unilateral',
    load: { kind: 'external' },
};

const wristCurl = {
    id: 'ex-wrist-curl',
    name: 'Wrist curl',
    measurements: ['repetitions'],
    executionMode: 'bilateral',
    load: { kind: 'external' },
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
            measurements: ['repetitions'],
            executionMode: 'bilateral',
            load: { kind: 'none' },
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
                load: { kind: 'external', equipment: 'barbell' },
            })
        ).toBeInstanceOf(type.errors);
    });

    it('rejects an empty id or name', () => {
        expect(exerciseDefinition({ ...plank, id: '' })).toBeInstanceOf(type.errors);
        expect(exerciseDefinition({ ...plank, name: '' })).toBeInstanceOf(type.errors);
    });

    it('rejects an unknown measurement type', () => {
        const invalid = { ...plank, measurements: ['distance'] };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects an unknown execution mode', () => {
        const invalid = { ...plank, executionMode: 'alternating' };

        expect(exerciseDefinition(invalid)).toBeInstanceOf(type.errors);
    });

    it('rejects obsolete weight bases and multiple movement choices', () => {
        expect(exerciseDefinition({ ...bentOverRow, load: { kind: 'external', bases: ['perSide'] } })).toBeInstanceOf(
            type.errors
        );
        expect(exerciseDefinition({ ...pullUp, executionModes: ['bilateral', 'unilateral'] })).toBeInstanceOf(
            type.errors
        );
    });

    it('rejects duplicate measurement options', () => {
        const duplicateMeasurement = {
            ...plank,
            measurements: ['duration', 'duration'],
        };

        expect(exerciseDefinition(duplicateMeasurement)).toBeInstanceOf(type.errors);
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
