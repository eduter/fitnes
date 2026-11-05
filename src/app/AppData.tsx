import { createContext, createSignal, onMount, useContext, type JSX } from 'solid-js';
import { db } from '../db/database.ts';
import { seedPreview } from '../preview/seedPreview.ts';
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
import type { WeightUnit } from '../domain/units.ts';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import { parseDataExport, serializeDataExport, type DataExport } from '../domain/dataExport.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import { generateWorkoutSessionId } from '../domain/generateIds.ts';
import { createSessionFromTemplate, type WorkoutSession } from '../domain/session.ts';
import type { ValidationResult } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';

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
    removeExercise: (id: string) => Promise<void>;
    saveTemplate: (input: unknown) => Promise<ValidationResult<WorkoutTemplate>>;
    removeTemplate: (id: string) => Promise<void>;
    saveSession: (input: unknown) => Promise<ValidationResult<WorkoutSession>>;
    removeSession: (id: string) => Promise<void>;
    saveBodyweight: (input: unknown) => Promise<ValidationResult<BodyweightMeasurement>>;
    removeBodyweight: (id: string) => Promise<void>;
    startSession: (
        template: WorkoutTemplate,
        bodyweight?: BodyweightMeasurement
    ) => Promise<ValidationResult<WorkoutSession>>;
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

    async function saveExercise(input: unknown): Promise<ValidationResult<ExerciseDefinition>> {
        const result = await withDbWrite(() => putExercise(db, input));
        if (result.ok) {
            await reloadExercises();
        }
        return result;
    }

    async function removeExercise(id: string): Promise<void> {
        await withDbWrite(() => deleteExercise(db, id));
        await reloadExercises();
    }

    async function saveTemplate(input: unknown): Promise<ValidationResult<WorkoutTemplate>> {
        const result = await withDbWrite(() => putTemplate(db, input));
        if (result.ok) {
            await reloadTemplates();
        }
        return result;
    }

    async function removeTemplate(id: string): Promise<void> {
        await withDbWrite(() => deleteTemplate(db, id));
        await reloadTemplates();
    }

    async function saveSession(input: unknown): Promise<ValidationResult<WorkoutSession>> {
        const result = await withDbWrite(() => putSession(db, input));
        if (result.ok) {
            await reloadSessions();
        }
        return result;
    }

    async function removeSession(id: string): Promise<void> {
        await withDbWrite(() => deleteSession(db, id));
        await reloadSessions();
    }

    async function saveBodyweight(input: unknown): Promise<ValidationResult<BodyweightMeasurement>> {
        const result = await withDbWrite(() => putBodyweightMeasurement(db, input));
        if (result.ok) {
            await reloadBodyweight();
        }
        return result;
    }

    async function removeBodyweight(id: string): Promise<void> {
        await withDbWrite(() => deleteBodyweightMeasurement(db, id));
        await reloadBodyweight();
    }

    async function startSession(
        template: WorkoutTemplate,
        bodyweight?: BodyweightMeasurement
    ): Promise<ValidationResult<WorkoutSession>> {
        return saveSession(
            createSessionFromTemplate({
                id: generateWorkoutSessionId(),
                template,
                startedAt: Date.now(),
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

        await withDbWrite(() => importDatabase(db, parsed.value));
        await reloadAll();
        return parsed;
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

export { AppDataProvider, useAppData };
export type { AppData };
