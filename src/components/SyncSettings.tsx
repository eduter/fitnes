import { createSignal, type JSX, Show } from 'solid-js';
import { countRecords, parseDataExport } from '../domain/dataExport.ts';
import { appSync, type SyncController } from '../sync/controller.ts';
import { downloadTextFile } from '../utils/download.ts';
import { Button, ConfirmDialog } from './Controls/index.ts';
import { SectionHeading } from './Typography.tsx';

/** Optional Dropbox connection, snapshot conflict review, and explicit destructive choices. */
function SyncSettings(props: { controller?: SyncController }): JSX.Element {
    const sync = props.controller ?? appSync;
    const [choice, setChoice] = createSignal<{ id: string; value: 'local' | 'remote' }>();
    const busy = () => sync.state().status === 'syncing';
    const conflict = () => sync.state().conflict;
    return (
        <section class="stack" aria-label="Dropbox synchronization">
            <SectionHeading>Dropbox sync</SectionHeading>
            <Show when={sync.demo()}>
                <p class="muted">Preview: simulated Dropbox in this browser. No Dropbox account is accessed.</p>
            </Show>
            <p role="status" aria-live="polite">
                {sync.state().message}
            </p>
            <Show when={sync.state().lastSyncedAt}>
                {(time) => <p class="muted">Last synced: {new Date(time()).toLocaleString()}</p>}
            </Show>
            <Show
                when={sync.configured()}
                fallback={<p class="muted">Dropbox is not available in this build. Your data stays on this device.</p>}
            >
                <div class="button-row">
                    <Show
                        when={sync.connected() && sync.state().status !== 'reauth'}
                        fallback={
                            <Button onPress={() => void sync.connect()}>
                                {sync.state().status === 'reauth' ? 'Reconnect Dropbox' : 'Connect Dropbox'}
                            </Button>
                        }
                    >
                        <Button disabled={busy()} onPress={() => void sync.sync()}>
                            Sync now
                        </Button>
                    </Show>
                    <Show when={sync.connected() || sync.state().status === 'reauth'}>
                        <Button onPress={() => sync.disconnect()}>Disconnect</Button>
                    </Show>
                </div>
            </Show>
            <Show when={conflict()}>
                {(reviewed) => (
                    <div class="stack">
                        <p>Choose one complete dataset. The other copy is kept for recovery.</p>
                        <p class="muted">This device: {describeSnapshot(reviewed().local.content)}</p>
                        <p class="muted">
                            Dropbox:{' '}
                            {reviewed().remote ? describeSnapshot(reviewed().remote?.content ?? '') : 'File removed'}
                        </p>
                        <div class="button-row">
                            <Button disabled={busy()} onPress={() => setChoice({ id: reviewed().id, value: 'local' })}>
                                Use this device
                            </Button>
                            <Button
                                disabled={busy() || !reviewed().remote}
                                onPress={() => setChoice({ id: reviewed().id, value: 'remote' })}
                            >
                                Use Dropbox
                            </Button>
                        </div>
                        <div class="button-row">
                            <Button onPress={() => downloadSnapshot('device', reviewed().local.content)}>
                                Download device copy
                            </Button>
                            <Show when={reviewed().remote}>
                                <Button onPress={() => downloadSnapshot('dropbox', reviewed().remote?.content ?? '')}>
                                    Download Dropbox copy
                                </Button>
                            </Show>
                        </div>
                        <p class="muted">You can decide later and keep using local data.</p>
                    </div>
                )}
            </Show>
            <ConfirmDialog
                open={Boolean(choice())}
                onOpenChange={(open) => {
                    if (!open) {
                        setChoice(undefined);
                    }
                }}
                message={
                    choice()?.value === 'local'
                        ? 'Replace the complete Dropbox dataset with the reviewed device copy? The Dropbox copy is backed up first.'
                        : 'Replace ALL local data with the reviewed Dropbox copy? Your local copy is backed up first.'
                }
                onConfirm={() => {
                    const selected = choice();
                    if (selected) {
                        void sync.resolve(selected.id, selected.value);
                    }
                }}
                mount={document.getElementById('root') ?? undefined}
            />
        </section>
    );
}

/** Summarize complete sync documents using product names rather than storage collection names. */
function describeSnapshot(content: string): string {
    try {
        const document = JSON.parse(content);
        const parsed = parseDataExport(document.data);
        if (!parsed.ok) {
            return 'Download to inspect';
        }
        const counts = countRecords(parsed.value);
        return `${counts.exercises} exercises, ${counts.templates} workouts, ${counts.sessions} sessions, ${counts.bodyweightMeasurements} readings`;
    } catch {
        return 'Download to inspect';
    }
}

/** Download a sync candidate as an ordinary FitNES JSON document for manual recovery. */
function downloadSnapshot(label: string, content: string): void {
    let text = content;
    try {
        const document = JSON.parse(content);
        if (document.version === 1 && document.data) {
            text = JSON.stringify(document.data, null, 2);
        }
    } catch {
        /* Preserve unparseable raw bytes for manual repair */
    }
    downloadTextFile(`fitnes-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, text);
}

export { describeSnapshot, downloadSnapshot, SyncSettings };
