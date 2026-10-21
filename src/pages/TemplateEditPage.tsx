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
    const [hydrated, setHydrated] = createSignal(false);

    createEffect(() => {
        if (hydrated()) {
            return;
        }

        if (isNew()) {
            setDraft(blankTemplate());
            setCreated(false);
            setHydrated(true);
            return;
        }

        const found = app.templates().find((template) => template.id === params.id);
        if (found) {
            setDraft(structuredClone(found));
            setCreated(true);
            setHydrated(true);
        } else if (app.loadState() === 'ready') {
            setHydrated(true);
        }
    });

    async function persist(next: WorkoutTemplate, nextErrors: ValidationIssue[]): Promise<void> {
        setDraft(next);
        setErrors(nextErrors);
        if (!created() || nextErrors.length > 0) {
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
        const result = await app.saveTemplate(duplicateWorkoutTemplate(draft()));
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        navigate(`/templates/${result.value.id}`);
    }

    async function remove(): Promise<void> {
        if (!confirm('Delete this template? Sessions keep their snapshots.')) {
            return;
        }
        await app.removeTemplate(draft().id);
        navigate('/templates');
    }

    const missing = () => hydrated() && !isNew() && !app.templates().some((template) => template.id === params.id);

    return (
        <section class="page">
            <PageHeader
                title={created() ? draft().name || 'Template' : 'New template'}
                actions={
                    <div class="button-row">
                        <Show when={created()}>
                            <A class="btn btn--primary" href={`/sessions/start/${draft().id}`}>
                                Start
                            </A>
                            <button class="btn btn--secondary" type="button" onClick={() => void duplicate()}>
                                Duplicate
                            </button>
                            <button class="btn btn--secondary" type="button" onClick={() => void remove()}>
                                Delete
                            </button>
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
                    <button class="btn btn--primary" type="button" onClick={() => void create()}>
                        Create
                    </button>
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
