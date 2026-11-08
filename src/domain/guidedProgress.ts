/** Elapsed time uses wall-clock anchors so delayed browser callbacks do not slow a set. */
function elapsedAt(accumulated: number, startedAt: number | undefined, now: number): number {
    return accumulated + (startedAt === undefined ? 0 : Math.max(0, now - startedAt));
}

/** Derive preparation, work and completion from a single elapsed duration. */
function guidedPosition(elapsedMs: number, prep: number, duration: number, pace?: number): GuidedPosition {
    const elapsed = Math.max(0, elapsedMs / 1000);
    const work = Math.max(0, elapsed - prep);
    return {
        phase: elapsed < prep ? 'prep' : work + 1e-9 < duration ? 'active' : 'done',
        remaining: Math.ceil(Math.max(0, (elapsed < prep ? prep : prep + duration) - elapsed)),
        reps: pace === undefined ? 0 : Math.min(Math.round(duration / pace), Math.floor((work + 1e-9) / pace)),
        fraction: Math.min(1, work / duration),
    };
}

/** Derived display values for an in-progress workout step. */
interface GuidedPosition {
    phase: 'prep' | 'active' | 'done';
    remaining: number;
    reps: number;
    fraction: number;
}

export { elapsedAt, guidedPosition };
