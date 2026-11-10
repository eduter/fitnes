/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@solidjs/testing-library';
import { createSignal, type JSX } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { useDialogHistory } from './dialogHistory.ts';

afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
});

/** A stand-in for a Popover: a toggle wired to the shared dialog history. */
function Dialog(props: { label: string; onRegister?: (open: (value: boolean) => void) => void }): JSX.Element {
    const [open, setOpen] = createSignal(false);
    props.onRegister?.(setOpen);
    useDialogHistory({ open, onClose: () => setOpen(false) });
    return (
        <div>
            <span data-testid={`${props.label}-open`}>{String(open())}</span>
            <button type="button" onClick={() => setOpen(true)}>
                Open {props.label}
            </button>
            <button type="button" onClick={() => setOpen(false)}>
                Close {props.label}
            </button>
        </div>
    );
}

/** Let the queued popstate handlers run. */
async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('useDialogHistory', () => {
    it('closes the open dialog on Back instead of leaving the page', async () => {
        render(() => <Dialog label="weight" />);
        screen.getByRole('button', { name: 'Open weight' }).click();
        await settle();
        expect(screen.getByTestId('weight-open').textContent).toBe('true');

        window.history.back();
        await settle();
        expect(screen.getByTestId('weight-open').textContent).toBe('false');
        // Back consumed the placeholder, so the URL never left the page.
        expect(window.location.pathname).toBe('/');
    });

    it('closes a nested dialog first, then the one beneath it', async () => {
        render(() => (
            <>
                <Dialog label="outer" />
                <Dialog label="inner" />
            </>
        ));
        screen.getByRole('button', { name: 'Open outer' }).click();
        await settle();
        screen.getByRole('button', { name: 'Open inner' }).click();
        await settle();
        expect(screen.getByTestId('outer-open').textContent).toBe('true');
        expect(screen.getByTestId('inner-open').textContent).toBe('true');

        window.history.back();
        await settle();
        expect(screen.getByTestId('inner-open').textContent).toBe('false');
        expect(screen.getByTestId('outer-open').textContent).toBe('true');

        window.history.back();
        await settle();
        expect(screen.getByTestId('outer-open').textContent).toBe('false');
    });

    it('consumes the placeholder when a dialog closes itself, so Back does not need a second press', async () => {
        window.history.pushState({}, '', '/previous');
        render(() => <Dialog label="weight" />);
        screen.getByRole('button', { name: 'Open weight' }).click();
        await settle();
        expect(typeof window.history.state?.fitnesDialog).toBe('number');

        screen.getByRole('button', { name: 'Close weight' }).click();
        await settle();
        expect(screen.getByTestId('weight-open').textContent).toBe('false');
        // The placeholder is gone and we are back on the real entry, so the next
        // Back leaves the page rather than closing an already-closed dialog.
        expect(window.history.state?.fitnesDialog).toBeUndefined();
        expect(window.location.pathname).toBe('/previous');
    });

    it('re-pushes the placeholder while a dialog refuses to close', async () => {
        let allowClose = false;
        function Refusing(): JSX.Element {
            const [open, setOpen] = createSignal(false);
            useDialogHistory({
                open,
                onClose: () => {
                    if (allowClose) {
                        setOpen(false);
                    }
                },
            });
            return (
                <div>
                    <span data-testid="refuse-open">{String(open())}</span>
                    <button type="button" onClick={() => setOpen(true)}>
                        Open refusing
                    </button>
                </div>
            );
        }
        render(() => <Refusing />);
        screen.getByRole('button', { name: 'Open refusing' }).click();
        await settle();

        window.history.back();
        await settle();
        // Refused: still open, and Back has not escaped the page.
        expect(screen.getByTestId('refuse-open').textContent).toBe('true');
        expect(window.location.pathname).toBe('/');

        allowClose = true;
        window.history.back();
        await settle();
        expect(screen.getByTestId('refuse-open').textContent).toBe('false');
    });

    it('does not leave a phantom entry after a dialog closes and the route replaces it', async () => {
        // Route changes that replace (the app's create/delete/start flows) overwrite
        // the placeholder, so Back afterwards reaches the previous page directly.
        window.history.pushState({}, '', '/previous');
        render(() => <Dialog label="weight" />);
        screen.getByRole('button', { name: 'Open weight' }).click();
        await settle();

        window.history.replaceState({}, '', '/next');
        screen.getByRole('button', { name: 'Close weight' }).click();
        await settle();
        expect(window.location.pathname).toBe('/next');

        window.history.back();
        await settle();
        expect(window.location.pathname).toBe('/previous');
    });
});
