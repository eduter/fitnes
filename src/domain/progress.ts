import type { BodyweightMeasurement } from './bodyweight.ts';
import { convertWeight } from './convertWeight.ts';
import type { WorkoutSession } from './session.ts';
import type { WeightUnit } from './units.ts';

/** Calendar-month ranges shared by progress views. */
const progressRanges = [
    { value: '1', label: 'Last month' },
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
    { value: '12', label: 'Last year' },
    { value: 'all', label: 'All time' },
];

/** Find a local-calendar range boundary, clamping to the target month's last day. */
function rangeStart(range: string, now: number): number {
    if (range === 'all') {
        return 0;
    }
    const date = new Date(now);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() - Number(range));
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

/** Average multiple readings per day before averaging the available days in a seven-calendar-day window. */
function bodyweightProgress(readings: readonly BodyweightMeasurement[], unit: WeightUnit): WeightProgressPoint[] {
    const days = new Map<number, number[]>();
    for (const reading of readings) {
        const at = localDay(reading.measuredAt);
        const values = days.get(at) ?? [];
        values.push(convertWeight(reading, unit).value);
        days.set(at, values);
    }
    const daily = [...days]
        .sort(([a], [b]) => a - b)
        .map(([at, values]) => ({
            at,
            value: values.reduce((sum, value) => sum + value, 0) / values.length,
        }));
    return daily.map((point) => {
        const start = new Date(point.at);
        start.setDate(start.getDate() - 6);
        const window = daily.filter((candidate) => candidate.at >= start.getTime() && candidate.at <= point.at);
        return { ...point, average: window.reduce((sum, value) => sum + value.value, 0) / window.length };
    });
}

/** A daily mean and its trailing seven-calendar-day mean in the display unit. */
interface WeightProgressPoint {
    at: number;
    value: number;
    average: number;
}

/** Select the best Epley estimate per completed session across all workout templates. */
function exerciseProgress(
    sessions: readonly WorkoutSession[],
    exerciseId: string,
    unit: WeightUnit
): ExerciseProgressPoint[] {
    const points: ExerciseProgressPoint[] = [];
    for (const session of sessions) {
        if (session.completedAt === undefined) {
            continue;
        }
        let best: ExerciseProgressPoint | undefined;
        for (const result of session.results) {
            const entry = session.snapshot.sequence.find((item) => item.id === result.sequenceEntryId);
            const set = session.snapshot.sets.find((item) => item.id === entry?.plannedSetId);
            if (set?.exerciseId !== exerciseId) {
                continue;
            }
            const measurement = result.measurement;
            if (measurement.measurement !== 'repetitions') {
                continue;
            }
            // Use the weaker side so asymmetry never inflates the estimate.
            const reps =
                measurement.countBasis === 'total'
                    ? measurement.reps
                    : Math.min(measurement.sides.left, measurement.sides.right);
            if (reps <= 0) {
                continue;
            }
            const load = result.load;
            if (load.kind === 'none') {
                continue;
            }
            let weight = load.kind === 'external' ? convertWeight(load.weight, unit).value : undefined;
            if (load.kind === 'bodyweight' || load.kind === 'bodyweightExternal') {
                if (!session.bodyweight) {
                    continue;
                }
                weight = convertWeight(session.bodyweight, unit).value;
                if (load.kind === 'bodyweightExternal') {
                    weight += convertWeight(load.weight, unit).value;
                }
            }
            if (weight === undefined || weight <= 0) {
                continue;
            }
            const value = reps === 1 ? weight : weight * (1 + reps / 30);
            if (!Number.isFinite(value)) {
                continue;
            }
            if (!best || value > best.value) {
                best = { at: session.startedAt, value, reps, load: weight };
            }
        }
        if (best) {
            points.push(best);
        }
    }
    return points.sort((a, b) => a.at - b.at);
}

/** A session's best estimated max, retaining the actual set for interpretation. */
interface ExerciseProgressPoint {
    at: number;
    value: number;
    reps: number;
    load: number;
}

function localDay(at: number): number {
    const date = new Date(at);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export type { ExerciseProgressPoint, WeightProgressPoint };
export { bodyweightProgress, exerciseProgress, progressRanges, rangeStart };
