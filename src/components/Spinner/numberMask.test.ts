import { describe, expect, it } from 'vitest';
import { formatMaskedNumber, replaceNumberDigit, stepNumber } from './numberMask.ts';

const mask = { integerDigits: 3, fractionDigits: 2, min: 0, max: 999.99 };

describe('fixed numerical mask', () => {
    it('preserves places and handles carries and fractional equipment increments exactly', () => {
        expect(formatMaskedNumber(9.99, mask)).toBe('009.99');
        expect(formatMaskedNumber(stepNumber(9.99, 0.01, 1, mask), mask)).toBe('010.00');
        expect(stepNumber(0.1, 0.2, 1, mask)).toBe(0.3);
        expect(stepNumber(62.55, 1.25, 1, mask)).toBe(63.8);
    });
    it('clamps both spinner steps and digit replacement to the configured range', () => {
        expect(stepNumber(0.01, 2.5, -1, mask)).toBe(0);
        expect(stepNumber(999.99, 2.5, 1, mask)).toBe(999.99);
        expect(replaceNumberDigit(60, 2, 5, mask)).toBe(65);
        expect(replaceNumberDigit(0, 0, 9, { ...mask, max: 100 })).toBe(100);
    });
});

it('formats and edits negative loads while preserving their sign', () => {
    const signed = { ...mask, min: -999.99 };
    expect(formatMaskedNumber(-12.5, signed)).toBe('-012.50');
    expect(replaceNumberDigit(-12.5, 2, 3, signed)).toBe(-13.5);
    expect(stepNumber(0, 1, -1, signed)).toBe(-1);
});
