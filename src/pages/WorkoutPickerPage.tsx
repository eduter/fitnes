import type { JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { useAppNavigate } from '../routing/navigation.ts';

/** Large catalogs use a full-height page rather than a paginated modal. */
function WorkoutPickerPage(): JSX.Element {
    const app = useAppData();
    const nav = useAppNavigate();
    return (
        <section class="page">
            <PageHeader title="Start workout" actions={<Button onPress={() => nav.goBack()}>Back</Button>} />
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
                            {template.exercises.length} exercises · {template.sequence.length} steps
                        </p>
                        <Button onPress={() => nav.toStartSession(template.id)}>Start</Button>
                    </article>
                )}
            </PagedList>
        </section>
    );
}

export { WorkoutPickerPage };
