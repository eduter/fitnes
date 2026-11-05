import { Button } from '../components/Button/Button.tsx';
import { For, Show, createEffect, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { DateField, NumberField } from '../components/fields.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { RawDocument } from '../components/RawDocument.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import type { BodyweightMeasurement } from '../domain/bodyweight.ts';
import { formatMass, massValue } from '../domain/convertWeight.ts';
import { generateBodyweightMeasurementId } from '../domain/generateIds.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { formatDate, fromDateLocalValue, toDateLocalValue } from '../utils/datetime.ts';

/** Bodyweight history. New readings are added; existing ones persist as they are edited. */
function BodyweightPage(): JSX.Element {
    const app = useAppData();
    const [value, setValue] = createSignal(massValue({ value: 80, unit: 'kg' }, app.massUnit(), 1));
    let initialized = false;
    createEffect(() => {
        const latest = app.bodyweightMeasurements()[0];
        if (!initialized && latest) {
            initialized = true;
            setValue(massValue(latest, app.massUnit(), 1));
        }
    });
    const [measuredAt, setMeasuredAt] = createSignal(Date.now());
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const [expanded, setExpanded] = createSignal<string | null>(null);

    async function add(): Promise<void> {
        const result = await app.saveBodyweight({
            id: generateBodyweightMeasurementId(),
            measuredAt: fromDateLocalValue(toDateLocalValue(measuredAt())),
            value: value(),
            unit: app.massUnit(),
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
                    <NumberField
                        label={`Weight (${app.massUnit()})`}
                        min={0.1}
                        step={0.1}
                        fractionDigits={1}
                        value={value()}
                        onChange={setValue}
                    />
                    <DateField label="Date" value={measuredAt()} onChange={setMeasuredAt} />
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
    const app = useAppData();
    return (
        <div class="card reading-row" classList={{ 'reading-row--expanded': props.expanded }}>
            <div class="planned-set__row">
                <div class="planned-set__text">
                    <Button class="planned-set__summary" aria-expanded={props.expanded} onPress={props.onToggle}>
                        {formatMass(props.measurement, app.massUnit(), 1)}
                    </Button>
                    <span class="planned-set__detail">{formatDate(props.measurement.measuredAt)}</span>
                </div>
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
                            label={`Weight (${app.massUnit()})`}
                            min={0.1}
                            step={0.1}
                            fractionDigits={1}
                            value={massValue(props.measurement, app.massUnit(), 1)}
                            onChange={(next) =>
                                props.onEdit({ ...props.measurement, value: next, unit: app.massUnit() })
                            }
                        />
                        <DateField
                            label="Date"
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
