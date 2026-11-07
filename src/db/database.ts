import type { Table } from 'dexie';
import Dexie from 'dexie';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import type { WorkoutSession } from '../domain/session.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';

class FitnesDB extends Dexie {
    exercises!: Table<ExerciseDefinition, string>;
    templates!: Table<WorkoutTemplate, string>;
    sessions!: Table<WorkoutSession, string>;
    bodyweightMeasurements!: Table<BodyweightMeasurement, string>;

    constructor() {
        super('fitnes');

        this.version(1).stores({
            workouts: 'id, performedAt',
        });

        this.version(2).stores({
            // Keep legacy rows intact; this UI does not reinterpret old workout documents
            workouts: 'id, performedAt',
            exercises: 'id, name',
            templates: 'id, name',
            sessions: 'id, startedAt, completedAt, templateId',
            bodyweightMeasurements: 'id, measuredAt',
        });
    }
}

const db = new FitnesDB();

export { db, FitnesDB };
