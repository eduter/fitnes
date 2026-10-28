import { type } from 'arktype';
import type { BodyweightMeasurement } from './bodyweight.ts';
import { type WorkoutTemplate, workoutTemplate } from './workoutTemplate.ts';
import { epochMillis, positiveFinite, type Weight, weightUnit } from './units.ts';
import { bodyweightMeasurementId, sequenceEntryId, workoutSessionId, workoutTemplateId } from './ids.ts';
import { actualMeasurement, type LoadConfiguration, loadConfiguration } from './prescription.ts';

/**
 * A bodyweight snapshot taken when a session begins. The value and unit are
 * copied, not referenced, so later edits to bodyweight history cannot change a
 * past session. `measurementId` and `measuredAt` are kept for traceability.
 */
const bodyweightSnapshot = type({
    value: positiveFinite,
    unit: weightUnit,
    'source?': type({
        measurementId: bodyweightMeasurementId,
        measuredAt: epochMillis,
    }).onUndeclaredKey('reject'),
}).onDeepUndeclaredKey('reject');
type BodyweightSnapshot = typeof bodyweightSnapshot.infer;

/** The recorded performance for one sequence occurrence, using the same measurement and load semantics as a prescription. */
const actualResult = type({
    sequenceEntryId,
    measurement: actualMeasurement,
    load: loadConfiguration,
    completedAt: epochMillis,
}).onDeepUndeclaredKey('reject');
type ActualResult = typeof actualResult.infer;

/**
 * A historical record of a workout performed. It holds an independent snapshot
 * of the plan and the performance recorded against sequence occurrences, so
 * the same exercise appearing more than once stays distinguishable. The
 * snapshot is a full template copy, not a reference to a mutable template.
 */
const workoutSession = type({
    id: workoutSessionId,
    'templateId?': workoutTemplateId,
    startedAt: epochMillis,
    'completedAt?': epochMillis,
    snapshot: workoutTemplate,
    'bodyweight?': bodyweightSnapshot,
    results: actualResult.array(),
}).onDeepUndeclaredKey('reject');
type WorkoutSession = typeof workoutSession.infer;

/** Inputs needed to start a session from a template. */
interface StartSessionInput {
    id: WorkoutSession['id'];
    template: WorkoutTemplate;
    startedAt: number;
    bodyweight?: BodyweightMeasurement;
}

/**
 * Start a session from a template. The plan is deep-copied with
 * `structuredClone`, so mutating the source template afterwards cannot change
 * the session snapshot. The bodyweight measurement, when supplied, is copied
 * by value and keeps its source ID and timestamp for traceability.
 */
function createSessionFromTemplate(input: StartSessionInput): WorkoutSession {
    const { id, template, startedAt, bodyweight } = input;

    const session: WorkoutSession = {
        id,
        templateId: template.id,
        startedAt,
        snapshot: structuredClone(template),
        results: [],
    };

    if (bodyweight) {
        session.bodyweight = {
            value: bodyweight.value,
            unit: bodyweight.unit,
            source: {
                measurementId: bodyweight.id,
                measuredAt: bodyweight.measuredAt,
            },
        };
    }

    return session;
}

/**
 * Total load for a set when the external load is expressed as a total. Returns
 * `undefined` for per-hand and per-side bases, because totalling those needs a
 * side count the load configuration does not carry, and for a unit mismatch
 * between bodyweight and external load. Bodyweight and external load stay
 * separate in the stored result; this helper only derives a combined figure.
 */
function totalLoad(load: LoadConfiguration, bodyweight: Weight | undefined): Weight | undefined {
    if (load.kind === 'none') {
        return undefined;
    }

    if (load.kind === 'bodyweight') {
        return bodyweight;
    }

    if (load.kind === 'external') {
        return load.basis === 'total' ? load.weight : undefined;
    }

    if (load.basis !== 'total' || bodyweight === undefined) {
        return undefined;
    }

    if (bodyweight.unit !== load.weight.unit) {
        return undefined;
    }

    return { value: bodyweight.value + load.weight.value, unit: bodyweight.unit };
}

export { actualResult, bodyweightSnapshot, createSessionFromTemplate, totalLoad, workoutSession };
export type { ActualResult, BodyweightSnapshot, StartSessionInput, WorkoutSession };
