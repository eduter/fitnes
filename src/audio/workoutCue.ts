/** Pick one cue for a displayed counter transition, without replaying paused or restored work. */
function workoutCue(previous: WorkoutSoundState | undefined, current: WorkoutSoundState): WorkoutCue | undefined {
    if (!previous || !current.started) {
        return undefined;
    }
    if (current.phase === 'done') {
        return previous.started && previous.phase !== 'done' ? 'complete' : undefined;
    }
    if (!current.running) {
        return undefined;
    }
    if (current.phase === 'active' && (!previous.started || previous.phase === 'prep')) {
        return 'start';
    }
    if (!previous.started || current.count !== previous.count) {
        return current.phase === 'prep' ? 'prepare' : 'tick';
    }
    return undefined;
}

/** Counter snapshot shared by timed and repetition-based guidance. */
interface WorkoutSoundState {
    started: boolean;
    running: boolean;
    phase: 'prep' | 'active' | 'done';
    count: number;
}
/** The four cues used by guided sets. */
type WorkoutCue = 'prepare' | 'start' | 'tick' | 'complete';

export { workoutCue };
export type { WorkoutCue, WorkoutSoundState };
