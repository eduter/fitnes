import { A, useParams } from '@solidjs/router';
import { createEffect, createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import type { ValidationIssue } from '../domain/validation.ts';
import { useAppNavigate } from '../routing/navigation.ts';

/** Start the chosen workout once, automatically snapshotting the latest recorded weight. */
function StartSessionPage(): JSX.Element {
    const params = useParams();
    const nav = useAppNavigate();
    const app = useAppData();
    const template = () => app.templates().find((candidate) => candidate.id === params.templateId);
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    let startedFor: string | undefined;

    createEffect(() => {
        const plan = template();
        if (app.loadState() !== 'ready' || !plan || startedFor === plan.id) {
            return;
        }
        // Session persistence refreshes app data; that must never start a second session.
        startedFor = plan.id;
        void start();
    });

    async function start(): Promise<void> {
        const plan = template();
        if (!plan || busy()) {
            return;
        }
        setBusy(true);
        setErrors([]);
        try {
            const result = await app.startSession(plan);
            if (!result.ok) {
                setErrors(result.errors);
                return;
            }
            nav.replaceSession(result.value.id);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section class="page">
            <Show
                when={template()}
                fallback={
                    <p class="muted">
                        {app.loadState() === 'ready' ? 'Workout not found.' : 'Loading workout…'}{' '}
                        <A href="/workouts">Back</A>
                    </p>
                }
            >
                {(plan) => (
                    <>
                        <PageHeader title={plan().name} />
                        <ValidationErrors errors={errors()} />
                        <Show when={busy()}>
                            <p role="status">Starting workout…</p>
                        </Show>
                        <Show when={errors().length > 0}>
                            <Button onPress={() => void start()}>Retry</Button>
                            <Button onPress={() => nav.goBack()}>Back</Button>
                        </Show>
                    </>
                )}
            </Show>
        </section>
    );
}

export { StartSessionPage };
