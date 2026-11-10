import type { JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { useAppNavigate } from '../routing/navigation.ts';

/** Browse saved templates with room for the available phone height. */
function TemplateListPage(): JSX.Element {
    const app = useAppData();
    const nav = useAppNavigate();
    return (
        <section class="page">
            <PageHeader title="Workouts" actions={<Button onPress={() => nav.toNewWorkout()}>Create</Button>} />
            <PagedList label="Workouts" items={app.templates()} rowHeight={72} empty="No workouts yet.">
                {(item) => (
                    <article>
                        <h2 class="list-item__title">{item.name}</h2>
                        <p class="muted">
                            {item.sequence.length} steps · {item.exercises.length} exercises
                        </p>
                        <div class="button-row">
                            <Button onPress={() => nav.toWorkout(item.id)}>Edit</Button>
                            <Button onPress={() => nav.toStartSession(item.id)}>Start</Button>
                        </div>
                    </article>
                )}
            </PagedList>
        </section>
    );
}

export { TemplateListPage };
