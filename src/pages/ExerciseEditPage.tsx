import { A, useNavigate, useParams } from '@solidjs/router';
import { Show, createEffect, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { ExerciseForm } from '../components/exercise/ExerciseForm.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { RawDocument } from '../components/RawDocument.tsx';
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

    const [draft, setDraft] = createSignal<ExerciseDefinition>(blankExercise());
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const [created, setCreated] = createSignal(false);
    const [hydratedFor, setHydratedFor] = createSignal<string | undefined>(undefined);

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
        const result = await app.saveExercise(duplicateExercise(draft()));
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        navigate(`/exercises/${result.value.id}`);
    }

    async function remove(): Promise<void> {
        if (!confirm('Delete this exercise from the catalog? Templates keep their snapshots.')) {
            return;
        }
        await app.removeExercise(draft().id);
        navigate('/exercises');
    }

    const missing = () =>
        hydratedFor() !== undefined && !isNew() && !app.exercises().some((exercise) => exercise.id === params.id);

    return (
        <section class="page">
            <PageHeader
                title={created() ? draft().name || 'Exercise' : 'New exercise'}
                actions={
                    <Show when={created()}>
                        <div class="button-row">
                            <button class="btn btn--secondary" type="button" onClick={() => void duplicate()}>
                                Duplicate
                            </button>
                            <button class="btn btn--secondary" type="button" onClick={() => void remove()}>
                                Delete
                            </button>
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
                <ExerciseForm value={draft()} errors={errors()} onChange={(next) => void persist(next)} />
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
