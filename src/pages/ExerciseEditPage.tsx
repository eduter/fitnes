import { Button, ConfirmDialog, Popover } from '../components/Controls/index.ts';
import { A, useNavigate, useParams } from '@solidjs/router';
import { Show, createEffect, createSignal, type JSX } from 'solid-js';
import { DraftGuard } from '../app/DraftGuard.tsx';
import { useAppData } from '../app/AppData.tsx';
import { ExerciseForm } from '../components/exercise/ExerciseForm.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { duplicateExercise } from '../domain/duplicateExercise.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import { generateExerciseId } from '../domain/generateIds.ts';
import type { ValidationIssue } from '../domain/validation.ts';

/** Create or edit one catalog exercise. Edits persist as soon as the document is valid. */
function ExerciseEditPage(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();
    const app = useAppData();
    const isNew = () => params.id === undefined;

    const [discarded, setDiscarded] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    const [editorOpen, setEditorOpen] = createSignal(false);
    let trigger: HTMLElement | undefined;
    const [draft, setDraft] = createSignal<ExerciseDefinition>(blankExercise());
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const [created, setCreated] = createSignal(false);
    const [hydratedFor, setHydratedFor] = createSignal<string | undefined>(undefined);
    const [duplicating, setDuplicating] = createSignal(false);
    const [pendingEdit, setPendingEdit] = createSignal<ExerciseDefinition | undefined>(undefined);

    // Ids are non-empty, so '' can mark the create route without colliding with
    // a real one. Keying on the route (not a one-shot flag) re-hydrates when
    // navigating between two exercises, which the router serves with this same
    // component instance.
    const routeKey = () => params.id ?? '';

    createEffect(() => {
        const key = routeKey();
        if (hydratedFor() === key) {
            return;
        }

        if (isNew()) {
            setDraft(blankExercise());
            setCreated(false);
            setHydratedFor(key);
            return;
        }

        const found = app.exercises().find((exercise) => exercise.id === params.id);
        if (found) {
            setDraft(structuredClone(found));
            setCreated(true);
            setHydratedFor(key);
        } else if (app.loadState() === 'ready') {
            setHydratedFor(key);
        }
    });

    async function persist(next: ExerciseDefinition): Promise<void> {
        setDraft(next);
        if (!created()) {
            setErrors([]);
            return;
        }

        // Hold the edit while a duplicate is in flight; `duplicate` folds it into
        // the copy once the copy exists, so it cannot reach the source document.
        if (duplicating()) {
            setPendingEdit(next);
            return;
        }

        const result = await app.saveExercise(next);
        setErrors(result.ok ? [] : result.errors);
    }

    async function create(): Promise<void> {
        const result = await app.saveExercise(draft());
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setCreated(true);
        setErrors([]);
        navigate(`/exercises/${result.value.id}`, { replace: true });
    }

    async function duplicate(): Promise<void> {
        const copy = duplicateExercise(draft());

        setDuplicating(true);
        setPendingEdit(undefined);
        const result = await app.saveExercise(copy);
        const edit = pendingEdit();
        setPendingEdit(undefined);
        setDuplicating(false);

        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors([]);

        if (edit) {
            await app.saveExercise({ ...edit, id: copy.id });
        }

        navigate(`/exercises/${copy.id}`);
    }

    async function remove(): Promise<void> {
        if (await app.removeExercise(draft().id)) {
            setDiscarded(true);
            navigate('/exercises');
        }
    }

    const missing = () =>
        hydratedFor() !== undefined && !isNew() && !app.exercises().some((exercise) => exercise.id === params.id);

    return (
        <section class="page">
            <DraftGuard
                dirty={!discarded() && (created() ? errors().length > 0 : draft().name !== '' || !!draft().description)}
            />
            <ConfirmDialog
                open={confirming()}
                onOpenChange={setConfirming}
                message={`Delete ${draft().name || 'exercise'}?`}
                onConfirm={() => void remove()}
                trigger={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            />
            <ValidationErrors errors={errors()} />
            <PageHeader
                title={created() ? draft().name || 'Exercise' : 'New exercise'}
                actions={
                    <Show when={created()}>
                        <div class="button-row">
                            <Button type="button" disabled={duplicating()} onPress={() => void duplicate()}>
                                Duplicate
                            </Button>
                            <Button
                                type="button"
                                onPress={(event) => {
                                    trigger = event.currentTarget;
                                    setConfirming(true);
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </Show>
                }
            />
            <Show
                when={!missing()}
                fallback={
                    <p class="muted">
                        Exercise not found. <A href="/exercises">Back to catalog</A>
                    </p>
                }
            >
                <p>
                    {draft()
                        .measurements.map(
                            (item) =>
                                `${item.measurement === 'repetitions' ? 'Reps' : 'Time'}${item.countBasis === 'perSide' ? '/side' : ''}`
                        )
                        .join(' · ')}
                </p>
                <p>{draft().executionModes.join(' · ')}</p>
                <p>
                    {draft()
                        .loads.map((item) => (item.kind === 'bodyweightExternal' ? 'Bodyweight + external' : item.kind))
                        .join(' · ')}
                </p>
                <p class="muted">{draft().description || 'No description.'}</p>
                <div class="button-row">
                    <Button
                        onPress={(event) => {
                            trigger = event.currentTarget;
                            setEditorOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Button onPress={() => navigate('/exercises')}>{created() ? 'End' : 'Cancel'}</Button>
                </div>
                <Popover
                    open={editorOpen()}
                    onOpenChange={setEditorOpen}
                    label="Exercise details"
                    anchor={() => trigger}
                    returnFocus={() => trigger}
                    mount={document.getElementById('root') ?? undefined}
                >
                    <ExerciseForm value={draft()} errors={errors()} onChange={(next) => void persist(next)} />
                    <div class="editor-actions">
                        <Button onPress={() => setEditorOpen(false)}>End</Button>
                    </div>
                </Popover>
                <Show when={!created()}>
                    <Button type="button" onPress={() => void create()}>
                        Create
                    </Button>
                </Show>
            </Show>
        </section>
    );
}

function blankExercise(): ExerciseDefinition {
    return {
        id: generateExerciseId(),
        name: '',
        measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
        executionModes: ['bilateral'],
        loads: [{ kind: 'none' }],
    };
}

export { ExerciseEditPage };
