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

    it('requires fractional bounds to be representable at the displayed precision', () => {
        expect(() =>
            render(() => (
                <Spinner
                    label="Weight"
                    value={0.01}
                    onChange={() => {}}
                    integerDigits={2}
                    fractionDigits={2}
                    min={0.009}
                />
            ))
        ).toThrow('Spinner bounds must be representable at the displayed precision');
        cleanup();
        expect(() =>
            render(() => (
                <Spinner
                    label="Weight"
                    value={0.99}
                    onChange={() => {}}
                    integerDigits={2}
                    fractionDigits={2}
                    max={0.999}
                />
            ))
        ).toThrow('Spinner bounds must be representable at the displayed precision');
    });

    it('normalizes floating-point bound dust for controlled arrow stepping', () => {
        const [value, setValue] = createSignal(0.3);
        render(() => (
            <Spinner
                label="Weight"
                value={value()}
                onChange={setValue}
                step={0.1}
                integerDigits={2}
                fractionDigits={2}
                min={0.1 + 0.2}
                max={0.999999999}
            />
        ));
        expect((screen.getByRole('button', { name: 'Decrease Weight' }) as HTMLButtonElement).disabled).toBe(true);
        for (let i = 0; i < 7; i += 1) {
            press(screen.getByRole('button', { name: 'Increase Weight' }));
        }
        expect(value()).toBe(1);
        expect((screen.getByRole('button', { name: 'Increase Weight' }) as HTMLButtonElement).disabled).toBe(true);
        press(screen.getByRole('button', { name: 'Decrease Weight' }));
        expect(value()).toBe(0.9);
        press(screen.getByRole('button', { name: 'Increase Weight' }));
        expect(value()).toBe(1);
    });

    it('keeps number-pad edits within representable fractional bounds', () => {
        const [lowerValue, setLowerValue] = createSignal(0.01);
        render(() => (
            <Spinner
                label="Lower"
                value={lowerValue()}
                onChange={setLowerValue}
                integerDigits={2}
                fractionDigits={2}
                min={0.01}
                max={0.99}
            />
        ));
        press(screen.getByRole('button', { name: /Lower: 00.01/ }));
        press(screen.getByRole('button', { name: 'Digit 0' }));
        expect(lowerValue()).toBe(0.01);
        cleanup();

        const [upperValue, setUpperValue] = createSignal(0.99);
        render(() => (
            <Spinner
                label="Upper"
                value={upperValue()}
                onChange={setUpperValue}
                integerDigits={2}
                fractionDigits={2}
                min={0.01}
                max={0.99}
            />
        ));
        press(screen.getByRole('button', { name: /Upper: 00.99/ }));
        press(screen.getByRole('button', { name: 'Digit 9' }));
        expect(upperValue()).toBe(0.99);
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
        press(screen.getByRole('button', { name: 'End' }));
        expect(dialog.dataset.phase).toBe('closing');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(opener);
    });
});
