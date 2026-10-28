import { describe, expect, it } from 'vitest';
import {
    generateBodyweightMeasurementId,
    generateExerciseId,
    generatePlannedSetId,
    generateSequenceEntryId,
    generateWorkoutSessionId,
    generateWorkoutTemplateId,
} from './generateIds.ts';
import {
    bodyweightMeasurementId,
    exerciseId,
    plannedSetId,
    sequenceEntryId,
    workoutSessionId,
    workoutTemplateId,
} from './ids.ts';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateIds', () => {
    it('returns unique branded v4 ids for each entity kind', () => {
        const exercise = generateExerciseId();
        const plannedSet = generatePlannedSetId();
        const sequenceEntry = generateSequenceEntryId();
        const template = generateWorkoutTemplateId();
        const session = generateWorkoutSessionId();
        const bodyweight = generateBodyweightMeasurementId();

        expect(exercise).toMatch(uuidV4);
        expect(plannedSet).toMatch(uuidV4);
        expect(sequenceEntry).toMatch(uuidV4);
        expect(template).toMatch(uuidV4);
        expect(session).toMatch(uuidV4);
        expect(bodyweight).toMatch(uuidV4);

        expect(exerciseId.assert(exercise)).toBe(exercise);
        expect(plannedSetId.assert(plannedSet)).toBe(plannedSet);
        expect(sequenceEntryId.assert(sequenceEntry)).toBe(sequenceEntry);
        expect(workoutTemplateId.assert(template)).toBe(template);
        expect(workoutSessionId.assert(session)).toBe(session);
        expect(bodyweightMeasurementId.assert(bodyweight)).toBe(bodyweight);

        expect(generateExerciseId()).not.toBe(exercise);
        expect(generatePlannedSetId()).not.toBe(plannedSet);
        expect(generateSequenceEntryId()).not.toBe(sequenceEntry);
        expect(generateWorkoutTemplateId()).not.toBe(template);
        expect(generateWorkoutSessionId()).not.toBe(session);
        expect(generateBodyweightMeasurementId()).not.toBe(bodyweight);
    });
});
