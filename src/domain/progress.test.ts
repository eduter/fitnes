import { expect, it } from 'vitest';
import { rowTemplate } from '../test/domainFixtures.ts';
import { bodyweightProgress, exerciseProgress, rangeStart } from './progress.ts';
import type { WorkoutSession } from './session.ts';

it('averages days equally, converts units, and uses prior readings before filtering', () => {
    const day = (n: number) => new Date(2026, 0, n, 12).getTime();
    const readings = [
        { id: 'bw-1', measuredAt: day(1), value: 100, unit: 'kg' as const },
        { id: 'bw-2', measuredAt: day(1) + 1, value: 80, unit: 'kg' as const },
        { id: 'bw-3', measuredAt: day(7), value: 100, unit: 'kg' as const },
        { id: 'bw-4', measuredAt: day(8), value: 100, unit: 'kg' as const },
    ];
    const points = bodyweightProgress(readings, 'kg');
    expect(points.map((p) => p.value)).toEqual([90, 100, 100]);
    expect(points.map((p) => p.average)).toEqual([90, 95, 100]);
    expect(bodyweightProgress(readings, 'lb')[0]?.value).toBeCloseTo(198.416, 2);
});

it('clamps month ranges instead of overflowing short months', () => {
    expect(new Date(rangeStart('1', new Date(2026, 2, 31).getTime())).getDate()).toBe(28);
});

it('tracks exercise IDs across workouts, retains high reps, and ignores unfinished sessions', () => {
    const session: WorkoutSession = {
        id: 'sess-1',
        startedAt: 100,
        completedAt: 200,
        snapshot: rowTemplate(),
        results: [
            {
                sequenceEntryId: 'entry-1',
                completedAt: 150,
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 20 },
                load: { kind: 'external', weight: { value: 40, unit: 'kg' } },
            },
        ],
    };
    const second = structuredClone(session);
    second.id = 'sess-2';
    second.startedAt = 300;
    second.snapshot.id = 'tmpl-other';
    const unfinished = structuredClone(session);
    delete unfinished.completedAt;
    const points = exerciseProgress([second, unfinished, session], 'ex-bent-over-row', 'kg');
    expect(points).toHaveLength(2);
    expect(points[0]?.value).toBeCloseTo(66.6667);
    expect(points[0]?.reps).toBe(20);
    expect(points[0]?.load).toBe(40);
});

it('combines mixed-unit bodyweight and assistance and uses the weaker side', () => {
    const session: WorkoutSession = {
        id: 'sess-assisted',
        startedAt: 100,
        completedAt: 200,
        snapshot: rowTemplate(),
        bodyweight: { value: 220.462262, unit: 'lb' },
        results: [
            {
                sequenceEntryId: 'entry-1',
                completedAt: 150,
                measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 5 } },
                load: { kind: 'bodyweightExternal', weight: { value: -20, unit: 'kg' } },
            },
        ],
    };
    const point = exerciseProgress([session], 'ex-bent-over-row', 'kg')[0];
    expect(point?.load).toBeCloseTo(80);
    expect(point?.reps).toBe(5);
    expect(point?.value).toBeCloseTo(80 * (1 + 5 / 30));
    delete session.bodyweight;
    expect(exerciseProgress([session], 'ex-bent-over-row', 'kg')).toEqual([]);
});

it('does not extrapolate a single rep or graph skipped, timed, or unloaded work', () => {
    const session: WorkoutSession = {
        id: 'sess-single',
        startedAt: 100,
        completedAt: 200,
        snapshot: rowTemplate(),
        results: [
            {
                sequenceEntryId: 'entry-1',
                completedAt: 150,
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 1 },
                load: { kind: 'external', weight: { value: 40, unit: 'kg' } },
            },
        ],
    };
    expect(exerciseProgress([session], 'ex-bent-over-row', 'kg')[0]?.value).toBe(40);
    session.results[0].measurement = { measurement: 'repetitions', countBasis: 'total', reps: 0 };
    expect(exerciseProgress([session], 'ex-bent-over-row', 'kg')).toEqual([]);
    session.results[0].measurement = { measurement: 'duration', countBasis: 'total', seconds: 30 };
    expect(exerciseProgress([session], 'ex-bent-over-row', 'kg')).toEqual([]);
    session.results[0].measurement = { measurement: 'repetitions', countBasis: 'total', reps: 10 };
    session.results[0].load = { kind: 'none' };
    expect(exerciseProgress([session], 'ex-bent-over-row', 'kg')).toEqual([]);
});
