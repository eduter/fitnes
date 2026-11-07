import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Browse saved exercises with room for the available phone height. */
function ExerciseListPage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();
    return (
        <section class="page">
            <PageHeader
                title="Exercises"
                actions={<Button onPress={() => navigate('/exercises/new')}>Create</Button>}
            />
            <PagedList label="Exercises" items={app.exercises()} rowHeight={72} empty="No exercises yet.">
                {(item) => (
                    <article>
                        <p>{item.name}</p>
                        <p class="muted">
                            {item.measurements
                                .map((m) => (m.measurement === 'repetitions' ? 'Reps' : 'Time'))
                                .filter((m, i, a) => a.indexOf(m) === i)
                                .join(' / ')}{' '}
                            ·{' '}
                            {item.executionModes
                                .map((m) => (m === 'bilateral' ? 'Bilateral' : 'Unilateral'))
                                .join(' / ')}
                        </p>
                        <div class="button-row">
                            <Button onPress={() => navigate(`/exercises/${item.id}`)}>Open</Button>
                        </div>
                    </article>
                )}
            </PagedList>
        </section>
    );
}

export { ExerciseListPage };
