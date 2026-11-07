import { useNavigate } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { Button } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { formatDateTime } from '../utils/datetime.ts';

/** Browse saved sessions with room for the available phone height. */
function SessionListPage(): JSX.Element {
    const app = useAppData();
    const navigate = useNavigate();
    return (
        <section class="page">
            <PageHeader title="History" />
            <PagedList label="History" items={app.sessions()} rowHeight={72} empty="No sessions yet.">
                {(item) => (
                    <article>
                        <p>{item.snapshot.name}</p>
                        <p class="muted">
                            {formatDateTime(item.startedAt)} · {item.results.length}/{item.snapshot.sequence.length}
                        </p>
                        <div class="button-row">
                            <Button onPress={() => navigate(`/sessions/${item.id}`)}>Review</Button>
                        </div>
                    </article>
                )}
            </PagedList>
        </section>
    );
}

export { SessionListPage };
