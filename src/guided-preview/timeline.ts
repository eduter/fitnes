/** A preview-only ordered workout step; persistent workout schemas remain unchanged. */
type GuidedStep =
    | { id: string; kind: 'set'; exercise: string; target: number; load: number }
    | { id: string; kind: 'rest'; seconds: number };

/** Timing defaults on an exercise, or effective timing after workout overrides. */
interface Timing {
    prep: number;
    pace: number;
}

/** Elapsed time uses wall-clock anchors so delayed browser callbacks do not slow a set. */
function elapsedAt(accumulated: number, startedAt: number | undefined, now: number): number {
    return accumulated + (startedAt === undefined ? 0 : Math.max(0, now - startedAt));
}

/** Resolve workout-level overrides independently for each exercise timing field. */
function resolveTiming(defaults: Timing, override: Partial<Timing> | undefined): Timing {
    return { prep: override?.prep ?? defaults.prep, pace: override?.pace ?? defaults.pace };
}

/** Derive preparation, work and completion from a single elapsed duration. */
function guidedPosition(elapsedMs: number, prep: number, duration: number, pace?: number): GuidedPosition {
    const elapsed = Math.max(0, elapsedMs / 1000);
    const work = Math.max(0, elapsed - prep);
    return {
        phase: elapsed < prep ? 'prep' : work < duration ? 'active' : 'done',
        remaining: Math.ceil(Math.max(0, (elapsed < prep ? prep : prep + duration) - elapsed)),
        reps: pace === undefined ? 0 : Math.min(Math.round(duration / pace), Math.floor(work / pace)),
        fraction: Math.min(1, work / duration),
    };
}

/** Derived display values for an in-progress preview step. */
interface GuidedPosition {
    phase: 'prep' | 'active' | 'done';
    remaining: number;
    reps: number;
    fraction: number;
}

export type { GuidedStep, Timing };
export { elapsedAt, guidedPosition, resolveTiming };
