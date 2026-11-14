import type { Dropbox } from 'dropbox';
import { describe, expect, it, vi } from 'vitest';
import { SyncFailure } from '../core/types.ts';
import { createDropboxStore } from './store.ts';

function fixture() {
    const filesDownload = vi.fn().mockResolvedValue({ result: { rev: 'r1', fileBlob: new Blob(['exact bytes']) } });
    const filesUpload = vi.fn().mockResolvedValue({ result: { rev: 'r2' } });
    const filesGetMetadata = vi
        .fn()
        .mockRejectedValue({ status: 409, error: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } } });
    const client = { filesDownload, filesUpload, filesGetMetadata } as unknown as Dropbox;
    const store = createDropboxStore(
        { run: async (operation) => operation(client) },
        () => new Date('2026-11-14T12:00:00Z')
    );
    return { store, filesDownload, filesUpload, filesGetMetadata };
}

describe('Dropbox snapshot store', () => {
    it('pairs downloaded bytes with the revision from the same response', async () => {
        const f = fixture();
        expect(await f.store.read()).toEqual({ content: 'exact bytes', revision: 'r1' });
    });
    it('uses create-only and revision-matched writes with no autorename', async () => {
        const f = fixture();
        await f.store.write('new', null);
        await f.store.write('edit', 'r1');
        expect(f.filesUpload.mock.calls[0][0]).toMatchObject({
            path: '/fitnes/data.json',
            mode: { '.tag': 'add' },
            autorename: false,
            strict_conflict: true,
        });
        expect(f.filesUpload.mock.calls[1][0]).toMatchObject({
            mode: { '.tag': 'update', update: 'r1' },
            autorename: false,
            strict_conflict: true,
        });
    });
    it('recognizes the flattened UploadWriteFailed shape on a stale revision', async () => {
        const f = fixture();
        f.filesUpload.mockRejectedValueOnce({
            status: 409,
            error: { error: { '.tag': 'path', reason: { '.tag': 'conflict', conflict: { '.tag': 'file' } } } },
        });
        await expect(f.store.write('local', 'stale')).rejects.toMatchObject({ kind: 'changed' });
    });

    it('treats only the specific path/not_found error as an absent document', async () => {
        const f = fixture();
        f.filesDownload.mockRejectedValueOnce({
            status: 409,
            error: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } },
        });
        expect(await f.store.read()).toBeNull();
        f.filesDownload.mockRejectedValueOnce({
            status: 409,
            error: { error: { '.tag': 'path', path: { '.tag': 'not_file' } } },
        });
        await expect(f.store.read()).rejects.toThrow();
    });
    it('preserves exact downloaded bytes before overwrite, once per UTC day', async () => {
        const f = fixture();
        await f.store.backup({ content: 'original bytes', revision: 'r1' }, false);
        expect(f.filesUpload).toHaveBeenCalledWith(
            expect.objectContaining({
                path: '/fitnes/backups/daily-2026-11-14.json',
                contents: 'original bytes',
                mode: { '.tag': 'add' },
            })
        );
        f.filesGetMetadata.mockResolvedValueOnce({ result: { '.tag': 'file' } });
        await f.store.backup({ content: 'later bytes', revision: 'r2' }, false);
        expect(f.filesUpload).toHaveBeenCalledTimes(1);
    });
    it('adds an exact revision backup before an explicit conflict overwrite', async () => {
        const f = fixture();
        await f.store.backup({ content: 'conflicting bytes', revision: 'r1' }, true);
        expect(
            f.filesUpload.mock.calls.some(
                ([argument]) =>
                    argument.path === '/fitnes/backups/conflict-r1.json' && argument.contents === 'conflicting bytes'
            )
        ).toBe(true);
    });
    it('does not accept an existing daily backup as an excuse for a failed exact backup', async () => {
        const f = fixture();
        f.filesGetMetadata.mockResolvedValue({ result: { '.tag': 'file' } });
        f.filesUpload.mockRejectedValue(new SyncFailure('transient', 'offline'));
        await expect(f.store.backup({ content: 'bytes', revision: 'r1' }, true)).rejects.toThrow('offline');
    });
});
