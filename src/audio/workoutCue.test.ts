import { expect, it } from 'vitest';
import { workoutCue, type WorkoutSoundState } from './workoutCue.ts';

const ready: WorkoutSoundState = { started: false, running: false, phase: 'prep', count: 3 };
it('ticks preparation, signals start, ticks work and signals completion once', () => {
    const prep = { ...ready, started: true, running: true };
    const active = { ...prep, phase: 'active' as const, count: 0 };
    const done = { ...active, running: false, phase: 'done' as const, count: 5 };
    expect(workoutCue(ready, prep)).toBe('prepare');
    expect(workoutCue(prep, { ...prep, count: 2 })).toBe('prepare');
    expect(workoutCue(prep, active)).toBe('start');
    expect(workoutCue(active, { ...active, count: 1 })).toBe('tick');
    expect(workoutCue(active, done)).toBe('complete');
    expect(workoutCue(done, done)).toBeUndefined();
});
it('does not repeat ticks on pause/resume or replay restored work', () => {
    const active = { ...ready, started: true, running: true, phase: 'active' as const, count: 2 };
    expect(workoutCue(undefined, active)).toBeUndefined();
    expect(workoutCue(active, { ...active, running: false })).toBeUndefined();
    expect(workoutCue({ ...active, running: false }, active)).toBeUndefined();
    expect(workoutCue(active, active)).toBeUndefined();
    expect(workoutCue(ready, { ...active, count: 0 })).toBe('start');
});
