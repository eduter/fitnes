import { Button } from '../components/Button/Button.tsx';
import { createSignal, Show, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { OptionPicker } from '../components/OptionPicker/OptionPicker.tsx';
import type { WeightUnit } from '../domain/units.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { countRecords, type DataExport } from '../domain/dataExport.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { downloadTextFile } from '../utils/download.ts';

/**
 * Import and export the whole database as one JSON document. Export reads the
 * stored rows directly, so it still works when a row cannot be loaded; import
 * validates the entire document before writing, so a bad paste leaves the
 * current data untouched.
 */
function DataPage(): JSX.Element {
    const app = useAppData();
    const [draft, setDraft] = createSignal('');
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const [status, setStatus] = createSignal<string | null>(null);

    async function show(): Promise<void> {
        setErrors([]);
        setStatus(null);
        setDraft(await app.exportData());
    }

    async function download(): Promise<void> {
        setErrors([]);
        const text = await app.exportData();
        setDraft(text);
        downloadTextFile(`fitnes-data-${new Date().toISOString().slice(0, 10)}.json`, text);
        setStatus('Downloaded the current database.');
    }

    async function replaceAll(): Promise<void> {
        setErrors([]);
        setStatus(null);

        if (draft().trim() === '') {
            setErrors([{ path: '', message: 'Paste an export document before replacing' }]);
            return;
        }
        if (!confirm('Replace ALL local data with the pasted document? This cannot be undone.')) {
            return;
        }

        const result = await app.importData(draft());
        setErrors(result.ok ? [] : result.errors);
        if (result.ok) {
            setStatus(`Replaced local data — ${describe(result.value)}`);
        }
    }

    return (
        <section class="page">
            <PageHeader title="Settings" />
            <OptionPicker
                label="Mass unit"
                value={app.massUnit()}
                options={[
                    { value: 'kg', label: 'kg' },
                    { value: 'lb', label: 'lb' },
                ]}
                onChange={(unit) => app.setMassUnit(unit as WeightUnit)}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <h2 class="section-title">Data</h2>
            <p class="muted">
                The whole database as one JSON document. Replacing is a full overwrite: anything not in the pasted
                document is deleted.
            </p>
            <ValidationErrors errors={errors()} />
            <Show when={status()}>{(message) => <p class="muted">{message()}</p>}</Show>
            <div class="card stack">
                <h2 class="card-title">Export</h2>
                <div class="inline-fields">
                    <Button type="button" onPress={() => void show()}>
                        Show current data
                    </Button>
                    <Button type="button" onPress={() => void download()}>
                        Download JSON
                    </Button>
                </div>
            </div>
            <div class="card stack">
                <h2 class="card-title">Import</h2>
                <label class="form-field">
                    <span class="form-label">Document</span>
                    <textarea
                        class="form-input data-document"
                        rows={14}
                        spellcheck={false}
                        placeholder="Paste an export document here"
                        value={draft()}
                        onInput={(event) => setDraft(event.currentTarget.value)}
                    />
                </label>
                <div class="inline-fields">
                    <Button type="button" onPress={() => void show()}>
                        Load current data
                    </Button>
                    <Button type="button" onPress={() => void replaceAll()}>
                        Replace all local data
                    </Button>
                </div>
            </div>
        </section>
    );
}

/** Summarise an imported document as record counts, so a paste can be sanity-checked. */
function describe(value: DataExport): string {
    const counts = countRecords(value);
    return `${counts.exercises} exercises, ${counts.templates} templates, ${counts.sessions} sessions, ${counts.bodyweightMeasurements} bodyweight readings`;
}

export { DataPage };
