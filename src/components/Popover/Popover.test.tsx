// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
        finishAnimation(panel, 'nes-popover-reveal');
        expect(document.activeElement).toBe(panel);
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(panel.dataset.phase).toBe('closing');
        expect(screen.getByRole('dialog')).toBe(panel);
        finishAnimation(panel, 'nes-popover-hide');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }));
    });

    it('ignores descendant animations, traps Tab, and closes with Escape', () => {
        example();
        const panel = screen.getByRole('dialog');
        fireEvent.animationEnd(screen.getByRole('heading'));
        expect(panel.dataset.phase).toBe('opening');
        finishAnimation(panel, 'nes-popover-reveal');
        screen.getByRole('button', { name: 'Last' }).focus();
        fireEvent.keyDown(document.activeElement ?? panel, { key: 'Tab' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
        fireEvent.keyDown(panel, { key: 'Escape' });
        expect(panel.dataset.phase).toBe('closing');
        finishAnimation(panel, 'nes-popover-hide');
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

it('focuses the dialog rather than opening the text keyboard by default', async () => {
    render(() => (
        <Popover open onOpenChange={() => undefined} label="Editor" height={96}>
            <input aria-label="Name" />
            <textarea aria-label="Notes" />
        </Popover>
    ));
    await Promise.resolve();
    const dialog = screen.getByRole('dialog');
    fireEvent.animationEnd(dialog);
    expect(document.activeElement).toBe(dialog);
});

it('keeps the framed content separate from the animated clipping viewport', async () => {
    example();
    const dialog = screen.getByRole('dialog');
    const frame = dialog.querySelector('.nes-popover__frame');
    expect(frame).not.toBeNull();
    expect(frame?.classList.contains('nes-frame')).toBe(true);
    expect(dialog.classList.contains('nes-frame')).toBe(false);
    fireEvent.animationEnd(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog.querySelector('.nes-popover__frame')).toBe(frame);
    expect((frame as HTMLElement).style.blockSize).toBe('96px');
});

it('ignores a queued opening completion after a partially open window starts closing', () => {
    example();
    const dialog = screen.getByRole('dialog');
    Object.defineProperty(dialog, 'offsetHeight', { value: 32 });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(dialog.dataset.phase).toBe('closing');
    expect(dialog.style.getPropertyValue('--nes-popover-close-height')).toBe('32px');
    expect((dialog.querySelector('.nes-popover__frame') as HTMLElement).style.blockSize).toBe('96px');
    finishAnimation(dialog, 'nes-popover-reveal');
    expect(screen.getByRole('dialog')).toBe(dialog);
    finishAnimation(dialog, 'nes-popover-hide');
    expect(screen.queryByRole('dialog')).toBeNull();
});

function finishAnimation(target: Element, name: string): void {
    // JSDOM's generic Event constructor silently drops the AnimationEvent-only animationName.
    const event = new Event('animationend', { bubbles: true });
    Object.defineProperty(event, 'animationName', { value: name });
    fireEvent(target, event);
}

it('resolves tall windows to one fitting height before animating their fixed border', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 173 });
    try {
        render(() => (
            <Popover open onOpenChange={() => {}} label="Tall editor" height={512}>
                <p>Long form</p>
            </Popover>
        ));
        await Promise.resolve();
        const dialog = screen.getByRole('dialog', { name: 'Tall editor' });
        const frame = dialog.querySelector<HTMLElement>('.nes-popover__frame');
        expect(dialog.style.blockSize).toBe('144px');
        expect(frame?.style.blockSize).toBe('144px');
        expect(dialog.style.maxBlockSize).toBe('');
        expect(frame?.style.maxBlockSize).toBe('');
        expect(dialog.style.getPropertyValue('--nes-popover-steps')).toBe('9');
        finishAnimation(dialog, 'nes-popover-reveal');
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 205 });
        fireEvent.resize(window);
        expect(frame?.style.blockSize).toBe('176px');
        expect(dialog.style.blockSize).toBe('176px');
    } finally {
        if (original) {
            Object.defineProperty(window, 'innerHeight', original);
        } else {
            Reflect.deleteProperty(window, 'innerHeight');
        }
    }
});

it('scrolls its own form without repositioning or repainting the fixed frame', async () => {
    example();
    await Promise.resolve();
    const dialog = screen.getByRole('dialog');
    finishAnimation(dialog, 'nes-popover-reveal');
    const frame = dialog.querySelector<HTMLElement>('.nes-popover__frame');
    const content = dialog.querySelector<HTMLElement>('.nes-popover__content');
    if (!frame || !content) {
        throw new Error('Popover frame/content missing');
    }
    const measure = vi.spyOn(frame, 'getBoundingClientRect');
    try {
        fireEvent.scroll(content);
        expect(measure).not.toHaveBeenCalled();
        fireEvent.resize(window);
        expect(measure).toHaveBeenCalled();
    } finally {
        measure.mockRestore();
    }
});
