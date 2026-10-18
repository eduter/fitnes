import { type } from 'arktype';
import { bodyweightMeasurementId } from './ids.ts';
import { epochMillis, positiveFinite, weightUnit } from './units.ts';

/** A timestamped bodyweight reading. Body mass must be positive; a unit is always present. */
const bodyweightMeasurement = type({
    id: bodyweightMeasurementId,
    measuredAt: epochMillis,
    value: positiveFinite,
    unit: weightUnit,
});
type BodyweightMeasurement = typeof bodyweightMeasurement.infer;

/**
 * Select the latest measurement at or before `at`. Ties on `measuredAt` resolve
 * to the later entry in `measurements`, so the most recently added reading
 * wins. The timestamp is a parameter rather than the system clock so callers
 * control which instant they are asking about.
 */
function latestBodyweightAtOrBefore(
    measurements: BodyweightMeasurement[],
    at: number
): BodyweightMeasurement | undefined {
    let latest: BodyweightMeasurement | undefined;

    for (const measurement of measurements) {
        if (measurement.measuredAt > at) {
            continue;
        }
        if (latest === undefined || measurement.measuredAt >= latest.measuredAt) {
            latest = measurement;
        }
    }

    return latest;
}

export { bodyweightMeasurement, latestBodyweightAtOrBefore };
export type { BodyweightMeasurement };
