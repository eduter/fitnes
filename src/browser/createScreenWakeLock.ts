import { type Accessor, createEffect, createMemo, onCleanup } from 'solid-js';

/** Keep a visible screen awake for the enabled owner's lifetime, including after returning from manual lock. */
function createScreenWakeLock(enabled: Accessor<boolean>): void {
    const active = createMemo(enabled);
    createEffect(() => {
        if (!active()) {
            return;
        }
        let disposed = false;
        let pending = false;
        let wake: WakeLockSentinel | undefined;

        async function acquire(): Promise<void> {
            if (!('wakeLock' in navigator)) {
                return;
            }
            if (disposed || pending || document.visibilityState !== 'visible') {
                return;
            }
            if (wake && !wake.released) {
                return;
            }
            pending = true;
            try {
                const acquired = await navigator.wakeLock.request('screen');
                // Navigation or completion can happen before the browser grants the request
                if (disposed || document.visibilityState !== 'visible') {
                    await acquired.release();
                    return;
                }
                wake = acquired;
            } catch {
                /* Wake lock is optional; denied requests must not interrupt workout tracking */
            } finally {
                pending = false;
            }
        }

        function visible(): void {
            void acquire();
        }

        document.addEventListener('visibilitychange', visible);
        void acquire();
        onCleanup(() => {
            disposed = true;
            document.removeEventListener('visibilitychange', visible);
            void wake?.release().catch(() => {
                /* The browser may already have released the lock during navigation */
            });
        });
    });
}

export { createScreenWakeLock };
