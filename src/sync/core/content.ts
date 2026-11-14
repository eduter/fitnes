/** Deterministically encode JSON while preserving array order. */
function stableJson(value: unknown): string {
    return JSON.stringify(value, (_key, item: unknown) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right, 'en')));
        }
        return item;
    });
}

/** Hash validated canonical bytes without relying on device timestamps. */
async function fingerprint(content: string): Promise<string> {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export { fingerprint, stableJson };
