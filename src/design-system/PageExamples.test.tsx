// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkoutExample } from './PageExamples.tsx';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('retains the exercise fields until the reverse closing animation finishes', async () => {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe(): void {}
            disconnect(): void {}
        }
    );
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = render(() => <WorkoutExample mount={mount} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit', exact: true })[0]);
    await Promise.resolve();
    const dialog = screen.getByRole('dialog', { name: 'Edit exercise' });
    fireEvent.animationEnd(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'End', exact: true }));
    expect(dialog.dataset.phase).toBe('closing');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveProperty('value', 'Bench press');
    expect(dialog.textContent).toContain('Notes');
    fireEvent.animationEnd(dialog);
    expect(screen.queryByRole('dialog')).toBeNull();
    view.unmount();
    mount.remove();
});
