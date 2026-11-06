// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it } from 'vitest';
import { MultiPicker } from './MultiPicker.tsx';

afterEach(cleanup);
it('keeps membership choices open, summarizes them and ends without reverting', async () => {
    const [values, setValues] = createSignal<string[]>([]);
    render(() => (
        <MultiPicker
            label="Measures"
            values={values()}
            onChange={setValues}
            options={[
                { value: 'r', label: 'Reps' },
                { value: 'w', label: 'Weight' },
                { value: 't', label: 'Time' },
            ]}
        />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Measures: None' }));
    await Promise.resolve();
    const dialog = screen.getByRole('dialog');
    fireEvent.animationEnd(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'Reps', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Weight', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Time', exact: true }));
    expect(dialog.dataset.phase).toBe('open');
    expect(values()).toEqual(['r', 'w', 't']);
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    fireEvent.animationEnd(dialog);
    expect(screen.getByRole('button', { name: 'Measures: Reps, Weight +1' })).toBeTruthy();
});
