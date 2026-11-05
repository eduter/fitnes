import { Button } from '../components/Button/Button.tsx';
import { A, useNavigate } from '@solidjs/router';
import { For, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';

/** Saved workout plans. */
function TemplateListPage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();

    return (
        <section class="page">
            <PageHeader
                title="Templates"
                actions={<Button onPress={() => navigate('/templates/new')}> Create </Button>}
            />
            <ul class="list">
                <For each={app.templates()} fallback={<li class="muted">No templates yet.</li>}>
                    {(template) => (
                        <li class="card">
                            <div class="row-split">
                                <div>
                                    <A href={`/templates/${template.id}`}>{template.name}</A>
                                    <p class="muted">
                                        {template.sequence.length} sets · {template.exercises.length} exercises
                                    </p>
                                </div>
                                <Button onPress={() => navigate(`/sessions/start/${template.id}`)}> Start </Button>
                            </div>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}

export { TemplateListPage };
