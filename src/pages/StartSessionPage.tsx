import { Button } from '../components/Button/Button.tsx';
import { A, useNavigate, useParams } from '@solidjs/router';
import { For, Show, createEffect, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { DateField, NumberField, SelectField } from '../components/fields.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { latestBodyweightAtOrBefore, type BodyweightMeasurement } from '../domain/bodyweight.ts';
import { formatWeight } from '../domain/format.ts';
import { generateBodyweightMeasurementId } from '../domain/generateIds.ts';
import { templateUsesBodyweight } from '../domain/lookups.ts';
import type { WeightUnit } from '../domain/units.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { formatDate, fromDateLocalValue, toDateLocalValue } from '../utils/datetime.ts';

type BodyweightMode = 'none' | 'latest' | 'new';

/** Choose bodyweight attachment, then start a session from a template. */
function StartSessionPage(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();
    const app = useAppData();
    const template = () => app.templates().find((candidate) => candidate.id === params.templateId);
    const latest = () => latestBodyweightAtOrBefore([...app.bodyweightMeasurements()].reverse(), Date.now());

    const [mode, setMode] = createSignal<BodyweightMode>('none');
    const [touchedMode, setTouchedMode] = createSignal(false);
    const [value, setValue] = createSignal(80);
    const [unit, setUnit] = createSignal<WeightUnit>('kg');
    const [measuredAt, setMeasuredAt] = createSignal(Date.now());
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);

    createEffect(() => {
        if (touchedMode()) {
            return;
        }
        const plan = template();
        if (plan && templateUsesBodyweight(plan) && latest()) {
            setMode('latest');
        }
    });

    function choose(next: BodyweightMode): void {
        setTouchedMode(true);
        setMode(next);
    }

    async function start(): Promise<void> {
        const plan = template();
        if (!plan) {
            return;
        }

        let bodyweight: BodyweightMeasurement | undefined;
        if (mode() === 'latest') {
            bodyweight = latest();
        } else if (mode() === 'new') {
            const saved = await app.saveBodyweight({
                id: generateBodyweightMeasurementId(),
                measuredAt: fromDateLocalValue(toDateLocalValue(measuredAt())),
                value: value(),
                unit: unit(),
            });
            if (!saved.ok) {
                setErrors(saved.errors);
                return;
            }
            bodyweight = saved.value;
        }

        const result = await app.startSession(plan, bodyweight);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        navigate(`/sessions/${result.value.id}`);
    }

    return (
        <section class="page">
            <Show
                when={template()}
                fallback={
                    <p class="muted">
                        Template not found. <A href="/templates">Back to templates</A>
                    </p>
                }
            >
                {(plan) => (
                    <>
                        <PageHeader title={`Start ${plan().name}`} />
                        <ValidationErrors errors={errors()} />
                        <Show
                            when={templateUsesBodyweight(plan())}
                            fallback={
                                <p class="muted">This plan does not use body mass. You can still attach a snapshot.</p>
                            }
                        >
                            <p>This plan includes bodyweight or weighted-bodyweight sets.</p>
                        </Show>
                        <fieldset class="form-field">
                            <legend class="form-label">Bodyweight snapshot</legend>
                            <label class="check-item">
                                <input
                                    type="radio"
                                    name="bw-mode"
                                    checked={mode() === 'none'}
                                    onChange={() => choose('none')}
                                />
                                Do not attach
                            </label>
                            <label class="check-item">
                                <input
                                    type="radio"
                                    name="bw-mode"
                                    checked={mode() === 'latest'}
                                    disabled={!latest()}
                                    onChange={() => choose('latest')}
                                />
                                Use latest
                                <Show when={latest()}>
                                    {(measurement) => (
                                        <>
                                            {' '}
                                            ({formatWeight(measurement())} at {formatDate(measurement().measuredAt)})
                                        </>
                                    )}
                                </Show>
                            </label>
                            <label class="check-item">
                                <input
                                    type="radio"
                                    name="bw-mode"
                                    checked={mode() === 'new'}
                                    onChange={() => choose('new')}
                                />
                                Record new now
                            </label>
                        </fieldset>
                        <Show when={mode() === 'new'}>
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
                                <DateField label="Date" value={measuredAt()} onChange={setMeasuredAt} />
                            </div>
                        </Show>
                        <Show when={app.bodyweightMeasurements().length > 0}>
                            <details>
                                <summary>History</summary>
                                <ul>
                                    <For each={app.bodyweightMeasurements()}>
                                        {(measurement) => (
                                            <li>
                                                {formatWeight(measurement)} · {formatDate(measurement.measuredAt)}
                                            </li>
                                        )}
                                    </For>
                                </ul>
                            </details>
                        </Show>
                        <Button type="button" onPress={() => void start()}>
                            Create session
                        </Button>
                    </>
                )}
            </Show>
        </section>
    );
}

export { StartSessionPage };
