import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Large catalogs use a full-height page rather than a paginated modal. */
function WorkoutPickerPage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();
    return (
        <section class="page">
            <PageHeader title="Start workout" actions={<Button onPress={() => navigate('/')}>Back</Button>} />
            <PagedList
                label="Choose workout"
                items={app.templates()}
                rowHeight={72}
                empty="No workouts yet. Create one in Workouts."
            >
                {(template) => (
                    <article>
                        <p>{template.name}</p>
                        <p>
                            {template.exercises.length} exercises · {template.sequence.length} sets
                        </p>
                        <Button onPress={() => navigate(`/sessions/start/${template.id}`)}>Choose</Button>
                    </article>
                )}
            </PagedList>
        </section>
    );
}

export { WorkoutPickerPage };
