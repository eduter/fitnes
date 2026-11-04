// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { press } from '../Controls/press.test-helper.ts';
import { Button } from './Button.tsx';

afterEach(cleanup);

describe('Button', () => {
    it('activates once on primary press and still accepts keyboard clicks', () => {
        const action = vi.fn();
        render(() => <Button onPress={action}>Add set</Button>);
        const button = screen.getByRole('button', { name: 'Add set' });
        press(button);
        expect(action).toHaveBeenCalledTimes(1);
        fireEvent.click(button, { detail: 0 });
        expect(action).toHaveBeenCalledTimes(2);
        expect(button.getAttribute('type')).toBe('button');
    });

    it('ignores disabled activation', () => {
        const action = vi.fn();
        render(() => (
            <Button disabled onPress={action}>
                Add set
            </Button>
        ));
        press(screen.getByRole('button'));
        fireEvent.click(screen.getByRole('button'));
        expect(action).not.toHaveBeenCalled();
    });

    it('ignores secondary buttons and non-primary pointers', () => {
        const action = vi.fn();
        render(() => <Button onPress={action}>Add set</Button>);
        for (const [button, isPrimary] of [
            [2, true],
            [0, false],
        ] as const) {
            const event = new MouseEvent('pointerdown', { bubbles: true, button });
            Object.defineProperty(event, 'isPrimary', { value: isPrimary });
            fireEvent(screen.getByRole('button'), event);
        }
        expect(action).not.toHaveBeenCalled();
        press(screen.getByRole('button'));
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('respects disabled state inherited from a native fieldset', () => {
        const action = vi.fn();
        render(() => (
            <fieldset disabled>
                <Button onPress={action}>Add set</Button>
            </fieldset>
        ));
        press(screen.getByRole('button'));
        fireEvent.click(screen.getByRole('button'), { detail: 0 });
        expect(action).not.toHaveBeenCalled();
    });

    it('preserves caller attributes and reactive classes', () => {
        const [active, setActive] = createSignal(false);
        render(() => (
            <Button class={active() ? 'active' : 'idle'} classList={{ badge: true }} aria-label="Continue">
                Go
            </Button>
        ));
        setActive(true);
        const button = screen.getByRole('button', { name: 'Continue' });
        expect(button.classList.contains('nes-button')).toBe(true);
        expect(button.classList.contains('badge')).toBe(true);
        expect(button.classList.contains('active')).toBe(true);
        expect(button.classList.contains('idle')).toBe(false);
    });
});
