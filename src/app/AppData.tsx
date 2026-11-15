import { batch, createContext, createSignal, type JSX, onCleanup, onMount, useContext } from 'solid-js';
import { onDataChange } from '../db/changes.ts';
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
import { domainTables, readLocalMetadata, synchronizeGuidedEpoch, type WriteGuard } from '../db/syncAdapter.ts';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import type { CollectionName } from '../domain/dataExport.ts';
import { type DataExport, parseDataExport, serializeDataExport } from '../domain/dataExport.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import { generateWorkoutSessionId } from '../domain/generateIds.ts';
import { createSessionFromTemplate, type WorkoutSession } from '../domain/session.ts';
import type { WeightUnit } from '../domain/units.ts';
import type { ValidationResult } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';
import { withExecutionTiming } from '../domain/workoutTiming.ts';
import { seedPreview } from '../preview/seedPreview.ts';
import { stableJson } from '../sync/core/content.ts';
import { localDataInUse, onLocalDataIdle } from '../sync/locks.ts';

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

    let viewEpoch = 0;
    let refreshPending = false;
    let writeQueue: Promise<unknown> = Promise.resolve();
    onMount(() => {
        const stopChanges = onDataChange(() => {
            if (loadState() === 'loading') {
                return;
            }
            refreshPending = true;
            if (!localDataInUse()) {
                void refreshExternal();
            }
        });
        const stopIdle = onLocalDataIdle(() => {
            if (refreshPending) {
                void refreshExternal();
            }
        });
        onCleanup(() => {
            stopChanges();
            stopIdle();
        });
        void initialize();
    });

    async function refreshExternal(): Promise<void> {
        try {
            refreshPending = !(await reloadAll(true));
        } catch (cause) {
            setLoadError(cause instanceof Error ? cause.message : 'Could not refresh local data.');
        }
    }

    function guard(collection: CollectionName, id: string): WriteGuard {
        const values = {
            exercises: exercises(),
            templates: templates(),
            sessions: sessions(),
            bodyweightMeasurements: bodyweightMeasurements(),
        };
        const previous = values[collection].find((row) => row.id === id);
        return { epoch: viewEpoch, previous: previous === undefined ? undefined : stableJson(previous) };
    }

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

    async function reloadAll(external = false): Promise<boolean> {
        const result = await withDbRead(() =>
            db.transaction('r', [...domainTables(db), db.syncLocal], async () => ({
                exercises: await listExercises(db),
                templates: await listTemplates(db),
                sessions: await listSessions(db),
                bodyweight: await listBodyweightMeasurements(db),
                meta: await readLocalMetadata(db),
            }))
        );
        if (external && localDataInUse()) {
            return false;
        }
        synchronizeGuidedEpoch(result.meta.epoch);
        batch(() => {
            viewEpoch = result.meta.epoch;
            setExercises(result.exercises);
            setTemplates(result.templates);
            setSessions(result.sessions);
            setBodyweightMeasurements(result.bodyweight);
        });
        return true;
    }

    function storeRecord<T>(
        write: () => Promise<ValidationResult<T>>,
        reload: () => Promise<unknown>
    ): Promise<ValidationResult<T>> {
        const current = writeQueue
            .catch(() => undefined)
            .then(async () => {
                try {
                    const result = await withDbWrite(write);
                    if (result.ok) {
                        await reload();
                    }
                    return result;
                } catch (cause) {
                    return {
                        ok: false as const,
                        errors: [
                            {
                                path: '',
                                message: cause instanceof Error ? cause.message : 'Could not save local data.',
                            },
                        ],
                    };
                }
            });
        writeQueue = current;
        return current;
    }

    async function removeRecord(write: () => Promise<void>, reload: () => Promise<unknown>): Promise<boolean> {
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
        return storeRecord(() => putExercise(db, input, guard('exercises', (input as { id: string }).id)), reloadAll);
    }

    function removeExercise(id: string): Promise<boolean> {
        return removeRecord(() => deleteExercise(db, id, guard('exercises', id)), reloadAll);
    }

    function saveTemplate(input: unknown): Promise<ValidationResult<WorkoutTemplate>> {
        return storeRecord(() => putTemplate(db, input, guard('templates', (input as { id: string }).id)), reloadAll);
    }

    function removeTemplate(id: string): Promise<boolean> {
        return removeRecord(() => deleteTemplate(db, id, guard('templates', id)), reloadAll);
    }

    function saveSession(input: unknown): Promise<ValidationResult<WorkoutSession>> {
        return storeRecord(() => putSession(db, input, guard('sessions', (input as { id: string }).id)), reloadAll);
    }

    function removeSession(id: string): Promise<boolean> {
        return removeRecord(() => deleteSession(db, id, guard('sessions', id)), reloadAll);
    }

    function saveBodyweight(input: unknown): Promise<ValidationResult<BodyweightMeasurement>> {
        return storeRecord(
            () => putBodyweightMeasurement(db, input, guard('bodyweightMeasurements', (input as { id: string }).id)),
            reloadAll
        );
    }

    function removeBodyweight(id: string): Promise<boolean> {
        return removeRecord(() => deleteBodyweightMeasurement(db, id, guard('bodyweightMeasurements', id)), reloadAll);
    }

    async function startSession(template: WorkoutTemplate): Promise<ValidationResult<WorkoutSession>> {
        const startedAt = Date.now();
        const bodyweight = await latestBodyweight(startedAt);
        return saveSession(
            createSessionFromTemplate({
                id: generateWorkoutSessionId(),
                template: withExecutionTiming(template, template, exercises()),
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
