import { Button } from '../components/Button/Button.tsx';
import { A, useNavigate, useParams } from '@solidjs/router';
import { Show, createEffect, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { SelectField, DateField, NumberField } from '../components/fields.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { latestBodyweightAtOrBefore, type BodyweightMeasurement } from '../domain/bodyweight.ts';
import { formatMass, massValue } from '../domain/convertWeight.ts';
import { generateBodyweightMeasurementId } from '../domain/generateIds.ts';
import { templateUsesBodyweight } from '../domain/lookups.ts';
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
    const [value, setValue] = createSignal(massValue({ value: 80, unit: 'kg' }, app.massUnit(), 1));
    const [measuredAt, setMeasuredAt] = createSignal(Date.now());
    const [busy, setBusy] = createSignal(false);
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
        if (busy()) {
            return;
        }
        setBusy(true);
        try {
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
                    unit: app.massUnit(),
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
        } finally {
            setBusy(false);
        }
    }

    return (
        <section class="page">
            <Show
                when={template()}
                fallback={
                    <p class="muted">
                        Workout not found. <A href="/templates">Back to workouts</A>
                    </p>
                }
            >
                {(plan) => (
                    <>
                        <PageHeader
                            title={plan().name}
                            actions={<Button onPress={() => navigate('/workouts')}>Back</Button>}
                        />
                        <ValidationErrors errors={errors()} />
                        <Show
                            when={templateUsesBodyweight(plan())}
                            fallback={
                                <p class="muted">This plan does not use body mass. You can still attach a snapshot.</p>
                            }
                        >
                            <p>This plan includes bodyweight or weighted-bodyweight sets.</p>
                        </Show>
                        <SelectField
                            label="Bodyweight"
                            value={mode()}
                            options={[
                                { value: 'none', label: 'Do not attach' },
                                ...(latest() ? [{ value: 'latest', label: 'Use latest' }] : []),
                                { value: 'new', label: 'Record new' },
                            ]}
                            onChange={(value) => choose(value as BodyweightMode)}
                        />
                        <Show when={mode() === 'latest' && latest()}>
                            {(reading) => (
                                <p>
                                    {formatMass(reading(), app.massUnit(), 1)} · {formatDate(reading().measuredAt)}
                                </p>
                            )}
                        </Show>
                        <Show when={mode() === 'new'}>
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
                        </Show>
                        <Button type="button" disabled={busy()} onPress={() => void start()}>
                            Start
                        </Button>
                    </>
                )}
            </Show>
        </section>
    );
}

export { StartSessionPage };
