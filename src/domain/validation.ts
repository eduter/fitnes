/** A single reason a document failed validation, located by field path. */
interface ValidationIssue {
    path: string;
    message: string;
}

/**
 * The outcome of validating an untrusted document. On success the parsed value
 * is returned with its TypeScript type narrowed; on failure every issue is
 * reported so a caller can show all problems at once.
 */
type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationIssue[] };

/** Render ordered path segments as `sets[0].prescription.measurement`. */
function formatPath(segments: readonly PropertyKey[]): string {
    let path = '';

    for (const segment of segments) {
        if (typeof segment === 'number') {
            path += `[${segment}]`;
            continue;
        }
        const key = String(segment);
        path = path === '' ? key : `${path}.${key}`;
    }

    return path;
}

/** Collects issues in field order while validating a document's cross-references. */
class IssueCollector {
    readonly issues: ValidationIssue[] = [];

    add(segments: readonly PropertyKey[], message: string): void {
        this.issues.push({ path: formatPath(segments), message });
    }

    /** Record duplicate occurrences of `id` across `entries`, reporting each repeat once. */
    addDuplicates(parent: readonly PropertyKey[], kind: string, entries: { id: string }[]): void {
        const seen = new Set<string>();

        for (const [index, entry] of entries.entries()) {
            if (seen.has(entry.id)) {
                this.add([...parent, index, 'id'], `duplicate ${kind} id '${entry.id}'`);
                continue;
            }
            seen.add(entry.id);
        }
    }
}

export { formatPath, IssueCollector };
export type { ValidationIssue, ValidationResult };
