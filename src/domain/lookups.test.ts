import { describe, expect, it } from 'vitest';
import { airSquat, plank, pullUp, rowTemplate } from '../test/domainFixtures.ts';
import { createSessionFromTemplate } from './session.ts';
import { findOccurrence, groupSequenceEntries, sessionBodyweightWeight, templateUsesBodyweight } from './lookups.ts';

describe('findOccurrence', () => {
    it('resolves the sequence entry, planned set, and exercise', () => {
        const template = rowTemplate();
        const occurrence = findOccurrence(template, 'entry-2');

        expect(occurrence?.entry.id).toBe('entry-2');
        expect(occurrence?.set.id).toBe('set-2');
        expect(occurrence?.exercise.id).toBe('ex-bent-over-row');
    });

    it('returns undefined for an unknown sequence entry', () => {
        expect(findOccurrence(rowTemplate(), 'entry-missing')).toBeUndefined();
    });
});

describe('templateUsesBodyweight', () => {
    it('is false for external-only templates and true when any set uses body mass', () => {
        expect(templateUsesBodyweight(rowTemplate())).toBe(false);

        const template = rowTemplate();
        template.exercises = [structuredClone(pullUp)];
        template.sets[0].exerciseId = pullUp.id;
        template.sets[0].prescription.load = { kind: 'bodyweight' };
        template.sets[1].exerciseId = pullUp.id;
        template.sets[1].prescription.load = {
            kind: 'bodyweightExternal',
            basis: 'total',
            weight: { value: 10, unit: 'kg' },
        };

        expect(templateUsesBodyweight(template)).toBe(true);
        expect(templateUsesBodyweight({ ...template, sets: [template.sets[0]] })).toBe(true);
    });

    it('is false for a no-load exercise', () => {
        const template = rowTemplate();
        template.exercises = [structuredClone(plank)];
        template.sets[0].prescription.load = { kind: 'none' };
        expect(templateUsesBodyweight(template)).toBe(false);
    });
});

describe('sessionBodyweightWeight', () => {
    it('returns the snapshotted mass when present', () => {
        const session = createSessionFromTemplate({
            id: 'sess-1',
            template: rowTemplate(),
            startedAt: 1_000,
            bodyweight: { id: 'bw-1', measuredAt: 1_000, value: 80, unit: 'kg' },
        });

        expect(sessionBodyweightWeight(session)).toEqual({ value: 80, unit: 'kg' });
        expect(
            sessionBodyweightWeight(createSessionFromTemplate({ id: 'sess-2', template: rowTemplate(), startedAt: 1 }))
        ).toBeUndefined();
    });
});

describe('groupSequenceEntries', () => {
    it('collects consecutive sets of one exercise into a single block', () => {
        const blocks = groupSequenceEntries(rowTemplate());

        expect(blocks).toHaveLength(1);
        expect(blocks[0]?.map((occurrence) => occurrence.entry.id)).toEqual(['entry-1', 'entry-2']);
    });

    it('starts a new block when the exercise changes', () => {
        const template = rowTemplate();
        template.exercises = [structuredClone(pullUp), structuredClone(airSquat)];
        template.sets[0].exerciseId = pullUp.id;
        template.sets[1].exerciseId = airSquat.id;

        const blocks = groupSequenceEntries(template);

        expect(blocks.map((block) => block.map((occurrence) => occurrence.exercise.name))).toEqual([
            ['Pull-up'],
            ['Air squat'],
        ]);
    });

    it('keeps an interleaved plan interleaved rather than regrouping it', () => {
        const template = rowTemplate();
        template.exercises = [structuredClone(pullUp), structuredClone(airSquat)];
        template.sets[0].exerciseId = pullUp.id;
        template.sets[1].exerciseId = airSquat.id;
        template.sequence.push({ id: 'entry-3', plannedSetId: 'set-3' });
        template.sets.push({
            id: 'set-3',
            exerciseId: pullUp.id,
            prescription: structuredClone(template.sets[0]!.prescription),
        });

        const blocks = groupSequenceEntries(template);

        expect(blocks.map((block) => block[0]?.exercise.name)).toEqual(['Pull-up', 'Air squat', 'Pull-up']);
    });

    it('returns nothing for an empty plan', () => {
        const template = rowTemplate();
        template.sets = [];
        template.sequence = [];

        expect(groupSequenceEntries(template)).toEqual([]);
    });
});
