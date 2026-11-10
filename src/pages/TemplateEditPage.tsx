import { A, useParams } from '@solidjs/router';
import { createEffect, createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { DraftGuard } from '../app/DraftGuard.tsx';
import { Button, ConfirmDialog, DialogActions } from '../components/Controls/index.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { TemplateForm } from '../components/template/TemplateForm.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { duplicateWorkoutTemplate } from '../domain/duplicateWorkoutTemplate.ts';
import { generateWorkoutTemplateId } from '../domain/generateIds.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';
import { useAppNavigate } from '../routing/navigation.ts';

/** Create or edit a workout template. Valid edits persist immediately. */
function TemplateEditPage(): JSX.Element {
    const params = useParams();
    const nav = useAppNavigate();
    const app = useAppData();
    const isNew = () => params.id === undefined;

    const [discarded, setDiscarded] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    const [draft, setDraft] = createSignal<WorkoutTemplate>(blankTemplate());
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const [created, setCreated] = createSignal(false);
    const [hydratedFor, setHydratedFor] = createSignal<string | undefined>(undefined);
    const [duplicating, setDuplicating] = createSignal(false);
    const [pendingEdit, setPendingEdit] = createSignal<WorkoutTemplate | undefined>(undefined);

    // Ids are non-empty, so '' can mark the create route without colliding with
    // a real one. Keying on the route (not a one-shot flag) re-hydrates when
    // navigating between two templates, which the router serves with this same
    // component instance.
    const routeKey = () => params.id ?? '';

    createEffect(() => {
        const key = routeKey();
        if (hydratedFor() === key) {
            return;
        }

        if (isNew()) {
            setDraft(blankTemplate());
            setCreated(false);
            setHydratedFor(key);
            return;
        }

        const found = app.templates().find((template) => template.id === params.id);
        if (found) {
            setDraft(structuredClone(found));
            setCreated(true);
            setHydratedFor(key);
        } else if (app.loadState() === 'ready') {
            setHydratedFor(key);
        }
    });

    async function persist(next: WorkoutTemplate, nextErrors: ValidationIssue[]): Promise<void> {
        setDraft(next);
        setErrors(nextErrors);
        if (!created() || nextErrors.length > 0) {
            return;
        }

        // Hold the edit while a duplicate is in flight; `duplicate` folds it into
        // the copy once the copy exists, so it cannot reach the source document.
        if (duplicating()) {
            setPendingEdit(next);
            return;
        }

        const result = await app.saveTemplate(next);
        setErrors(result.ok ? [] : result.errors);
    }

    async function create(): Promise<void> {
        const result = await app.saveTemplate(draft());
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setCreated(true);
        setErrors([]);
        nav.replaceWorkout(result.value.id);
    }

    async function duplicate(): Promise<void> {
        const copy = duplicateWorkoutTemplate(draft());

        setDuplicating(true);
        setPendingEdit(undefined);
        const result = await app.saveTemplate(copy);
        const edit = pendingEdit();
        setPendingEdit(undefined);
        setDuplicating(false);

        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setErrors([]);

        if (edit) {
            await app.saveTemplate({ ...edit, id: copy.id });
        }

        nav.toWorkout(copy.id);
    }

    async function remove(): Promise<void> {
        if (await app.removeTemplate(draft().id)) {
            setDiscarded(true);
            nav.toWorkoutsList();
        }
    }

    const missing = () =>
        hydratedFor() !== undefined && !isNew() && !app.templates().some((template) => template.id === params.id);

    return (
        <section class="page">
            <DraftGuard
                dirty={
                    !discarded() &&
                    (created()
                        ? errors().length > 0
                        : draft().name !== '' || draft().sequence.length > 0 || !!draft().description)
                }
            />
            <ConfirmDialog
                open={confirming()}
                onOpenChange={setConfirming}
                message={`Delete ${draft().name || 'workout'}?`}
                onConfirm={() => void remove()}
                mount={document.getElementById('root') ?? undefined}
            />
            <ValidationErrors errors={errors()} />
            <PageHeader
                title={created() ? draft().name || 'Workout' : 'New workout'}
                actions={<Button onPress={() => nav.goBack()}>Back</Button>}
            />
            <Show
                when={!missing()}
                fallback={
                    <p class="muted">
                        Workout not found. <A href="/templates">Back to workouts</A>
                    </p>
                }
            >
                <TemplateForm
                    onDuplicate={created() ? () => void duplicate() : undefined}
                    onDelete={created() ? () => setConfirming(true) : undefined}
                    duplicating={duplicating()}
                    value={draft()}
                    catalog={app.exercises()}
                    errors={errors()}
                    onChange={(next, nextErrors) => void persist(next, nextErrors)}
                />
                <Show when={!created()}>
                    <DialogActions
                        kind="create"
                        onConfirm={() => void create()}
                        onCancel={() => {
                            setDiscarded(true);
                            nav.goBack();
                        }}
                    />
                </Show>
            </Show>
        </section>
    );
}

function blankTemplate(): WorkoutTemplate {
    return {
        id: generateWorkoutTemplateId(),
        name: '',
        schemaVersion: 1,
        exercises: [],
        sets: [],
        sequence: [],
    };
}

export { TemplateEditPage };
