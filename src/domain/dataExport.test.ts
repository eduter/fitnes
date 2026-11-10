import { describe, expect, it } from 'vitest';
import { type DataExport, parseDataExport, serializeDataExport } from './dataExport.ts';
import { rowTemplate, setPrescription, useOnlyExercise } from '../test/domainFixtures.ts';
import { dumbbellCurl, exampleExercises, halfCrimpHold, pullUp } from './examples.ts';
import { createSessionFromTemplate } from './session.ts';

function validExport(overrides: Partial<DataExport> = {}): DataExport {
    return {
        schemaVersion: 1,
        exercises: [pullUp],
        templates: [],
        sessions: [],
        bodyweightMeasurements: [],
        ...overrides,
    };
}

describe('parseDataExport', () => {
    it('accepts a complete document and returns each collection parsed', () => {
        const input = validExport({ exercises: [pullUp, halfCrimpHold] });

        const parsed = parseDataExport(input);

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }
        expect(parsed.value.exercises).toHaveLength(2);
        expect(parsed.value.templates).toEqual([]);
    });

    it('parses raw JSON text, so a pasted file needs no separate decode step', () => {
        const parsed = parseDataExport(serializeDataExport(validExport()));

        expect(parsed.ok).toBe(true);
    });

    it('treats a missing collection as empty, so a partial export still loads', () => {
        const parsed = parseDataExport({ schemaVersion: 1, exercises: [pullUp] });

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }
        expect(parsed.value.templates).toEqual([]);
        expect(parsed.value.sessions).toEqual([]);
        expect(parsed.value.bodyweightMeasurements).toEqual([]);
    });

    it('reports invalid JSON with a single unlocated issue rather than throwing', () => {
        const parsed = parseDataExport('{ not json');

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.errors).toHaveLength(1);
        expect(parsed.errors[0].path).toBe('');
        expect(parsed.errors[0].message).toContain('not valid JSON');
    });

    it('reports the position of a bad row, not just the collection', () => {
        const parsed = parseDataExport(validExport({ exercises: [pullUp, { id: 'ex-broken', name: '' }] }));

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.errors.some((issue) => issue.path.startsWith('exercises[1]'))).toBe(true);
    });

    it('locates a nested problem by its full path, so a malformed side is findable', () => {
        const template = rowTemplate();
        const broken = structuredClone(template);
        broken.sets[0].prescription = {
            measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 8, right: -1 } },
            executionMode: 'bilateral',
            load: { kind: 'none' },
        };

        const parsed = parseDataExport(validExport({ templates: [broken] }));

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.errors.some((issue) => issue.path.includes('templates[0].sets[0].prescription'))).toBe(true);
    });

    it('reports every bad row at once rather than stopping at the first', () => {
        const parsed = parseDataExport(
            validExport({ exercises: [{ id: 'a' }, { id: 'b' }], templates: [{ id: 'c' }] })
        );

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.errors.some((issue) => issue.path.startsWith('exercises[0]'))).toBe(true);
        expect(parsed.errors.some((issue) => issue.path.startsWith('exercises[1]'))).toBe(true);
        expect(parsed.errors.some((issue) => issue.path.startsWith('templates[0]'))).toBe(true);
    });

    it('refuses a document from a newer schema rather than dropping what it cannot read', () => {
        const parsed = parseDataExport(validExport({ schemaVersion: 99 }));

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.errors[0].path).toBe('schemaVersion');
    });

    it('accepts an older schema version, which this build still understands', () => {
        const parsed = parseDataExport(validExport({ schemaVersion: 1 }));

        expect(parsed.ok).toBe(true);
    });

    it('rejects a document that is not an object at all', () => {
        expect(parseDataExport([1, 2, 3]).ok).toBe(false);
        expect(parseDataExport(null).ok).toBe(false);
        expect(parseDataExport('"a string"').ok).toBe(false);
    });

    it('rejects a collection that is not an array', () => {
        const parsed = parseDataExport({ schemaVersion: 1, exercises: 'nope' });

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.errors.some((issue) => issue.path === 'exercises')).toBe(true);
    });

    it('accepts a session holding a per-side result, so exported history round-trips', () => {
        const template = rowTemplate();
        useOnlyExercise(template, dumbbellCurl);
        const prescription = {
            measurement: { measurement: 'repetitions', countBasis: 'perSide', reps: 8 },
            executionMode: 'unilateral',
            load: { kind: 'external', weight: { value: 12, unit: 'kg' } },
        } as const;
        setPrescription(template, 'set-1', structuredClone(prescription));
        setPrescription(template, 'set-2', structuredClone(prescription));
        const session = createSessionFromTemplate({ id: 'sess-1', template, startedAt: 1_000 });
        session.results = [
            {
                sequenceEntryId: 'entry-1',
                measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 0, right: 8 } },
                load: { kind: 'external', weight: { value: 12, unit: 'kg' } },
                completedAt: 2_000,
            },
        ];

        const parsed = parseDataExport(validExport({ sessions: [session] }));

        expect(parsed.ok).toBe(true);
    });

    it('accepts the seeded catalog, so a fresh export always re-imports', () => {
        const parsed = parseDataExport(validExport({ exercises: exampleExercises }));

        expect(parsed.ok).toBe(true);
    });
});

describe('serializeDataExport', () => {
    it('round-trips through parse unchanged', () => {
        const original = validExport({
            exercises: [pullUp],
            bodyweightMeasurements: [{ id: 'bw-1', measuredAt: 1_000, value: 80, unit: 'kg' }],
        });

        const parsed = parseDataExport(serializeDataExport(original));

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }
        expect(parsed.value).toEqual(original);
    });
});
