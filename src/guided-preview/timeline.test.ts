import { describe, expect, it } from 'vitest';
import { elapsedAt, guidedPosition, resolveTiming } from './timeline.ts';

describe('guided timing', () => {
    it('keeps preparation separate from work and completes reps only at their pace boundary', () => {
        expect(guidedPosition(4999, 5, 12, 3)).toMatchObject({ phase: 'prep', remaining: 1, reps: 0 });
        expect(guidedPosition(5000, 5, 12, 3)).toMatchObject({ phase: 'active', reps: 0 });
        expect(guidedPosition(7999, 5, 12, 3).reps).toBe(0);
        expect(guidedPosition(8000, 5, 12, 3).reps).toBe(1);
        expect(guidedPosition(17000, 5, 12, 3)).toMatchObject({ phase: 'done', remaining: 0, reps: 4 });
    });
    it('catches up after delayed callbacks without exceeding the target', () => {
        expect(guidedPosition(elapsedAt(2000, 1000, 61000), 5, 12, 3)).toMatchObject({ phase: 'done', reps: 4 });
    });
    it('freezes elapsed time when paused and resumes without counting the pause', () => {
        const paused = elapsedAt(0, 1000, 4000);
        expect(elapsedAt(paused, undefined, 90000)).toBe(3000);
        expect(elapsedAt(paused, 90000, 91000)).toBe(4000);
    });
    it('supports zero preparation for rest and immediate work', () => {
        expect(guidedPosition(0, 0, 30)).toMatchObject({ phase: 'active', remaining: 30 });
        expect(guidedPosition(30000, 0, 30)).toMatchObject({ phase: 'done', remaining: 0 });
    });
    it('inherits timing fields independently and preserves an explicit zero prep override', () => {
        expect(resolveTiming({ prep: 8, pace: 3 }, { prep: 0 })).toEqual({ prep: 0, pace: 3 });
        expect(resolveTiming({ prep: 8, pace: 3 }, { pace: 4 })).toEqual({ prep: 8, pace: 4 });
    });
});
