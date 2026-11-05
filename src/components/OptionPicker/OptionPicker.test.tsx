/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { OptionPicker } from './OptionPicker.tsx';

afterEach(cleanup);

describe('OptionPicker', () => {
    it('selects a unit immediately and keeps the reverse closing animation', () => {
        const [value, setValue] = createSignal('kg');
        render(() => (
            <OptionPicker
                label="Unit"
                value={value()}
                onChange={setValue}
                options={[
                    { value: 'kg', label: 'kg' },
                    { value: 'lb', label: 'lb' },
                ]}
            />
        ));
        const trigger = screen.getByRole('button', { name: 'Unit: kg. Choose option' });
        fireEvent.click(trigger);
        const dialog = screen.getByRole('dialog', { name: 'Choose Unit' });
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        fireEvent.click(screen.getByRole('button', { name: 'lb' }));
        expect(value()).toBe('lb');
        expect(dialog.getAttribute('data-phase')).toBe('closing');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(screen.getByRole('button', { name: 'Unit: lb. Choose option' })).toBe(trigger);
    });
    it('leaves the selected value unchanged when going back', () => {
        const [value, setValue] = createSignal('kg');
        render(() => (
            <OptionPicker
                label="Unit"
                value={value()}
                onChange={setValue}
                options={[
                    { value: 'kg', label: 'kg' },
                    { value: 'lb', label: 'lb' },
                ]}
            />
        ));
        fireEvent.click(screen.getByRole('button', { name: /Choose option/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(value()).toBe('kg');
    });
});
