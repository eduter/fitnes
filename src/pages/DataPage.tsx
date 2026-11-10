import { Button, ConfirmDialog, FilePicker, TextArea } from '../components/Controls/index.ts';
import { createSignal, Show, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { OptionPicker } from '../components/OptionPicker/OptionPicker.tsx';
import type { WeightUnit } from '../domain/units.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { countRecords, type DataExport, parseDataExport } from '../domain/dataExport.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { downloadTextFile } from '../utils/download.ts';

/**
 * Import and export the whole database as one JSON document. Export reads the
 * stored rows directly, so it still works when a row cannot be loaded; import
 * validates the entire document before writing, so an invalid document leaves the
 * current data untouched.
 */
function DataPage(): JSX.Element {
    const app = useAppData();
    const [confirming, setConfirming] = createSignal(false);
    let trigger: HTMLElement | undefined;
    const [draft, setDraft] = createSignal('');
    const [reading, setReading] = createSignal(false);
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

    async function loadFile(file: File): Promise<void> {
        setReading(true);
        setErrors([]);
        setStatus(null);
        setDraft('');

        try {
            const text = await file.text();
            const parsed = parseDataExport(text);
            if (!parsed.ok) {
                setErrors(parsed.errors);
                return;
            }
            setDraft(text);
            setStatus(`Loaded ${file.name} — ${describe(parsed.value)}`);
        } catch {
            setErrors([{ path: '', message: `Could not read ${file.name}. Choose the file again.` }]);
        } finally {
            setReading(false);
        }
    }

    async function replaceAll(): Promise<void> {
        setErrors([]);
        setStatus(null);

        if (draft().trim() === '') {
            setErrors([{ path: '', message: 'Choose a JSON file or paste an export document before replacing' }]);
            return;
        }

        const result = await app.importData(draft());
        setErrors(result.ok ? [] : result.errors);
        if (result.ok) {
            setStatus(`Replaced local data — ${describe(result.value)}`);
        }
    }

    return (
        <section class="page data-page">
            <ConfirmDialog
                open={confirming()}
                onOpenChange={setConfirming}
                message="Replace ALL local data with this document? Export a backup first."
                onConfirm={() => void replaceAll()}
                trigger={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            />
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
                Export workout data as JSON. Import replaces exercises, templates, sessions and weight history.
            </p>
            <ValidationErrors errors={errors()} />
            <Show when={status()}>{(message) => <p class="muted">{message()}</p>}</Show>
            <div class="card stack">
                <h2 class="card-title">Export</h2>
                <div class="inline-fields">
                    <Button type="button" disabled={reading()} onPress={() => void show()}>
                        Show current data
                    </Button>
                    <Button type="button" disabled={reading()} onPress={() => void download()}>
                        Download JSON
                    </Button>
                </div>
            </div>
            <div class="card stack">
                <h2 class="card-title">Import</h2>
                <FilePicker
                    label="Choose file"
                    accept=".json,application/json"
                    disabled={reading()}
                    onSelect={(file) => void loadFile(file)}
                />
                <Show when={reading()}>
                    <p role="status">Reading file…</p>
                </Show>
                <TextArea label="Document" rows={5} value={draft()} disabled={reading()} onChange={setDraft} />
                <div class="inline-fields">
                    <Button type="button" disabled={reading()} onPress={() => void show()}>
                        Load current data
                    </Button>
                    <Button
                        type="button"
                        disabled={reading()}
                        onPress={(event) => {
                            trigger = event.currentTarget;
                            setConfirming(true);
                        }}
                    >
                        Replace all local data
                    </Button>
                </div>
            </div>
        </section>
    );
}

/** Summarise an imported document as record counts, so an import can be sanity-checked. */
function describe(value: DataExport): string {
    const counts = countRecords(value);
    return `${counts.exercises} exercises, ${counts.templates} workouts, ${counts.sessions} sessions, ${counts.bodyweightMeasurements} bodyweight readings`;
}

export { DataPage };
