import { type RemoteSnapshot, type RemoteStore, SyncFailure } from '../core/types.ts';
import type { DropboxConnection } from './auth.ts';
import { dropboxPathTag } from './auth.ts';

const SYNC_PATH = '/fitnes/data.json';

/** Store FitNES snapshots using Dropbox's atomic create and revision-based update modes. */
function createDropboxStore(connection: DropboxConnection, now: () => Date = () => new Date()): RemoteStore {
    const { run } = connection;
    async function read(): Promise<RemoteSnapshot | null> {
        try {
            const response = await run((client) => client.filesDownload({ path: SYNC_PATH }));
            const downloaded = response.result as typeof response.result & { fileBlob: { text(): Promise<string> } };
            return { content: await downloaded.fileBlob.text(), revision: downloaded.rev };
        } catch (cause) {
            if (dropboxPathTag(cause, 'path') === 'not_found') {
                return null;
            }
            throw cause;
        }
    }

    async function write(content: string, expectedRevision: string | null): Promise<RemoteSnapshot> {
        try {
            const response = await run((client) =>
                client.filesUpload({
                    path: SYNC_PATH,
                    contents: content,
                    mode:
                        expectedRevision === null ? { '.tag': 'add' } : { '.tag': 'update', update: expectedRevision },
                    autorename: false,
                    strict_conflict: true,
                    mute: true,
                })
            );
            return { content, revision: response.result.rev };
        } catch (cause) {
            if (dropboxPathTag(cause, 'path') === 'conflict') {
                throw new SyncFailure('changed', 'Dropbox revision changed.');
            }
            throw cause;
        }
    }

    async function backup(snapshot: RemoteSnapshot, exact: boolean): Promise<void> {
        const dailyPath = `/fitnes/backups/daily-${now().toISOString().slice(0, 10)}.json`;
        let exists = false;
        try {
            const response = await run((client) => client.filesGetMetadata({ path: dailyPath }));
            if (response.result['.tag'] !== 'file') {
                throw new SyncFailure('permanent', 'The Dropbox backup path is not a file. Sync stopped.');
            }
            exists = true;
        } catch (cause) {
            if (dropboxPathTag(cause, 'path') !== 'not_found') {
                throw cause;
            }
        }
        if (!exists) {
            await createBackup(dailyPath, snapshot.content, false);
        }
        if (exact) {
            await createBackup(`/fitnes/backups/conflict-${snapshot.revision}.json`, snapshot.content, true);
        }
    }

    async function createBackup(path: string, content: string, verifyExisting: boolean): Promise<void> {
        try {
            await run((client) =>
                client.filesUpload({
                    path,
                    contents: content,
                    mode: { '.tag': 'add' },
                    autorename: false,
                    strict_conflict: true,
                    mute: true,
                })
            );
        } catch (cause) {
            if (dropboxPathTag(cause, 'path') !== 'conflict') {
                throw cause;
            }
            if (verifyExisting) {
                const existing = await run((client) => client.filesDownload({ path }));
                const downloaded = existing.result as typeof existing.result & {
                    fileBlob: { text(): Promise<string> };
                };
                if ((await downloaded.fileBlob.text()) !== content) {
                    throw new SyncFailure(
                        'permanent',
                        'The existing conflict backup has different contents. Upload blocked.'
                    );
                }
                return;
            }
            const existing = await run((client) => client.filesGetMetadata({ path }));
            if (existing.result['.tag'] !== 'file') {
                throw new SyncFailure('permanent', 'The daily backup could not be verified. Upload blocked.');
            }
        }
    }

    return { read, write, backup };
}

export { createDropboxStore, SYNC_PATH };
