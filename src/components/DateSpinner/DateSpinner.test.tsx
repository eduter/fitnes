// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it, vi } from 'vitest';
import { DateSpinner } from './DateSpinner.tsx';

afterEach(cleanup);
it('steps dates and invokes the native picker only when the date is pressed', () => {
    const [value, setValue] = createSignal('2024-03-01');
    const view = render(() => <DateSpinner label="Date" value={value()} onChange={setValue} />);
    const input = view.container.querySelector('input');
    if (!input) {
        throw new Error('Missing native date input');
    }
    const picker = vi.fn();
    input.showPicker = picker;
    fireEvent.click(screen.getByRole('button', { name: 'Previous day: Date' }));
    expect(value()).toBe('2024-02-29');
    expect(picker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Date: 2024.02.29. Open calendar' }));
    expect(picker).toHaveBeenCalledOnce();
    fireEvent.input(input, { target: { value: '2024-01-01' } });
    expect(value()).toBe('2024-01-01');
    fireEvent.input(input, { target: { value: '' } });
    expect(value()).toBe('2024-01-01');
});
