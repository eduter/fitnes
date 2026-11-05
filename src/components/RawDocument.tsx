import type { JSX } from 'solid-js';

interface RawDocumentProps {
    value: unknown;
}

/** Dump the persisted document so the data model is visible while dogfooding. */
function RawDocument(props: RawDocumentProps): JSX.Element {
    return (
        <details class="raw-document">
            <summary>Raw document</summary>
            <pre>{JSON.stringify(props.value, null, 2)}</pre>
        </details>
    );
}

export { RawDocument };
