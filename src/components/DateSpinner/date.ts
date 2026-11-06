/** Shift a calendar date without depending on day length or daylight-saving transitions. */
function shiftDate(value: string, days: number): string {
    if (!isCalendarDate(value)) {
        throw new Error(`Invalid calendar date: ${value}`);
    }
    const date = new Date(`${value}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    const result = date.toISOString().slice(0, 10);
    return isCalendarDate(result) ? result : value;
}

/** Validate the native date-input format, including actual month lengths. */
function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
        return false;
    }
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Today's date in the user's local calendar, without UTC conversion. */
function todayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export { isCalendarDate, shiftDate, todayDate };
