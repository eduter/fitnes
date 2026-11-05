// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { TextInput } from './TextInput.tsx';

afterEach(cleanup);

describe('TextInput', () => {
    it('uses a normal labelled native input and preserves mixed-case text', () => {
        const [name, setName] = createSignal('Bench press');
        render(() => (
            <TextInput
                label="Exercise name"
                name="exercise"
                value={name()}
                onInput={(event) => setName(event.currentTarget.value)}
                autocomplete="off"
            />
        ));
        const input = screen.getByRole('textbox', { name: 'Exercise name' }) as HTMLInputElement;
        expect(input instanceof HTMLInputElement).toBe(true);
        expect(input.type).toBe('text');
        expect(input.inputMode).not.toBe('none');
        fireEvent.input(input, { target: { value: 'Bänkpress' } });
        expect(name()).toBe('Bänkpress');
        expect(input.value).toBe('Bänkpress');
        input.focus();
        expect(document.activeElement).toBe(input);
        expect(input.name).toBe('exercise');
    });

    it('forwards native constraints, disabled state and the caller ref', () => {
        let element: HTMLInputElement | undefined;
        render(() => (
            <TextInput
                label="Exercise name"
                id="exercise-name"
                required
                maxLength={80}
                disabled
                ref={(input) => {
                    element = input;
                }}
            />
        ));
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(element).toBe(input);
        expect(input.id).toBe('exercise-name');
        expect(input.disabled).toBe(true);
        expect(input.required).toBe(true);
        expect(input.maxLength).toBe(80);
    });
});
