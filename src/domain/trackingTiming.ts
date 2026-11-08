import { type } from 'arktype';

/** Optional timing fields shared by catalog defaults and workout-specific overrides. */
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

export type { TrackingTiming };
export { effectiveTiming, trackingTiming };
