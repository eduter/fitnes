import { A } from '@solidjs/router';
import { For, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Choose a saved workout before attaching bodyweight and starting the session. */
function WorkoutPickerPage(): JSX.Element {
    const app = useAppData();
    return (
        <section class="page">
            <PageHeader title="Choose a workout" />
            <ul class="list">
                <For
                    each={app.templates()}
                    fallback={
                        <li class="card">
                            <p>No workouts yet.</p>
                            <A class="btn btn--primary" href="/templates/new">
                                Create a workout
                            </A>
                        </li>
                    }
                >
                    {(template) => (
                        <li>
                            <A class="card-link" href={`/sessions/start/${template.id}`}>
                                <strong>{template.name}</strong>
                                <span class="muted">
                                    {template.sequence.length} sets · {template.exercises.length} exercises
                                </span>
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}

export { WorkoutPickerPage };
