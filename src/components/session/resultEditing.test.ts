import { describe, expect, it } from 'vitest';
import type { ActualResult } from '../../domain/session.ts';
import {
    formatSetReference,
    resultCells,
    summarizeTargets,
    withSideCount,
    withTotalCount,
    withWeight,
} from './resultEditing.ts';

function result(overrides: Partial<ActualResult> = {}): ActualResult {
    return {
        sequenceEntryId: 'entry-1',
        measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
        load: { kind: 'external', weight: { value: 60, unit: 'kg' } },
        completedAt: 2_000,
        ...overrides,
    };
}

describe('resultCells', () => {
    it('offers one count input and a weight input for a total set with external load', () => {
        expect(resultCells(result())).toEqual({ count: 'total', unit: 'reps', load: 'weight' });
    });

    it('offers one input per side for a per-side set', () => {
        const cells = resultCells(
            result({
                measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9 } },
                load: { kind: 'external', weight: { value: 12, unit: 'kg' } },
            })
        );

        expect(cells).toEqual({ count: 'perSide', unit: 'reps', load: 'weight' });
    });

    it('shows a bodyweight marker instead of a weight input when the set carries no external load', () => {
        expect(resultCells(result({ load: { kind: 'bodyweight' } }))).toEqual({
            count: 'total',
            unit: 'reps',
            load: 'bodyweight',
        });
    });

    it('shows no load cell when the set has no load', () => {
        expect(resultCells(result({ load: { kind: 'none' } })).load).toBe('none');
    });

    it('treats a weighted bodyweight set as an editable weight', () => {
        expect(
            resultCells(result({ load: { kind: 'bodyweightExternal', weight: { value: 5, unit: 'kg' } } })).load
        ).toBe('weight');
    });

    it('labels duration sets in seconds', () => {
        expect(
            resultCells(result({ measurement: { measurement: 'duration', countBasis: 'total', seconds: 45 } })).unit
        ).toBe('seconds');
    });
});

describe('withTotalCount', () => {
    it('replaces the repetition count', () => {
        expect(withTotalCount(result(), 9).measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 9,
        });
    });

    it('replaces the duration', () => {
        const duration = result({ measurement: { measurement: 'duration', countBasis: 'total', seconds: 45 } });
        expect(withTotalCount(duration, 60).measurement).toEqual({
            measurement: 'duration',
            countBasis: 'total',
            seconds: 60,
        });
    });

    it('leaves a per-side result untouched', () => {
        const perSide = result({
            measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9 } },
        });
        expect(withTotalCount(perSide, 5)).toEqual(perSide);
    });
});

describe('withSideCount', () => {
    it('replaces one side and keeps the other', () => {
        const perSide = result({
            measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 10 } },
        });

        expect(withSideCount(perSide, 'right', 9).measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 10, right: 9 },
        });
    });

    it('replaces one side of a per-side duration', () => {
        const perSide = result({
            measurement: { measurement: 'duration', countBasis: 'perSide', sides: { left: 10, right: 10 } },
        });

        expect(withSideCount(perSide, 'left', 12).measurement).toEqual({
            measurement: 'duration',
            countBasis: 'perSide',
            sides: { left: 12, right: 10 },
        });
    });

    it('leaves a total-counted result untouched', () => {
        const total = result();
        expect(withSideCount(total, 'left', 3)).toEqual(total);
    });
});

describe('withWeight', () => {
    it('replaces the external mass and keeps the unit', () => {
        const next = withWeight(result(), 62.5);
        expect(next.load).toEqual({ kind: 'external', weight: { value: 62.5, unit: 'kg' } });
    });

    it('replaces the added mass of a weighted bodyweight set', () => {
        const weighted = result({
            load: { kind: 'bodyweightExternal', weight: { value: 5, unit: 'kg' } },
        });
        expect(withWeight(weighted, 7.5).load).toEqual({
            kind: 'bodyweightExternal',
            weight: { value: 7.5, unit: 'kg' },
        });
    });

    it('leaves a bodyweight-only result untouched', () => {
        const bodyweight = result({ load: { kind: 'bodyweight' } });
        expect(withWeight(bodyweight, 10)).toEqual(bodyweight);
    });
});

describe('formatSetReference', () => {
    it('renders an external load and a repetition count', () => {
        expect(formatSetReference(result())).toBe('60kg×8');
    });

    it('renders a bodyweight set without inventing a mass', () => {
        expect(formatSetReference(result({ load: { kind: 'bodyweight' } }))).toBe('BW×8');
    });

    it('renders added weight on a weighted bodyweight set', () => {
        const weighted = result({
            load: { kind: 'bodyweightExternal', weight: { value: 5, unit: 'kg' } },
        });
        expect(formatSetReference(weighted)).toBe('BW+5kg×8');
    });

    it('renders per-side counts as left/right', () => {
        const perSide = result({
            measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 9 } },
            load: { kind: 'external', weight: { value: 12, unit: 'kg' } },
        });
        expect(formatSetReference(perSide)).toBe('12kg×10/9');
    });

    it('marks a duration set in seconds', () => {
        const duration = result({ measurement: { measurement: 'duration', countBasis: 'total', seconds: 45 } });
        expect(formatSetReference(duration)).toBe('60kg×45s');
    });

    it('omits the load prefix when the set has no load', () => {
        const unloaded = result({
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 20 },
            load: { kind: 'none' },
        });
        expect(formatSetReference(unloaded)).toBe('20');
    });
});

describe('summarizeTargets', () => {
    it('collapses identical targets into a multiplier', () => {
        expect(summarizeTargets(['8 reps', '8 reps', '8 reps'])).toBe('8 reps × 3');
    });

    it('lists targets that differ, in sequence', () => {
        expect(summarizeTargets(['5 reps', '5 reps', '4 reps'])).toBe('5 reps · 5 reps · 4 reps');
    });

    it('keeps a single target as itself', () => {
        expect(summarizeTargets(['45s'])).toBe('45s × 1');
    });

    it('renders nothing for an empty block', () => {
        expect(summarizeTargets([])).toBe('');
    });
});

it('shows assistance without a double sign in previous performance', () => {
    expect(
        formatSetReference(result({ load: { kind: 'bodyweightExternal', weight: { value: -10, unit: 'kg' } } }))
    ).toBe('BW-10kg×8');
});
