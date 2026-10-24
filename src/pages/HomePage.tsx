import { A } from '@solidjs/router';
import { For, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import hero from '../assets/hero.png';
import logo from '../assets/logo.png';
import { formatDateTime } from '../utils/datetime.ts';

/** The poster, then the workouts you can start. */
function HomePage(): JSX.Element {
    const app = useAppData();
    const inProgress = () => app.sessions().filter((session) => session.completedAt === undefined);

    return (
        <section class="page home">
            <img class="pixel-art home-logo" src={logo} width={224} height={96} alt="FitNES" />
            <img
                class="pixel-art home-hero"
                src={hero}
                width={256}
                height={128}
                alt="A lifter bench pressing in a basement gym"
            />
            <div class="home-actions">
                <Show when={app.loadState() === 'loading'}>
                    <p class="muted">Opening local database…</p>
                </Show>
                <Show when={app.loadError()}>{(message) => <p class="error-text">{message()}</p>}</Show>
                <Show when={inProgress().length > 0}>
                    <h2 class="section-title">In progress</h2>
                    <ul class="list">
                        <For each={inProgress()}>
                            {(session) => (
                                <li>
                                    <A class="card-link" href={`/sessions/${session.id}`}>
                                        Continue {session.snapshot.name}
                                        <span class="muted">started {formatDateTime(session.startedAt)}</span>
                                    </A>
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
                <h2 class="section-title">Start a workout</h2>
                <ul class="list">
                    <For each={app.templates()} fallback={<li class="muted">No workouts yet.</li>}>
                        {(template) => (
                            <li>
                                <A class="card-link" href={`/sessions/start/${template.id}`}>
                                    {template.name}
                                    <span class="muted">{template.sequence.length} sets</span>
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
            </div>
        </section>
    );
}

export { HomePage };
