/** Resolution, fixed mask and valid bounds for a signed numerical control. */
interface NumberMask {
    integerDigits: number;
    fractionDigits: number;
    min: number;
    max: number;
}

/** Format a signed quantity into fixed digit places without changing their width. */
function formatMaskedNumber(value: number, mask: NumberMask): string {
    const { integerDigits, fractionDigits } = mask;
    const digits = String(Math.round(Math.abs(value) * 10 ** fractionDigits)).padStart(
        integerDigits + fractionDigits,
        '0'
    );
    const magnitude = fractionDigits ? `${digits.slice(0, integerDigits)}.${digits.slice(integerDigits)}` : digits;
    return `${value < 0 ? '-' : ''}${magnitude}`;
}

/** Step in integer units of the displayed precision, including fractional loads and clamped bounds. */
function stepNumber(value: number, step: number, direction: 1 | -1, mask: NumberMask): number {
    const { fractionDigits, min, max } = mask;
    const scale = 10 ** fractionDigits;
    const units = Math.round(value * scale) + direction * Math.round(step * scale);
    return Math.min(Math.round(max * scale), Math.max(Math.round(min * scale), units)) / scale;
}

/** Replace a single digit of the mask and clamp the resulting number to its valid range. */
function replaceNumberDigit(value: number, slot: number, digit: number, mask: NumberMask): number {
    const { fractionDigits, min, max } = mask;
    const digits = formatMaskedNumber(Math.abs(value), mask).replace('.', '').split('');
    digits[slot] = String(digit);
    return Math.min(max, Math.max(min, ((value < 0 ? -1 : 1) * Number(digits.join(''))) / 10 ** fractionDigits));
}

export { formatMaskedNumber, stepNumber, replaceNumberDigit };
export type { NumberMask };
