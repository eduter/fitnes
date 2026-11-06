// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { Popover } from './Popover.tsx';

afterEach(cleanup);

function example(): void {
    let opener: HTMLButtonElement | undefined;
    const [open, setOpen] = createSignal(false);
    render(() => (
        <>
            <button
                type="button"
                ref={(element) => {
                    opener = element;
                }}
                onClick={() => setOpen(true)}
            >
                Open
            </button>
            <Popover open={open()} onOpenChange={setOpen} label="Number picker" height={96} returnFocus={() => opener}>
                <h2>Choose a number</h2>
                <button type="button" onClick={() => setOpen(false)}>
                    Close
                </button>
                <button type="button">Last</button>
            </Popover>
        </>
    ));
    screen.getByRole('button', { name: 'Open' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
}

describe('Popover', () => {
    it('adopts PR 23 timing and keeps closing content mounted until the reverse animation finishes', () => {
        example();
        const panel = screen.getByRole('dialog', { name: 'Number picker' });
        expect(panel.dataset.phase).toBe('opening');
        expect(panel.style.getPropertyValue('--nes-popover-steps')).toBe('6');
        expect(panel.style.getPropertyValue('--nes-popover-duration')).toBe('200ms');
        fireEvent.animationEnd(panel, { animationName: 'nes-popover-reveal' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(panel.dataset.phase).toBe('closing');
        expect(screen.getByRole('dialog')).toBe(panel);
        fireEvent.animationEnd(panel, { animationName: 'nes-popover-reveal' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
    });

    it('ignores descendant animations, traps Tab, and closes with Escape', () => {
        example();
        const panel = screen.getByRole('dialog');
        fireEvent.animationEnd(screen.getByRole('heading'));
        expect(panel.dataset.phase).toBe('opening');
        fireEvent.animationEnd(panel, { animationName: 'nes-popover-reveal' });
        screen.getByRole('button', { name: 'Last' }).focus();
        fireEvent.keyDown(document.activeElement ?? panel, { key: 'Tab' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
        fireEvent.keyDown(panel, { key: 'Escape' });
        expect(panel.dataset.phase).toBe('closing');
        fireEvent.animationEnd(panel, { animationName: 'nes-popover-reveal' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('does not leave background content inert when unmounted before its queued opening work', async () => {
        const background = document.createElement('section');
        document.body.append(background);
        const mounted = render(() => (
            <Popover open onOpenChange={() => undefined} label="Temporary" height={96}>
                <button type="button">Close</button>
            </Popover>
        ));
        mounted.unmount();
        await Promise.resolve();
        expect(background.hasAttribute('inert')).toBe(false);
        background.remove();
    });
});

it('dismisses only the top stacked window and restores parent interaction', async () => {
    const [parent, setParent] = createSignal(true);
    const [child, setChild] = createSignal(false);
    let trigger: HTMLButtonElement | undefined;
    render(() => (
        <>
            <Popover open={parent()} onOpenChange={setParent} label="Parent" height={96}>
                <button type="button" ref={trigger} onClick={() => setChild(true)}>
                    Child
                </button>
            </Popover>
            <Popover open={child()} onOpenChange={setChild} label="Child" height={64} returnFocus={() => trigger}>
                <p>Options</p>
            </Popover>
        </>
    ));
    await Promise.resolve();
    const outer = screen.getByRole('dialog', { name: 'Parent' });
    fireEvent.animationEnd(outer);
    fireEvent.click(screen.getByRole('button', { name: 'Child' }));
    await Promise.resolve();
    const inner = screen.getByRole('dialog', { name: 'Child' });
    fireEvent.animationEnd(inner);
    expect(outer.closest('[inert]')).not.toBeNull();
    const backdrop = inner.closest('.nes-popover-layer')?.querySelector('button');
    if (!backdrop) {
        throw new Error('Missing dismissal surface');
    }
    fireEvent.click(backdrop);
    fireEvent.animationEnd(inner);
    expect(outer.closest('[inert]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole('dialog', { name: 'Parent' })).toBe(outer);
});
