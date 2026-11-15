import { createSignal, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { Button, ConfirmDialog } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { downloadSnapshot } from '../components/SyncSettings.tsx';
import { onDataChange } from '../db/changes.ts';
import { db } from '../db/database.ts';
import { withDbRead, withDbWrite } from '../db/dbLifecycle.ts';
import { type RecoveryCopy, restoreBackup } from '../db/syncAdapter.ts';

/** Inspect, download, and explicitly restore locally preserved replacement and conflict snapshots. */
function RecoveryPage(): JSX.Element {
    const [copies, setCopies] = createSignal<RecoveryCopy[]>([]);
    const [selected, setSelected] = createSignal<RecoveryCopy>();
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal('');
    async function load(): Promise<void> {
        try {
            setCopies(await withDbRead(() => db.syncBackups.orderBy('createdAt').reverse().toArray()));
        } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : 'Could not read recovery copies.');
        }
    }
    onMount(() => {
        void load();
        const stop = onDataChange(() => void load());
        onCleanup(stop);
    });
    async function restore(): Promise<void> {
        const copy = selected();
        if (!copy) {
            return;
        }
        setBusy(true);
        try {
            const replaced = await withDbWrite(() => restoreBackup(db, copy.id));
            setMessage(
                replaced
                    ? 'Restored local data. Dropbox sync will compare it before uploading.'
                    : 'Close editors in other tabs, then try restoring again.'
            );
            await load();
        } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : 'Could not restore this copy.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <section class="page">
            <PageHeader title="Recovery" />
            <p class="muted">The latest 20 routine copies are retained. Unresolved conflict copies stay protected.</p>
            <Show when={message()}>
                <p role="status">{message()}</p>
            </Show>
            <PagedList label="Recovery copies" items={copies()} rowHeight={104} empty="No recovery copies yet.">
                {(copy) => (
                    <article>
                        <p>{copy.label}</p>
                        <p class="muted">{new Date(copy.createdAt).toLocaleString()}</p>
                        <div class="button-row">
                            <Button onPress={() => downloadSnapshot('recovery', copy.content)}>Download</Button>
                            <Button disabled={busy()} onPress={() => setSelected(copy)}>
                                Restore
                            </Button>
                        </div>
                    </article>
                )}
            </PagedList>
            <ConfirmDialog
                open={Boolean(selected())}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelected(undefined);
                    }
                }}
                message="Replace ALL local data with this recovery copy? The current data is backed up first."
                onConfirm={() => void restore()}
                mount={document.getElementById('root') ?? undefined}
            />
        </section>
    );
}

export { RecoveryPage };
