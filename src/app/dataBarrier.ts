import { createEffect, onCleanup } from 'solid-js';
import { holdLocalData } from '../sync/locks.ts';

/** Defer incoming dataset replacement for the lifetime of an active editor or tracker. */
function useDataBarrier(active: () => boolean): void {
    createEffect(() => {
        if (!active()) {
            return;
        }
        const release = holdLocalData();
        onCleanup(release);
    });
}

export { useDataBarrier };
