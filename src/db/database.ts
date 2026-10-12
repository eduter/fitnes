import type { Table } from 'dexie';
import Dexie from 'dexie';

interface Workout {
    id: string;
    name: string;
    performedAt: number;
    notes: string;
    createdAt: number;
    updatedAt: number;
}

class FitnesDB extends Dexie {
    workouts!: Table<Workout, string>;

    constructor() {
        super('fitnes');

        this.version(1).stores({
            workouts: 'id, performedAt',
        });
    }
}

const db = new FitnesDB();

export { db, FitnesDB };
