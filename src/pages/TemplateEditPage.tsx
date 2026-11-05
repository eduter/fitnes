import { Button } from '../components/Button/Button.tsx';
import { A, useNavigate, useParams } from '@solidjs/router';
import { Show, createEffect, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { RawDocument } from '../components/RawDocument.tsx';
import { TemplateForm } from '../components/template/TemplateForm.tsx';
import { duplicateWorkoutTemplate } from '../domain/duplicateWorkoutTemplate.ts';
import { generateWorkoutTemplateId } from '../domain/generateIds.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';

/** Create or edit a workout template. Valid edits persist immediately. */
function TemplateEditPage(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();
    const app = useAppData();
    const isNew = () => params.id === undefined;

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
        navigate(`/templates/${result.value.id}`, { replace: true });
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

        navigate(`/templates/${copy.id}`);
    }

    async function remove(): Promise<void> {
        if (!confirm('Delete this template? Sessions keep their snapshots.')) {
            return;
        }
        await app.removeTemplate(draft().id);
        navigate('/templates');
    }

    const missing = () =>
        hydratedFor() !== undefined && !isNew() && !app.templates().some((template) => template.id === params.id);

    return (
        <section class="page">
            <PageHeader
                title={created() ? draft().name || 'Template' : 'New template'}
                actions={
                    <div class="button-row">
                        <Show when={created()}>
                            <Button onPress={() => navigate(`/sessions/start/${draft().id}`)}> Start </Button>
                            <Button type="button" onPress={() => void duplicate()}>
                                Duplicate
                            </Button>
                            <Button type="button" onPress={() => void remove()}>
                                Delete
                            </Button>
                        </Show>
                    </div>
                }
            />
            <Show
                when={!missing()}
                fallback={
                    <p class="muted">
                        Template not found. <A href="/templates">Back to templates</A>
                    </p>
                }
            >
                <TemplateForm
                    value={draft()}
                    catalog={app.exercises()}
                    errors={errors()}
                    onChange={(next, nextErrors) => void persist(next, nextErrors)}
                />
                <Show when={!created()}>
                    <Button type="button" onPress={() => void create()}>
                        Create
                    </Button>
                </Show>
                <RawDocument value={draft()} />
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
