import { exerciseCopy } from '../copy/exercise.ts';
import { createEffect, createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button, ConfirmDialog } from '../components/Controls/index.ts';
import { blankExercise, ExerciseEditor } from '../components/exercise/ExerciseEditor.tsx';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { duplicateExercise } from '../domain/duplicateExercise.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';

/** Browse the exercise library and edit directly in a window over the selected row. */
function ExerciseListPage(props: ExerciseListPageProps): JSX.Element {
    const app = useAppData();
    const [ids, setIds] = createSignal<string[]>([]);
    const [reveal, setReveal] = createSignal<string>();
    createEffect(() => {
        const current: string[] = app.exercises().map((item) => item.id);
        setIds((previous) => [
            ...previous.filter((id) => current.includes(id)),
            ...current.filter((id) => !previous.includes(id)),
        ]);
    });
    const [editing, setEditing] = createSignal<ExerciseDefinition>();
    const [creating, setCreating] = createSignal(false);
    const [editorOpen, setEditorOpen] = createSignal(false);
    const [selected, setSelected] = createSignal<ExerciseDefinition>();
    const [deleting, setDeleting] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [status, setStatus] = createSignal('');
    let editorTrigger: HTMLElement | undefined;
    let handledRoute: string | undefined;

    function edit(value: ExerciseDefinition, trigger?: HTMLElement): void {
        editorTrigger = trigger;
        setEditing(value);
        setCreating(false);
        setEditorOpen(true);
    }
    function create(trigger?: HTMLElement): void {
        editorTrigger = trigger;
        setEditing(blankExercise());
        setCreating(true);
        setEditorOpen(true);
    }

    // Retain existing deep links while presenting the same library and popover as ordinary row editing
    createEffect(() => {
        const key = props.initialExerciseId ?? (props.createOnMount ? 'new' : undefined);
        if (!key || key === handledRoute || app.loadState() !== 'ready') {
            return;
        }
        handledRoute = key;
        if (props.createOnMount) {
            create();
            return;
        }
        const exercise = app.exercises().find((item) => item.id === key);
        if (exercise) {
            edit(exercise);
        } else {
            setStatus('Exercise not found.');
        }
    });

    async function duplicate(source: ExerciseDefinition, trigger: HTMLElement): Promise<void> {
        if (!source || busy()) {
            return;
        }
        setBusy(true);
        const result = await app.saveExercise(duplicateExercise(source));
        setBusy(false);
        if (!result.ok) {
            setStatus(result.errors.map((error) => error.message).join('. '));
            return;
        }
        setReveal(result.value.id);
        edit(result.value, trigger);
    }
    async function remove(): Promise<void> {
        const source = selected();
        if (!source) {
            return;
        }
        if (await app.removeExercise(source.id)) {
            setStatus(`Deleted ${source.name}.`);
        }
    }

    return (
        <section class="page">
            <PageHeader
                title="Exercises"
                actions={<Button onPress={(event) => create(event.currentTarget)}>Create</Button>}
            />
            <Show when={status()}>
                <p role="status">{status()}</p>
            </Show>
            <PagedList
                label="Exercises"
                items={ids()}
                reveal={reveal()}
                rowHeight={64}
                empty="No exercises yet. Create your first exercise."
            >
                {(id) => (
                    <Show when={app.exercises().find((item) => item.id === id)}>
                        {(item) => (
                            <article>
                                <h2 class="list-item__title">{item().name}</h2>
                                <p class="muted">{exerciseSummary(item())}</p>
                                <div class="button-row">
                                    <Button
                                        aria-label={`Edit ${item().name}`}
                                        onPress={(event) => edit(item(), event.currentTarget)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        aria-label={`Duplicate ${item().name}`}
                                        disabled={busy()}
                                        onPress={(event) => void duplicate(item(), event.currentTarget)}
                                    >
                                        Duplicate
                                    </Button>
                                    <Button
                                        aria-label={`Delete ${item().name}`}
                                        onPress={() => {
                                            setSelected(item());
                                            setDeleting(true);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </article>
                        )}
                    </Show>
                )}
            </PagedList>
            <ExerciseEditor
                open={editorOpen()}
                creating={creating()}
                value={editing()}
                trigger={() => editorTrigger}
                onOpenChange={setEditorOpen}
                onCreated={(value) => {
                    setReveal(value.id);
                    setStatus(`Created ${value.name}.`);
                }}
            />
            <ConfirmDialog
                open={deleting()}
                onOpenChange={setDeleting}
                message={`Delete ${selected()?.name ?? 'exercise'}?`}
                onConfirm={() => void remove()}
                mount={document.getElementById('root') ?? undefined}
            />
        </section>
    );
}
/** Optional deep-link context; ordinary library actions stay on the current page. */
interface ExerciseListPageProps {
    initialExerciseId?: string;
    createOnMount?: boolean;
}

function exerciseSummary(value: ExerciseDefinition): string {
    const measures = value.measurements.map((unit) => exerciseCopy.units[unit]).join(' / ');
    return `${measures} · ${exerciseCopy.weights[value.load.kind]}`;
}

export { ExerciseListPage };
