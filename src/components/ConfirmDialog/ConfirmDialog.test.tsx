// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.tsx';

afterEach(cleanup);
it('keeps the original message through reverse closing and uses Yes/No', async () => {
    const [open, setOpen] = createSignal(true);
    const confirm = vi.fn();
    render(() => (
        <ConfirmDialog
            open={open()}
            onOpenChange={setOpen}
            message={open() ? 'Delete Bench press?' : 'Delete exercise?'}
            onConfirm={confirm}
        />
    ));
    await Promise.resolve();
    const dialog = screen.getByRole('dialog', { name: 'Delete Bench press?' });
    fireEvent.animationEnd(dialog);
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(dialog.dataset.phase).toBe('closing');
    expect(dialog.textContent).toContain('Delete Bench press?');
    expect(dialog.textContent).not.toContain('Delete exercise?');
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.animationEnd(dialog);
    expect(screen.queryByRole('dialog')).toBeNull();
});
