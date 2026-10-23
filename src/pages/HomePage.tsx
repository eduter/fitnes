import { A } from '@solidjs/router';
import { For, Show, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { PixelHero } from '../components/pixel/index.ts';
import { formatWeight } from '../domain/format.ts';
import { formatDateTime } from '../utils/datetime.ts';

/** Dashboard: in-progress work, templates to start, and recent history. */
function HomePage(): JSX.Element {
    const app = useAppData();
    const inProgress = () => app.sessions().filter((session) => session.completedAt === undefined);
    const recent = () =>
        app
            .sessions()
            .filter((session) => session.completedAt !== undefined)
            .slice(0, 5);
    const latestBodyweight = () => app.bodyweightMeasurements()[0];

    return (
        <section class="page">
            <PageHeader title="Train" />
            <PixelHero>
                <p class="home-hero__message">
                    Keep going.
                    <br />
                    Stronger every day.
                </p>
            </PixelHero>
            <Show when={app.loadState() === 'loading'}>
                <p class="muted">Opening local database…</p>
            </Show>
            <Show when={app.loadError()}>{(message) => <p class="error-text">{message()}</p>}</Show>
            <Show when={latestBodyweight()}>
                {(measurement) => (
                    <p class="muted">
                        Latest bodyweight {formatWeight(measurement())} at {formatDateTime(measurement().measuredAt)}
                    </p>
                )}
            </Show>
            <Show when={inProgress().length > 0}>
                <h2 class="section-title">In progress</h2>
                <ul class="list">
                    <For each={inProgress()}>
                        {(session) => (
                            <li>
                                <A class="card-link" href={`/sessions/${session.id}`}>
                                    Continue {session.snapshot.name} · started {formatDateTime(session.startedAt)}
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
            <h2 class="section-title">Templates</h2>
            <ul class="list">
                <For each={app.templates()} fallback={<li class="muted">No templates yet.</li>}>
                    {(template) => (
                        <li class="card">
                            <div class="row-split">
                                <div>
                                    <A href={`/templates/${template.id}`}>{template.name}</A>
                                    <p class="muted">{template.sequence.length} sets</p>
                                </div>
                                <A class="btn btn--primary" href={`/sessions/start/${template.id}`}>
                                    Start
                                </A>
                            </div>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={recent().length > 0}>
                <h2 class="section-title">Recent sessions</h2>
                <ul class="list">
                    <For each={recent()}>
                        {(session) => (
                            <li>
                                <A class="card-link" href={`/sessions/${session.id}`}>
                                    {session.snapshot.name} · {formatDateTime(session.startedAt)}
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </section>
    );
}

export { HomePage };
