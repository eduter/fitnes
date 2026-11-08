import { type } from 'arktype';

/** Optional timing fields shared by catalog defaults and per-set overrides. */
const trackingTiming = type({
    'prepSeconds?': 'number.integer >= 0 & number <= 999',
    'secondsPerRep?': 'number >= 0.1 & number <= 99.9',
}).onUndeclaredKey('reject');
type TrackingTiming = typeof trackingTiming.infer;

/** Resolve each override independently; old plans use editable initial defaults. */
function effectiveTiming(defaults?: TrackingTiming, overrides?: TrackingTiming): Required<TrackingTiming> {
    return {
        prepSeconds: overrides?.prepSeconds ?? defaults?.prepSeconds ?? 5,
        secondsPerRep: overrides?.secondsPerRep ?? defaults?.secondsPerRep ?? 3,
    };
}

/** Keep only values that differ from the exercise defaults; an untouched/default set has no timing property. */
function normalizeSetTiming(
    defaults: TrackingTiming | undefined,
    values: TrackingTiming | undefined
): TrackingTiming | undefined {
    const inherited = effectiveTiming(defaults);
    const next: TrackingTiming = {};
    for (const field of ['prepSeconds', 'secondsPerRep'] as const) {
        if (values?.[field] !== undefined && values[field] !== inherited[field]) {
            next[field] = values[field];
        }
    }
    return Object.keys(next).length ? next : undefined;
}

export type { TrackingTiming };
export { effectiveTiming, normalizeSetTiming, trackingTiming };
