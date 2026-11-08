import { createContext, createSignal, type JSX, onMount, useContext } from 'solid-js';
import { db } from '../db/database.ts';
import { waitForDb, withDbRead, withDbWrite } from '../db/dbLifecycle.ts';
import {
    deleteBodyweightMeasurement,
    deleteExercise,
    deleteSession,
    deleteTemplate,
    exportDatabase,
    importDatabase,
    latestStoredBodyweight,
    listBodyweightMeasurements,
    listExercises,
    listSessions,
    listTemplates,
    putBodyweightMeasurement,
    putExercise,
    putSession,
    putTemplate,
    seedExampleExercises,
} from '../db/repository.ts';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import { type DataExport, parseDataExport, serializeDataExport } from '../domain/dataExport.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import { generateWorkoutSessionId } from '../domain/generateIds.ts';
import { createSessionFromTemplate, type WorkoutSession } from '../domain/session.ts';
import type { WeightUnit } from '../domain/units.ts';
import type { ValidationResult } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';
import { seedPreview } from '../preview/seedPreview.ts';

type LoadState = 'loading' | 'ready' | 'error';

interface AppData {
    massUnit: () => WeightUnit;
    setMassUnit: (unit: WeightUnit) => void;
    loadState: () => LoadState;
    loadError: () => string | null;
    exercises: () => ExerciseDefinition[];
    templates: () => WorkoutTemplate[];
    sessions: () => WorkoutSession[];
    bodyweightMeasurements: () => BodyweightMeasurement[];
    saveExercise: (input: unknown) => Promise<ValidationResult<ExerciseDefinition>>;
    removeExercise: (id: string) => Promise<boolean>;
    saveTemplate: (input: unknown) => Promise<ValidationResult<WorkoutTemplate>>;
    removeTemplate: (id: string) => Promise<boolean>;
    saveSession: (input: unknown) => Promise<ValidationResult<WorkoutSession>>;
    removeSession: (id: string) => Promise<boolean>;
    saveBodyweight: (input: unknown) => Promise<ValidationResult<BodyweightMeasurement>>;
    removeBodyweight: (id: string) => Promise<boolean>;
    startSession: (template: WorkoutTemplate) => Promise<ValidationResult<WorkoutSession>>;
    latestBodyweight: (at: number) => Promise<BodyweightMeasurement | undefined>;
    exportData: () => Promise<string>;
    importData: (input: unknown) => Promise<ValidationResult<DataExport>>;
}

interface AppDataProviderProps {
    children?: JSX.Element;
}

const AppDataContext = createContext<AppData>();

