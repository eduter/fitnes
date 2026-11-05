import { Button } from '../components/Button/Button.tsx';
import { A, useNavigate } from '@solidjs/router';
import { For, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Catalog of reusable exercise definitions. */
function ExerciseListPage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();

    return (
        <section class="page">
            <PageHeader
                title="Exercises"
                actions={<Button onPress={() => navigate('/exercises/new')}> Create </Button>}
            />
            <p class="muted">Catalog entries are the source of truth. Templates keep their own snapshots.</p>
            <ul class="list">
                <For each={app.exercises()} fallback={<li class="muted">No exercises yet.</li>}>
                    {(exercise) => (
                        <li>
                            <A class="card-link" href={`/exercises/${exercise.id}`}>
                                <strong>{exercise.name}</strong>
                                <span class="muted">
                                    {' '}
                                    {exercise.measurements
                                        .map((option) => `${option.measurement}/${option.countBasis}`)
                                        .join(', ')}{' '}
                                    · {exercise.executionModes.join(', ')} ·{' '}
                                    {exercise.loads.map((load) => load.kind).join(', ')}
                                </span>
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}

export { ExerciseListPage };
