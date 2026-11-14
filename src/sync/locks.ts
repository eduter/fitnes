let editors = 0;
const idleListeners = new Set<() => void>();
const EDIT_LOCK = 'fitnes-data-in-use';

/** Hold a shared browser lock while an editor, confirmation, or workout tracker uses a local snapshot. */
function holdLocalData(): () => void {
    editors++;
    let released = false;
    let releaseLock = () => {};
    const held = new Promise<void>((resolve) => {
        releaseLock = resolve;
    });
    if (typeof navigator !== 'undefined' && navigator.locks) {
        void navigator.locks.request(EDIT_LOCK, { mode: 'shared' }, () => held);
    }
    return () => {
        if (released) {
            return;
        }
        released = true;
        editors--;
        releaseLock();
        if (!editors) {
            for (const listener of idleListeners) {
                listener();
            }
        }
    };
}

/** Attempt a replacement only when every tab has released its editors. */
async function withIdleData(work: () => Promise<boolean>): Promise<boolean> {
    if (editors) {
        return false;
    }
    if (typeof navigator !== 'undefined' && navigator.locks) {
        return navigator.locks.request(EDIT_LOCK, { ifAvailable: true }, (lock) => (lock ? work() : false));
    }
    return work();
}

/** Whether this tab has an active editor; cross-tab protection uses Web Locks. */
function localDataInUse(): boolean {
    return editors > 0;
}

/** Retry deferred work when the final editor in this tab closes. */
function onLocalDataIdle(listener: () => void): () => void {
    idleListeners.add(listener);
    return () => idleListeners.delete(listener);
}

export { holdLocalData, localDataInUse, onLocalDataIdle, withIdleData };
