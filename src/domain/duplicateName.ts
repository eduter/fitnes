const COPY_SUFFIX = /^(.*) \(copy(?: (\d+))?\)$/;

/**
 * Name a duplicate `Name (copy)`, numbering further copies of the same base
 * `Name (copy 2)`, `Name (copy 3)`. Numbering rather than nesting keeps the
 * name from growing a suffix per duplication.
 */
function duplicateName(name: string): string {
    const match = COPY_SUFFIX.exec(name);
    if (!match) {
        return `${name} (copy)`;
    }

    const base = match[1] ?? '';
    const count = match[2] === undefined ? 1 : Number(match[2]);

    return `${base} (copy ${count + 1})`;
}

export { duplicateName };
