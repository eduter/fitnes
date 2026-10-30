import { A } from '@solidjs/router';
import { For, Show, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import hero from '../assets/hero.png';
import logo from '../assets/logo.png';
import { formatWeight } from '../domain/format.ts';

/** Home keeps the gym artwork and the two everyday entry points. */
function HomePage(): JSX.Element {
    const app = useAppData();
    const inProgress = () => app.sessions().filter((session) => session.completedAt === undefined);
    const latest = () => app.bodyweightMeasurements()[0];

    return (
        <section class="page home-page" aria-label="Home">
            <h1 class="visually-hidden">FitNES</h1>
            <img class="home-logo" src={logo} alt="FitNES" />
            <img class="home-art" src={hero} alt="Lifter training in the FitNES gym" width="256" height="128" />
            <div class="home-actions">
                <A class="btn btn--primary" href="/workouts/start">
                    Start a workout
                </A>
                <A class="btn btn--secondary" href="/bodyweight">
                    Log bodyweight
                </A>
                <Show when={latest()}>{(reading) => <p class="muted">Latest: {formatWeight(reading())}</p>}</Show>
            </div>
            <Show when={inProgress().length > 0}>
                <div class="home-resume">
                    <h2 class="section-title">In progress</h2>
                    <For each={inProgress()}>
                        {(session) => <A href={`/sessions/${session.id}`}>Continue {session.snapshot.name} &gt;</A>}
                    </For>
                </div>
            </Show>
        </section>
    );
}

export { HomePage };
