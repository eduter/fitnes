import type { Table } from 'dexie';
import Dexie from 'dexie';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import type { WorkoutSession } from '../domain/session.ts';
import { validateWorkoutSession } from '../domain/validateWorkoutSession.ts';
import { validateWorkoutTemplate } from '../domain/validateWorkoutTemplate.ts';
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
        this.version(3)
            .stores({
                workouts: 'id, performedAt',
                exercises: 'id, name',
                templates: 'id, name',
                sessions: 'id, startedAt, completedAt, templateId',
                bodyweightMeasurements: 'id, measuredAt',
            })
            .upgrade(async (transaction) => {
                // Normalize only readable rows; malformed rows remain available to the raw backup exporter.
                const templates = await transaction.table('templates').toArray();
                for (const row of templates) {
                    const parsed = validateWorkoutTemplate(row);
                    if (parsed.ok) {
                        await transaction.table('templates').put(parsed.value);
                    }
                }
                const sessions = await transaction.table('sessions').toArray();
                for (const row of sessions) {
                    const parsed = validateWorkoutSession(row);
                    if (parsed.ok) {
                        await transaction.table('sessions').put(parsed.value);
                    }
                }
            });
    }
}

const db = new FitnesDB();

export { db, FitnesDB };
