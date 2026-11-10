import { describe, expect, it } from 'vitest';
import {
    addExercise,
    addSet,
    plank,
    pullUp,
    rowTemplate,
    setLoad,
    setPrescription,
    setSequence,
    useOnlyExercise,
} from '../test/domainFixtures.ts';
import { validateWorkoutTemplate } from './validateWorkoutTemplate.ts';

function pathsOf(input: unknown): string[] {
    const result = validateWorkoutTemplate(input);

    if (result.ok) {
        throw new Error('expected validation to fail');
    }
    return result.errors.map((issue) => issue.path);
}

const rowPrescription = (reps: number, kg: number): unknown => ({
    measurement: { measurement: 'repetitions', countBasis: 'total', reps },
    executionMode: 'bilateral',
    load: { kind: 'external', weight: { value: kg, unit: 'kg' } },
});

describe('validateWorkoutTemplate', () => {
    it('accepts a valid template', () => {
        expect(validateWorkoutTemplate(rowTemplate()).ok).toBe(true);
    });

    it('rejects a duration prescription for a repetition-only exercise', () => {
        const template = rowTemplate();
        setPrescription(template, 'set-1', {
            measurement: { measurement: 'duration', countBasis: 'total', seconds: 30 },
            executionMode: 'bilateral',
            load: { kind: 'external', weight: { value: 40, unit: 'kg' } },
        });

        expect(pathsOf(template)).toContain('sets[0].prescription.measurement');
    });

    it('rejects a repetition prescription for a duration-only exercise', () => {
        const template = rowTemplate();
        useOnlyExercise(template, plank);
        addSet(template, {
            id: 'set-3',
            exerciseId: 'ex-plank',
            prescription: {
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 10 },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            },
        });
        setSequence(template, [{ id: 'entry-1', plannedSetId: 'set-3' }]);

        expect(pathsOf(template)).toContain('sets[0].prescription.measurement');
    });

    it('rejects an execution mode the exercise does not support', () => {
        const template = rowTemplate();
        useOnlyExercise(template, { ...structuredClone(pullUp), executionMode: 'bilateral' });
        setPrescription(template, 'set-1', {
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
            executionMode: 'unilateral',
            load: { kind: 'bodyweight' },
        });

        expect(pathsOf(template)).toContain('sets[0].prescription.executionMode');
    });

    it('rejects external load for an exercise that disallows it', () => {
        const template = rowTemplate();
        useOnlyExercise(template, plank);

        expect(pathsOf(template)).toContain('sets[0].prescription.load');
    });

    it('rejects bodyweight load for an exercise that disallows it', () => {
        const template = rowTemplate();
        setLoad(template, 'set-1', { kind: 'bodyweight' });

        expect(pathsOf(template)).toContain('sets[0].prescription.load');
    });

    it('rejects an obsolete per-side load basis', () => {
        const template = rowTemplate();
        setLoad(template, 'set-1', { kind: 'external', basis: 'perSide', weight: { value: 20, unit: 'kg' } });

        expect(pathsOf(template).some((path) => path.startsWith('sets[0].prescription.load'))).toBe(true);
    });

    it('accepts a weighted pull-up as bodyweight plus external load', () => {
        const template = rowTemplate();
        useOnlyExercise(template, pullUp);
        const prescription = {
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
            executionMode: 'bilateral',
            load: { kind: 'bodyweightExternal', weight: { value: 10, unit: 'kg' } },
        };
        setPrescription(template, 'set-1', prescription);
        setPrescription(template, 'set-2', prescription);

        expect(validateWorkoutTemplate(template).ok).toBe(true);
    });

    it('rejects external-only load when an exercise requires bodyweight plus external load', () => {
        const template = rowTemplate();
        useOnlyExercise(template, pullUp);
        setPrescription(template, 'set-1', {
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
            executionMode: 'bilateral',
            load: { kind: 'external', weight: { value: 10, unit: 'kg' } },
        });
        setPrescription(template, 'set-2', {
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 5 },
            executionMode: 'bilateral',
            load: { kind: 'bodyweight' },
        });

        expect(pathsOf(template)).toContain('sets[0].prescription.load');
    });

    it('accepts sets of the same exercise with different targets', () => {
        const template = rowTemplate();
        setPrescription(template, 'set-2', rowPrescription(4, 50));

        expect(validateWorkoutTemplate(template).ok).toBe(true);
    });

    it('accepts an arbitrarily interleaved execution sequence', () => {
        const template = rowTemplate();
        addExercise(template, structuredClone(plank));
        addSet(template, {
            id: 'set-3',
            exerciseId: 'ex-plank',
            prescription: {
                measurement: { measurement: 'duration', countBasis: 'total', seconds: 60 },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            },
        });
        addSet(template, {
            id: 'set-4',
            exerciseId: 'ex-plank',
            prescription: {
                measurement: { measurement: 'duration', countBasis: 'total', seconds: 45 },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            },
        });
        // row, plank, row, plank — sets from two exercises interleaved, none repeated
        setSequence(template, [
            { id: 'entry-1', plannedSetId: 'set-1' },
            { id: 'entry-2', plannedSetId: 'set-3' },
            { id: 'entry-3', plannedSetId: 'set-2' },
            { id: 'entry-4', plannedSetId: 'set-4' },
        ]);

        expect(validateWorkoutTemplate(template).ok).toBe(true);
    });

    it('rejects the same planned set occurring twice in a sequence', () => {
        const template = rowTemplate();
        setSequence(template, [
            { id: 'entry-1', plannedSetId: 'set-1' },
            { id: 'entry-2', plannedSetId: 'set-2' },
            { id: 'entry-3', plannedSetId: 'set-1' },
        ]);

        expect(pathsOf(template)).toEqual(['sequence[2].plannedSetId']);
    });

    it('rejects a planned set omitted from the execution sequence', () => {
        const template = rowTemplate();
        setSequence(template, [{ id: 'entry-1', plannedSetId: 'set-1' }]);

        expect(pathsOf(template)).toEqual(['sets[1].id']);
    });

    it('rejects an empty sequence when the template has planned sets', () => {
        const template = rowTemplate();
        setSequence(template, []);

        expect(pathsOf(template)).toEqual(['sets[0].id', 'sets[1].id']);
    });

    it('rejects duplicate exercise, set, and sequence-entry ids', () => {
        const template = rowTemplate();
        addExercise(template, structuredClone(template.exercises[0]));
        addSet(template, structuredClone(template.sets[0]));
        setSequence(template, [...template.sequence, { id: 'entry-1', plannedSetId: 'set-2' }]);

        const paths = pathsOf(template);

        expect(paths).toContain('exercises[1].id');
        expect(paths).toContain('sets[2].id');
        expect(paths).toContain('sequence[2].id');
    });

    it('rejects a dangling exercise reference', () => {
        const template = rowTemplate();
        template.sets[0].exerciseId = 'ex-missing';

        expect(pathsOf(template)).toEqual(['sets[0].exerciseId']);
    });

    it('rejects a dangling planned-set reference', () => {
        const template = rowTemplate();
        setSequence(template, [{ id: 'entry-1', plannedSetId: 'set-missing' }]);

        expect(pathsOf(template)).toContain('sequence[0].plannedSetId');
    });

    it('rejects an unsupported weight unit', () => {
        const template = rowTemplate();
        setLoad(template, 'set-1', { kind: 'external', weight: { value: 40, unit: 'stone' } });

        expect(pathsOf(template)).toContain('sets[0].prescription.load.weight.unit');
    });

    it('rejects a negative or non-finite external load', () => {
        const negative = rowTemplate();
        setLoad(negative, 'set-1', { kind: 'external', weight: { value: -5, unit: 'kg' } });
        const infinite = rowTemplate();
        setLoad(infinite, 'set-1', {
            kind: 'external',
            weight: { value: Number.POSITIVE_INFINITY, unit: 'kg' },
        });

        expect(pathsOf(negative)).toContain('sets[0].prescription.load.weight.value');
        expect(pathsOf(infinite)).toContain('sets[0].prescription.load.weight.value');
    });

    it('accepts a zero external load as no added weight', () => {
        const template = rowTemplate();
        setLoad(template, 'set-1', { kind: 'external', weight: { value: 0, unit: 'kg' } });

        expect(validateWorkoutTemplate(template).ok).toBe(true);
    });

    it('rejects non-positive or fractional repetitions', () => {
        for (const reps of [0, -1, 2.5]) {
            const template = rowTemplate();
            setPrescription(template, 'set-1', rowPrescription(reps, 40));

            expect(pathsOf(template)).toContain('sets[0].prescription.measurement.reps');
        }
    });

    it('rejects non-positive or non-finite durations', () => {
        for (const seconds of [0, -30, Number.POSITIVE_INFINITY]) {
            const template = rowTemplate();
            useOnlyExercise(template, plank);
            setPrescription(template, 'set-1', {
                measurement: { measurement: 'duration', countBasis: 'total', seconds },
                executionMode: 'bilateral',
                load: { kind: 'bodyweight' },
            });

            expect(pathsOf(template)).toContain('sets[0].prescription.measurement.seconds');
        }
    });

    it('rejects a template missing required fields', () => {
        const { sequence: _sequence, ...withoutSequence } = rowTemplate();

        expect(validateWorkoutTemplate(withoutSequence).ok).toBe(false);
    });

    it('rejects unknown fields anywhere in the document', () => {
        const atTopLevel = { ...rowTemplate(), owner: 'user-1' };
        const nested = rowTemplate();
        const load = nested.sets[0].prescription.load;
        if (load.kind !== 'external') {
            throw new Error('row fixture must use external load');
        }
        const withUnknown = { ...load, equipment: 'barbell' };
        setLoad(nested, 'set-1', withUnknown);

        expect(validateWorkoutTemplate(atTopLevel).ok).toBe(false);
        expect(validateWorkoutTemplate(nested).ok).toBe(false);
    });

    it('rejects a non-object input', () => {
        expect(validateWorkoutTemplate(null).ok).toBe(false);
        expect(validateWorkoutTemplate('nope').ok).toBe(false);
    });

    it('survives a JSON round-trip and re-validates', () => {
        const template = rowTemplate();
        const serialized = JSON.parse(JSON.stringify(template));

        const result = validateWorkoutTemplate(serialized);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toEqual(template);
        }
    });
});
