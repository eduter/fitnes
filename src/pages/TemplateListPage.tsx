import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Browse saved templates with room for the available phone height. */
function TemplateListPage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();
    return (
        <section class="page">
            <PageHeader title="Workouts" actions={<Button onPress={() => navigate('/templates/new')}>Create</Button>} />
            <PagedList label="Workouts" items={app.templates()} rowHeight={72} empty="No workouts yet.">
                {(item) => (
                    <article>
                        <h2 class="list-item__title">{item.name}</h2>
                        <p class="muted">
                            {item.sequence.length} sets · {item.exercises.length} exercises
                        </p>
                        <div class="button-row">
                            <Button onPress={() => navigate(`/templates/${item.id}`)}>Open</Button>
                            <Button onPress={() => navigate(`/sessions/start/${item.id}`)}>Start</Button>
                        </div>
                    </article>
                )}
            </PagedList>
        </section>
    );
}

export { TemplateListPage };
