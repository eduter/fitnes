/** Format epoch millis as a `datetime-local` input value in the local timezone. */
function toDatetimeLocalValue(ms: number): string {
    const date = new Date(ms);
    const pad = (value: number): string => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a `datetime-local` value into epoch millis. */
function fromDatetimeLocalValue(value: string): number {
    return new Date(value).getTime();
}

/** Format epoch millis for display with the runtime locale. */
function formatDateTime(ms: number): string {
    return new Date(ms).toLocaleString();
}

/** Format a local calendar day without shifting it through UTC. */
function toDateLocalValue(ms: number): string {
    return toDatetimeLocalValue(ms).slice(0, 10);
}

/** Parse a date-only input at local midnight; reject invalid calendar days. */
function fromDateLocalValue(value: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return Number.NaN;
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime()) || toDateLocalValue(date.getTime()) !== value) {
        return Number.NaN;
    }
    return date.getTime();
}

/** Show only the recorded calendar day; legacy timestamp values remain intact in storage. */
function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString();
}

export {
    formatDateTime,
    fromDatetimeLocalValue,
    toDatetimeLocalValue,
    toDateLocalValue,
    fromDateLocalValue,
    formatDate,
};
