import { Button } from '../components/Button/Button.tsx';
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
    const [expanded, setExpanded] = createSignal<string | null>(null);

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
                <Button type="button" onPress={() => void add()}>
                    Add
                </Button>
            </div>
            <ul class="list">
                <For each={app.bodyweightMeasurements()} fallback={<li class="muted">No readings yet.</li>}>
                    {(measurement) => (
                        <li>
                            <ReadingRow
                                measurement={measurement}
                                expanded={expanded() === measurement.id}
                                onToggle={() =>
                                    setExpanded((current) => (current === measurement.id ? null : measurement.id))
                                }
                                onEdit={(next) => void edit(next)}
                                onRemove={() => void remove(measurement.id)}
                            />
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

interface ReadingRowProps {
    measurement: BodyweightMeasurement;
    expanded: boolean;
    onToggle: () => void;
    onEdit: (measurement: BodyweightMeasurement) => void;
    onRemove: () => void;
}

/**
 * One reading as a single line — the mass and when it was taken — expanding in
 * place to the editor. History is read far more often than it is edited, so the
 * list pays only for what is read.
 */
function ReadingRow(props: ReadingRowProps): JSX.Element {
    return (
        <div class="card reading-row" classList={{ 'reading-row--expanded': props.expanded }}>
            <div class="planned-set__row">
                <Button
                    variant="plain"
                    class="planned-set__summary"
                    type="button"
                    aria-expanded={props.expanded}
                    onPress={props.onToggle}
                >
                    <span class="planned-set__text">
                        <span class="reading-row__value">{formatWeight(props.measurement)}</span>
                        <span class="planned-set__detail">{formatDateTime(props.measurement.measuredAt)}</span>
                    </span>
                    <span class="planned-set__caret" aria-hidden="true">
                        {props.expanded ? '-' : '+'}
                    </span>
                </Button>
                <Button
                    variant="plain"
                    class="btn btn--icon"
                    type="button"
                    aria-label="Delete reading"
                    onPress={props.onRemove}
                >
                    Del
                </Button>
            </div>
            <Show when={props.expanded}>
                <div class="planned-set__body">
                    <div class="inline-fields">
                        <NumberField
                            label="Value"
                            min={0}
                            value={props.measurement.value}
                            onChange={(next) => props.onEdit({ ...props.measurement, value: next })}
                        />
                        <SelectField
                            label="Unit"
                            value={props.measurement.unit}
                            options={[
                                { value: 'kg', label: 'kg' },
                                { value: 'lb', label: 'lb' },
                            ]}
                            onChange={(next) => props.onEdit({ ...props.measurement, unit: next as WeightUnit })}
                        />
                        <DateTimeField
                            label="Measured at"
                            value={props.measurement.measuredAt}
                            onChange={(next) => props.onEdit({ ...props.measurement, measuredAt: next })}
                        />
                    </div>
                    <RawDocument value={props.measurement} />
                </div>
            </Show>
        </div>
    );
}

export { BodyweightPage };
