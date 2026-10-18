import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { bodyweightMeasurement, latestBodyweightAtOrBefore } from './bodyweight.ts';

const measurements = [
    { id: 'bw-1', measuredAt: 1_000, value: 80, unit: 'kg' as const },
    { id: 'bw-2', measuredAt: 2_000, value: 79, unit: 'kg' as const },
    { id: 'bw-3', measuredAt: 3_000, value: 78, unit: 'kg' as const },
];

describe('bodyweightMeasurement', () => {
    it('accepts a valid measurement', () => {
        expect(bodyweightMeasurement(measurements[0])).not.toBeInstanceOf(type.errors);
    });

    it('rejects a non-positive or non-finite value', () => {
        for (const value of [0, -1, Number.POSITIVE_INFINITY]) {
            expect(bodyweightMeasurement({ ...measurements[0], value })).toBeInstanceOf(type.errors);
        }
    });

    it('rejects an unsupported unit', () => {
        expect(bodyweightMeasurement({ ...measurements[0], unit: 'stone' })).toBeInstanceOf(type.errors);
    });

    it('rejects a missing timestamp or id', () => {
        expect(bodyweightMeasurement({ value: 80, unit: 'kg' })).toBeInstanceOf(type.errors);
    });
});

describe('latestBodyweightAtOrBefore', () => {
    it('returns the latest measurement at or before the timestamp', () => {
        expect(latestBodyweightAtOrBefore(measurements, 2_500)?.id).toBe('bw-2');
    });

    it('includes a measurement taken exactly at the timestamp', () => {
        expect(latestBodyweightAtOrBefore(measurements, 2_000)?.id).toBe('bw-2');
    });

    it('returns the newest measurement when the timestamp is after all of them', () => {
        expect(latestBodyweightAtOrBefore(measurements, 9_999)?.id).toBe('bw-3');
    });

    it('returns undefined when no measurement is at or before the timestamp', () => {
        expect(latestBodyweightAtOrBefore(measurements, 999)).toBeUndefined();
        expect(latestBodyweightAtOrBefore([], 9_999)).toBeUndefined();
    });

    it('does not read the system clock', () => {
        // Far in the past; a clock-reading implementation would return a recent record.
        expect(latestBodyweightAtOrBefore(measurements, 0)).toBeUndefined();
    });

    it('breaks ties on timestamp in favour of the later entry', () => {
        const tied = [
            { id: 'bw-old', measuredAt: 5_000, value: 80, unit: 'kg' as const },
            { id: 'bw-new', measuredAt: 5_000, value: 81, unit: 'kg' as const },
        ];

        expect(latestBodyweightAtOrBefore(tied, 5_000)?.id).toBe('bw-new');
    });
});
