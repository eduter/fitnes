import { For, Show, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { DateTimeField, NumberField, SelectField } from '../components/fields.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { RawDocument } from '../components/RawDocument.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import { formatWeight } from '../domain/format.ts';
import { generateBodyweightMeasurementId } from '../domain/generateIds.ts';
import type { WeightUnit } from '../domain/units.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { formatDateTime } from '../utils/datetime.ts';

/** Bodyweight history. New readings are added; existing ones persist as they are edited. */
function BodyweightPage(): JSX.Element {
    const app = useAppData();
    const [value, setValue] = createSignal(80);
    const [unit, setUnit] = createSignal<WeightUnit>('kg');
    const [measuredAt, setMeasuredAt] = createSignal(Date.now());
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);

    async function add(): Promise<void> {
        const result = await app.saveBodyweight({
            id: generateBodyweightMeasurementId(),
            measuredAt: measuredAt(),
            value: value(),
            unit: unit(),
        });
        setErrors(result.ok ? [] : result.errors);
        if (result.ok) {
            setMeasuredAt(Date.now());
        }
    }

    async function edit(measurement: BodyweightMeasurement): Promise<void> {
        const result = await app.saveBodyweight(measurement);
        setErrors(result.ok ? [] : result.errors);
    }

    async function remove(id: string): Promise<void> {
        if (!confirm('Delete this bodyweight reading? Sessions keep their snapshots.')) {
            return;
        }
        await app.removeBodyweight(id);
    }

    return (
        <section class="page">
            <PageHeader title="Bodyweight" />
            <ValidationErrors errors={errors()} />
            <div class="card stack">
                <h2 class="card-title">Add reading</h2>
                <div class="inline-fields">
                    <NumberField label="Value" min={0} value={value()} onChange={setValue} />
                    <SelectField
                        label="Unit"
                        value={unit()}
                        options={[
                            { value: 'kg', label: 'kg' },
                            { value: 'lb', label: 'lb' },
                        ]}
                        onChange={(next) => setUnit(next as WeightUnit)}
                    />
                    <DateTimeField label="Measured at" value={measuredAt()} onChange={setMeasuredAt} />
                </div>
                <button class="btn btn--primary" type="button" onClick={() => void add()}>
                    Add
                </button>
            </div>
            <ul class="list">
                <For each={app.bodyweightMeasurements()} fallback={<li class="muted">No readings yet.</li>}>
                    {(measurement) => (
                        <li class="card stack">
                            <div class="row-split">
                                <strong>
                                    {formatWeight(measurement)} · {formatDateTime(measurement.measuredAt)}
                                </strong>
                                <button
                                    class="btn btn--secondary"
                                    type="button"
                                    onClick={() => void remove(measurement.id)}
                                >
                                    Delete
                                </button>
                            </div>
                            <div class="inline-fields">
                                <NumberField
                                    label="Value"
                                    min={0}
                                    value={measurement.value}
                                    onChange={(next) => void edit({ ...measurement, value: next })}
                                />
                                <SelectField
                                    label="Unit"
                                    value={measurement.unit}
                                    options={[
                                        { value: 'kg', label: 'kg' },
                                        { value: 'lb', label: 'lb' },
                                    ]}
                                    onChange={(next) => void edit({ ...measurement, unit: next as WeightUnit })}
                                />
                                <DateTimeField
                                    label="Measured at"
                                    value={measurement.measuredAt}
                                    onChange={(next) => void edit({ ...measurement, measuredAt: next })}
                                />
                            </div>
                            <RawDocument value={measurement} />
                        </li>
                    )}
                </For>
            </ul>
            <Show when={app.bodyweightMeasurements().length === 0}>
                <p class="muted">
                    Sessions can start without a snapshot; weighted bodyweight totals will then be undefined.
                </p>
            </Show>
        </section>
    );
}

export { BodyweightPage };