/** Load IndexedDB collections and expose persisted catalog/history operations. */
function AppDataProvider(props: AppDataProviderProps): JSX.Element {
    const [massUnit, setUnit] = createSignal<WeightUnit>(
        localStorage.getItem('fitnes-mass-unit') === 'lb' ? 'lb' : 'kg'
    );
    function setMassUnit(unit: WeightUnit): void {
        localStorage.setItem('fitnes-mass-unit', unit);
        setUnit(unit);
    }
    const [loadState, setLoadState] = createSignal<LoadState>('loading');
    const [loadError, setLoadError] = createSignal<string | null>(null);
    const [exercises, setExercises] = createSignal<ExerciseDefinition[]>([]);
    const [templates, setTemplates] = createSignal<WorkoutTemplate[]>([]);
    const [sessions, setSessions] = createSignal<WorkoutSession[]>([]);
    const [bodyweightMeasurements, setBodyweightMeasurements] = createSignal<BodyweightMeasurement[]>([]);

    onMount(() => {
        void initialize();
    });

    async function initialize(): Promise<void> {
        try {
            await waitForDb();
            if (import.meta.env.VITE_PREVIEW_DATA === 'true') {
                await withDbWrite(() => seedPreview(db));
            }
            await withDbWrite(() => seedExampleExercises(db));
            await reloadAll();
            setLoadState('ready');
            setLoadError(null);
        } catch (error) {
            setLoadState('error');
            setLoadError(error instanceof Error ? error.message : 'Failed to load local data');
        }
    }

    async function reloadAll(): Promise<void> {
        await Promise.all([reloadExercises(), reloadTemplates(), reloadSessions(), reloadBodyweight()]);
    }

    async function reloadExercises(): Promise<void> {
        setExercises(await withDbRead(() => listExercises(db)));
    }

    async function reloadTemplates(): Promise<void> {
        setTemplates(await withDbRead(() => listTemplates(db)));
    }

    async function reloadSessions(): Promise<void> {
        setSessions(await withDbRead(() => listSessions(db)));
    }

    async function reloadBodyweight(): Promise<void> {
        setBodyweightMeasurements(await withDbRead(() => listBodyweightMeasurements(db)));
    }

    async function storeRecord<T>(
        write: () => Promise<ValidationResult<T>>,
        reload: () => Promise<void>
    ): Promise<ValidationResult<T>> {
        try {
            const result = await withDbWrite(write);
            if (result.ok) {
                await reload();
            }
            return result;
        } catch (cause) {
            return {
                ok: false,
                errors: [{ path: '', message: cause instanceof Error ? cause.message : 'Could not save local data.' }],
            };
        }
    }

    async function removeRecord(write: () => Promise<void>, reload: () => Promise<void>): Promise<boolean> {
        try {
            await withDbWrite(write);
            await reload();
            setLoadError(null);
            return true;
        } catch (cause) {
            setLoadError(cause instanceof Error ? cause.message : 'Could not delete local data.');
            return false;
        }
    }

    function saveExercise(input: unknown): Promise<ValidationResult<ExerciseDefinition>> {
        return storeRecord(() => putExercise(db, input), reloadExercises);
    }

    function removeExercise(id: string): Promise<boolean> {
        return removeRecord(() => deleteExercise(db, id), reloadExercises);
    }

    function saveTemplate(input: unknown): Promise<ValidationResult<WorkoutTemplate>> {
        return storeRecord(() => putTemplate(db, input), reloadTemplates);
    }

    function removeTemplate(id: string): Promise<boolean> {
        return removeRecord(() => deleteTemplate(db, id), reloadTemplates);
    }

    function saveSession(input: unknown): Promise<ValidationResult<WorkoutSession>> {
        return storeRecord(() => putSession(db, input), reloadSessions);
    }

    function removeSession(id: string): Promise<boolean> {
        return removeRecord(() => deleteSession(db, id), reloadSessions);
    }

    function saveBodyweight(input: unknown): Promise<ValidationResult<BodyweightMeasurement>> {
        return storeRecord(() => putBodyweightMeasurement(db, input), reloadBodyweight);
    }

    function removeBodyweight(id: string): Promise<boolean> {
        return removeRecord(() => deleteBodyweightMeasurement(db, id), reloadBodyweight);
    }

    async function startSession(template: WorkoutTemplate): Promise<ValidationResult<WorkoutSession>> {
        const startedAt = Date.now();
        const bodyweight = await latestBodyweight(startedAt);
        return saveSession(
            createSessionFromTemplate({
                id: generateWorkoutSessionId(),
                template,
                startedAt,
                bodyweight,
            })
        );
    }

    async function latestBodyweight(at: number): Promise<BodyweightMeasurement | undefined> {
        return withDbRead(() => latestStoredBodyweight(db, at));
    }

    /** Read the whole database as JSON text. Reads raw rows, so it works even when loading fails. */
    async function exportData(): Promise<string> {
        return serializeDataExport(await withDbRead(() => exportDatabase(db)));
    }

    /**
     * Replace the whole database from an export document. The document is
     * validated before anything is written, so a malformed file leaves the
     * current data untouched.
     */
    async function importData(input: unknown): Promise<ValidationResult<DataExport>> {
        const parsed = parseDataExport(input);
        if (!parsed.ok) {
            return parsed;
        }

        const result = await storeRecord(async () => {
            await importDatabase(db, parsed.value);
            return parsed;
        }, reloadAll);
        if (result.ok) {
            // Timer drafts belong to the replaced database, even when imported sessions reuse IDs.
            try {
                for (const key of Object.keys(localStorage)) {
                    if (key.startsWith('fitnes-guided:')) {
                        localStorage.removeItem(key);
                    }
                }
            } catch {
                /* IndexedDB remains authoritative when local storage is disabled */
            }
            setLoadState('ready');
            setLoadError(null);
        }
        return result;
    }

    const value: AppData = {
        massUnit,
        setMassUnit,
        loadState,
        loadError,
        exercises,
        templates,
        sessions,
        bodyweightMeasurements,
        saveExercise,
        removeExercise,
        saveTemplate,
        removeTemplate,
        saveSession,
        removeSession,
        saveBodyweight,
        removeBodyweight,
        startSession,
        latestBodyweight,
        exportData,
        importData,
    };

    return <AppDataContext.Provider value={value}>{props.children}</AppDataContext.Provider>;
}

/** Access persisted FitNES data. Must be used under `AppDataProvider`. */
function useAppData(): AppData {
    const value = useContext(AppDataContext);
    if (!value) {
        throw new Error('useAppData must be used under AppDataProvider');
    }
    return value;
}

export type { AppData };
export { AppDataProvider, useAppData };
