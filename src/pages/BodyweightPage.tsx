import { createMemo, createSignal, For, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { DraftGuard } from '../app/DraftGuard.tsx';
import { Button, ConfirmDialog, OptionPicker, Popover } from '../components/Controls/index.ts';
import { DialogActions } from '../components/DialogActions.tsx';
import { RecordWeightForm } from '../components/dialog/RecordWeightForm.tsx';
import { DateField, NumberField } from '../components/fields.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { ProgressChart } from '../components/ProgressChart/ProgressChart.tsx';
import { GraphHelp } from '../components/ProgressChart/ProgressDialog.tsx';
import { DialogTitle } from '../components/Typography.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import { formatMass, massValue } from '../domain/convertWeight.ts';
import { bodyweightProgress, progressRanges, rangeStart } from '../domain/progress.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { formatDate } from '../utils/datetime.ts';

/** Record and review local readings without expanding rows or shifting history. */
function BodyweightPage(): JSX.Element {
    const app = useAppData();
    const [recordsOpen, setRecordsOpen] = createSignal(false);
    let recordsTrigger: HTMLElement | undefined;
    const latest = () => app.bodyweightMeasurements()[0];
    const [range, setRange] = createSignal('3');
    const points = createMemo(() =>
        bodyweightProgress(app.bodyweightMeasurements(), app.massUnit()).filter(
            (point) => point.at >= rangeStart(range(), Date.now())
        )
    );
    const series = () => [
        { label: 'Daily', points: points() },
        { label: '7-day average', points: points().map((point) => ({ at: point.at, value: point.average })) },
    ];
    const [adding, setAdding] = createSignal(false);
    const [readingDirty, setReadingDirty] = createSignal(false);
    const [discardReading, setDiscardReading] = createSignal(false);
    const [editing, setEditing] = createSignal<BodyweightMeasurement>();
    const [editorOpen, setEditorOpen] = createSignal(false);
    const [deleting, setDeleting] = createSignal<BodyweightMeasurement>();
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    let trigger: HTMLElement | undefined;
    async function edit(next: BodyweightMeasurement): Promise<void> {
        setEditing(next);
        const result = await app.saveBodyweight(next);
        setErrors(result.ok ? [] : result.errors);
    }
    return (
        <section class="page">
            <DraftGuard dirty={adding() && readingDirty()} />
            <ConfirmDialog
                open={discardReading()}
                onOpenChange={setDiscardReading}
                message="Discard unsaved reading?"
                onConfirm={() => setAdding(false)}
                mount={document.getElementById('root') ?? undefined}
            />
            <PageHeader
                title="Bodyweight"
                actions={
                    <Button
                        disabled={app.loadState() !== 'ready'}
                        onPress={(event) => {
                            trigger = event.currentTarget;
                            setAdding(true);
                        }}
                    >
                        Record
                    </Button>
                }
            />
            <Show when={latest()} fallback={<p>No readings yet. Record your first weight.</p>}>
                {(reading) => (
                    <p>
                        {formatMass(reading(), app.massUnit(), 1)} · {formatDate(reading().measuredAt)}
                    </p>
                )}
            </Show>
            <OptionPicker
                label="Period"
                options={progressRanges}
                value={range()}
                onChange={setRange}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <ProgressChart
                label="Bodyweight"
                unit={app.massUnit()}
                series={series()}
                height={192}
                empty="No readings in this period."
            />
            <div class="button-row">
                <Button
                    onPress={(event) => {
                        recordsTrigger = event.currentTarget;
                        setRecordsOpen(true);
                    }}
                >
                    Records
                </Button>
                <GraphHelp explanation="Daily shows the mean of that day's readings. The 7-day average uses recorded days in the trailing seven calendar days." />
            </div>
            <Popover
                open={recordsOpen()}
                onOpenChange={setRecordsOpen}
                label="Weight records"
                anchor={() => recordsTrigger}
                returnFocus={() => recordsTrigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="stack">
                    <DialogTitle>Weight records</DialogTitle>
                    <Show when={app.bodyweightMeasurements().length} fallback={<p>No readings yet.</p>}>
                        <For each={app.bodyweightMeasurements()}>
                            {(reading) => (
                                <article class="card">
                                    <p>
                                        {formatMass(reading, app.massUnit(), 1)} · {formatDate(reading.measuredAt)}
                                    </p>
                                    <div class="button-row">
                                        <Button
                                            onPress={(event) => {
                                                trigger = event.currentTarget;
                                                setEditing(reading);
                                                setErrors([]);
                                                setEditorOpen(true);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            onPress={(event) => {
                                                trigger = event.currentTarget;
                                                setDeleting(reading);
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </article>
                            )}
                        </For>
                    </Show>
                    <DialogActions kind="end" onConfirm={() => setRecordsOpen(false)} />
                </div>
            </Popover>
            <Popover
                open={adding()}
                onOpenChange={(open) => {
                    if (!open && readingDirty()) {
                        setDiscardReading(true);
                    } else {
                        setAdding(open);
                    }
                }}
                label="Record weight"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <RecordWeightForm
                    onDirtyChange={setReadingDirty}
                    onCancel={() => setAdding(false)}
                    onRecorded={() => setAdding(false)}
                />
            </Popover>
            <Popover
                open={editorOpen()}
                onOpenChange={setEditorOpen}
                label="Edit weight"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <Show when={editing()}>
                    {(reading) => (
                        <div class="editor-fields">
                            <DialogTitle>Edit weight</DialogTitle>
                            <NumberField
                                label={`Weight (${app.massUnit()})`}
                                min={0.1}
                                step={0.1}
                                fractionDigits={1}
                                value={massValue(reading(), app.massUnit(), 1)}
                                onChange={(value) => void edit({ ...reading(), value, unit: app.massUnit() })}
                            />
                            <DateField
                                label="Date"
                                value={reading().measuredAt}
                                onChange={(measuredAt) => void edit({ ...reading(), measuredAt })}
                            />
                            <ValidationErrors errors={errors()} />
                            <DialogActions kind="end" onConfirm={() => setEditorOpen(false)} />
                        </div>
                    )}
                </Show>
            </Popover>
            <ConfirmDialog
                open={deleting() !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(undefined);
                    }
                }}
                message={`Delete ${deleting() ? formatMass(deleting() as BodyweightMeasurement, app.massUnit(), 1) : 'reading'}?`}
                onConfirm={() => {
                    const reading = deleting();
                    if (reading) {
                        void app.removeBodyweight(reading.id);
                    }
                }}
                trigger={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            />
        </section>
    );
}

export { BodyweightPage };
