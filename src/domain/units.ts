import { type } from 'arktype';

/** A finite, non-negative number; rejects `NaN` and infinities. */
const nonNegativeFinite = type('number >= 0').narrow((n, ctx) => Number.isFinite(n) || ctx.mustBe('a finite number'));

/** A finite, strictly positive number; rejects zero, `NaN`, and infinities. */
const positiveFinite = type('number > 0').narrow((n, ctx) => Number.isFinite(n) || ctx.mustBe('a finite number'));

/** A strictly positive integer, used for planned repetition targets. */
const positiveCount = type('number.integer > 0');

/** A non-negative integer, used for performed repetitions where zero means "did none". */
const nonNegativeCount = type('number.integer >= 0');

/** Epoch milliseconds. Integer and non-negative so timestamps sort and compare reliably. */
const epochMillis = type('number.integer >= 0');

/** Units of mass the app records. Values are never converted between units implicitly. */
const weightUnit = type('"kg" | "lb"');
type WeightUnit = typeof weightUnit.infer;

/** A mass with an explicit unit. A bare number is never a valid weight. */
const weight = type({ value: nonNegativeFinite, unit: weightUnit }).onUndeclaredKey('reject');
type Weight = typeof weight.infer;

export { epochMillis, nonNegativeCount, nonNegativeFinite, positiveCount, positiveFinite, weight, weightUnit };
export type { Weight, WeightUnit };
