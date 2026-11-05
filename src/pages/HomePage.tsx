import { Button } from '../components/Button/Button.tsx';
import { useNavigate } from '@solidjs/router';
import { createSignal, For, Show, type JSX } from 'solid-js';
import gymUrl from '../../art/home/gym.png?url';
import { useAppData } from '../app/AppData.tsx';
import { MenuDialog } from '../components/dialog/MenuDialog.tsx';
import { RecordWeightForm } from '../components/dialog/RecordWeightForm.tsx';

import { formatMass } from '../domain/convertWeight.ts';
import { templateUsesBodyweight } from '../domain/lookups.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';

/** The two primary training actions, below the approved gym artwork. */
function HomePage(): JSX.Element {
    const app = useAppData();
    let workoutButton: HTMLButtonElement | undefined;
    let weightButton: HTMLButtonElement | undefined;
    const navigate = useNavigate();
    const [menu, setMenu] = createSignal<'workout' | 'weight' | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal('');
    const [error, setError] = createSignal('');
    const active = () => app.sessions().filter((session) => session.completedAt === undefined);

    async function start(template: WorkoutTemplate): Promise<void> {
        if (busy()) {
            return;
        }
        setBusy(true);
        setError('');
        try {
            const bodyweight = templateUsesBodyweight(template) ? await app.latestBodyweight(Date.now()) : undefined;
            const result = await app.startSession(template, bodyweight);
            if (!result.ok) {
                setError(result.errors.map((issue) => issue.message).join('. '));
                return;
            }
            setMenu(null);
            navigate(`/sessions/${result.value.id}`);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not start workout. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section class="home-page" aria-label="Home">
            <img
                class="home-art"
                src={gymUrl}
                width="256"
                height="200"
                alt="Pixel art gym with a lifter training under the No Excuses sign"
            />
            <div class="home-actions">
                <Button
                    class="home-action"
                    ref={(element) => {
                        workoutButton = element;
                    }}
                    type="button"
                    disabled={app.loadState() !== 'ready'}
                    onPress={() => {
                        setMessage('');
                        setError('');
                        setMenu('workout');
                    }}
                >
                    Start workout
                </Button>
                <Button
                    class="home-action"
                    ref={(element) => {
                        weightButton = element;
                    }}
                    type="button"
                    disabled={app.loadState() !== 'ready'}
                    onPress={() => {
                        setMessage('');
                        setMenu('weight');
                    }}
                >
                    Record weight
                </Button>
            </div>
            <Show when={message()}>
                <p class="home-status" role="status">
                    {message()}
                </p>
            </Show>
            <MenuDialog
                anchor={() => workoutButton}
                open={menu() === 'workout'}
                title="Start workout"
                onClose={() => setMenu(null)}
            >
                <div class="stack">
                    <Show when={active().length}>
                        <p class="muted">Continue a workout</p>
                        <For each={active()}>
                            {(session) => (
                                <div class="menu-choice">
                                    <Button
                                        onPress={() => {
                                            setMenu(null);
                                            navigate(`/sessions/${session.id}`);
                                        }}
                                    >
                                        Resume {session.snapshot.name}
                                    </Button>
                                    <p class="muted">
                                        {session.results.length}/{session.snapshot.sequence.length} sets logged
                                    </p>
                                </div>
                            )}
                        </For>
                    </Show>
                    <p class="muted">Choose a template</p>
                    <For
                        each={app.templates()}
                        fallback={
                            <p>
                                No templates yet.{' '}
                                <Button
                                    onPress={() => {
                                        setMenu(null);
                                        navigate('/templates/new');
                                    }}
                                >
                                    Create a template
                                </Button>
                            </p>
                        }
                    >
                        {(template) => (
                            <div class="menu-choice">
                                <Button disabled={busy()} onPress={() => void start(template)}>
                                    {template.name}
                                </Button>
                                <p class="muted">
                                    {template.exercises.length} exercises · {template.sequence.length} sets
                                </p>
                                <Show when={template.description}>
                                    <p class="muted">{template.description}</p>
                                </Show>
                            </div>
                        )}
                    </For>
                    <Show when={app.bodyweightMeasurements()[0]}>
                        {(weight) => (
                            <p class="muted">
                                Bodyweight sets use your latest reading: {formatMass(weight(), app.massUnit(), 1)}.
                            </p>
                        )}
                    </Show>
                    <Show when={busy()}>
                        <p role="status">Starting…</p>
                    </Show>
                    <Show when={error()}>
                        <p role="alert" class="error-text">
                            {error()}
                        </p>
                    </Show>
                </div>
            </MenuDialog>
            <MenuDialog
                anchor={() => weightButton}
                open={menu() === 'weight'}
                showBack={false}
                height={208}
                title="Record weight"
                onClose={() => setMenu(null)}
            >
                <RecordWeightForm
                    onCancel={() => setMenu(null)}
                    onRecorded={(weight) => {
                        setMenu(null);
                        setMessage(`Recorded ${formatMass(weight, app.massUnit(), 1)}.`);
                    }}
                />
            </MenuDialog>
        </section>
    );
}

export { HomePage };
