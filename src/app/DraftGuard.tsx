import { useBeforeLeave } from '@solidjs/router';
import { createSignal, type JSX, onCleanup, onMount } from 'solid-js';
import { ConfirmDialog } from '../components/Controls/index.ts';

/** Confirm discarding unsaved composites on route changes; valid atomic edits need no confirmation. */
function DraftGuard(props: DraftGuardProps): JSX.Element {
    const [open, setOpen] = createSignal(false);
    let retry: (() => void) | undefined;
    useBeforeLeave((event) => {
        if (!props.dirty || event.defaultPrevented) {
            return;
        }
        event.preventDefault();
        retry = () => event.retry(true);
        setOpen(true);
    });
    onMount(() => {
        function beforeUnload(event: BeforeUnloadEvent): void {
            if (props.dirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        }
        window.addEventListener('beforeunload', beforeUnload);
        onCleanup(() => window.removeEventListener('beforeunload', beforeUnload));
    });
    return (
        <ConfirmDialog
            open={open()}
            onOpenChange={setOpen}
            closeOnBack={false}
            message="Discard unsaved changes?"
            onConfirm={() => retry?.()}
            mount={document.getElementById('root') ?? undefined}
        />
    );
}
interface DraftGuardProps {
    dirty: boolean;
}

export { DraftGuard };
