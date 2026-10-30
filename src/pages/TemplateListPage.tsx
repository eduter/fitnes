import { A } from '@solidjs/router';
import { For, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Saved workout plans. */
function TemplateListPage(): JSX.Element {
    const app = useAppData();

    return (
        <section class="page">
            <PageHeader
                title="Workouts"
                actions={
                    <A class="btn btn--primary" href="/templates/new">
                        Create
                    </A>
                }
            />
            <ul class="list">
                <For each={app.templates()} fallback={<li class="muted">No workouts yet. Create your first plan.</li>}>
                    {(template) => (
                        <li class="card">
                            <div class="row-split">
                                <div>
                                    <A href={`/templates/${template.id}`}>{template.name}</A>
                                    <p class="muted">
                                        {template.sequence.length} sets · {template.exercises.length} exercises
                                    </p>
                                </div>
                                <A class="btn btn--primary" href={`/sessions/start/${template.id}`}>
                                    Start
                                </A>
                            </div>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}

export { TemplateListPage };
