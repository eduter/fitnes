const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;

/** Observe committed domain changes from this tab and other tabs. */
function onDataChange(listener: () => void): () => void {
    listeners.add(listener);
    if (!channel && typeof window !== 'undefined' && window.BroadcastChannel) {
        channel = new window.BroadcastChannel('fitnes-data');
        channel.onmessage = () => {
            for (const notify of listeners) {
                notify();
            }
        };
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) {
            channel?.close();
            channel = undefined;
        }
    };
}

/** Notify only after the transaction has committed; callers register this on Dexie's complete event. */
function notifyDataChange(): void {
    for (const listener of listeners) {
        listener();
    }
    channel?.postMessage('changed');
}

export { notifyDataChange, onDataChange };
