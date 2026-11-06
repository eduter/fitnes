// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it } from 'vitest';
import { OptionPicker, type OptionPickerProps } from './OptionPicker.tsx';

afterEach(cleanup);

function example(disabled = false, layout?: OptionPickerProps['layout']): void {
    const [value, setValue] = createSignal('on');
    render(() => (
        <OptionPicker
            label="Sound"
            layout={layout}
            value={value()}
            onChange={setValue}
            disabled={disabled}
            options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
            ]}
        />
    ));
}

it.each(['stacked', 'framed', 'row'] as const)('selects and restores focus in the %s layout', async (layout) => {
    example(false, layout);
    const trigger = screen.getByRole('button', { name: 'Sound: On' });
    fireEvent.click(trigger);
    await Promise.resolve();
    const dialog = screen.getByRole('dialog', { name: 'Choose Sound' });
    fireEvent.animationEnd(dialog);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'On' }));
    expect(screen.getByRole('button', { name: 'On' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(trigger.textContent).toBe('Off');
    expect(dialog.dataset.phase).toBe('closing');
    fireEvent.animationEnd(dialog);
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();
});

it('cancels without changing the value and keeps disabled controls inactive', async () => {
    example();
    const trigger = screen.getByRole('button', { name: 'Sound: On' });
    fireEvent.click(trigger);
    await Promise.resolve();
    const dialog = screen.getByRole('dialog');
    fireEvent.animationEnd(dialog);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.animationEnd(dialog);
    expect(trigger.textContent).toBe('On');
    cleanup();
    example(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sound: On' }));
    expect(screen.queryByRole('dialog')).toBeNull();
});
