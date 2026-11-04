// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { press } from '../Controls/press.test-helper.ts';
import { Spinner } from './Spinner.tsx';

afterEach(cleanup);

describe('Spinner', () => {
    it('steps controlled decimal values exactly and disables at bounds', () => {
        const [value, setValue] = createSignal(0.1);
        render(() => (
            <Spinner
                label="Weight"
                value={value()}
                onChange={setValue}
                step={0.1}
                integerDigits={3}
                fractionDigits={2}
                max={0.3}
            />
        ));
        press(screen.getByRole('button', { name: 'Increase Weight' }));
        press(screen.getByRole('button', { name: 'Increase Weight' }));
        expect(value()).toBe(0.3);
        expect((screen.getByRole('button', { name: 'Increase Weight' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByRole('button', { name: /Weight: 000.30/ })).toBeTruthy();
        press(screen.getByRole('button', { name: 'Decrease Weight' }));
        expect(value()).toBe(0.2);
    });

    it('opens the number pad without a native input and applies a selected digit immediately', () => {
        const [value, setValue] = createSignal(60);
        render(() => (
            <Spinner
                label="Weight"
                value={value()}
                onChange={setValue}
                step={2.5}
                integerDigits={3}
                fractionDigits={2}
            />
        ));
        const opener = screen.getByRole('button', { name: /Weight: 060.00/ });
        press(opener);
        const dialog = screen.getByRole('dialog', { name: 'Edit Weight' });
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        press(screen.getByRole('button', { name: 'Digit 5' }));
        expect(value()).toBe(65);
        expect(dialog.querySelector('input')).toBeNull();
        press(screen.getByRole('button', { name: 'Done' }));
        expect(dialog.dataset.phase).toBe('closing');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(opener);
    });
});
