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
    return new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(ms));
}

export { formatDateTime, fromDatetimeLocalValue, toDatetimeLocalValue };
