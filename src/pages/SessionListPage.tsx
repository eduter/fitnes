import { A } from '@solidjs/router';
import { For, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { formatDateTime } from '../utils/datetime.ts';

/** In-progress and completed workout sessions. */
function SessionListPage(): JSX.Element {
    const app = useAppData();

    return (
        <section class="page">
            <PageHeader title="History" />
            <ul class="list">
                <For each={app.sessions()} fallback={<li class="muted">No sessions yet.</li>}>
                    {(session) => (
                        <li>
                            <A class="card-link" href={`/sessions/${session.id}`}>
                                <strong>{session.snapshot.name}</strong>
                                <span class="muted">
                                    {' '}
                                    {session.completedAt === undefined ? 'in progress' : 'completed'} ·{' '}
                                    {formatDateTime(session.startedAt)} · {session.results.length}/
                                    {session.snapshot.sequence.length} logged
                                </span>
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}

export { SessionListPage };
