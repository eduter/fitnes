import { Button } from '../Button/Button.tsx';
import { Spinner } from '../Spinner/Spinner.tsx';
import { createEffect, createSignal, Show, type JSX } from 'solid-js';
import { useAppData } from '../../app/AppData.tsx';
import type { BodyweightMeasurement } from '../../domain/bodyweight.ts';
import { generateBodyweightMeasurementId } from '../../domain/generateIds.ts';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../../utils/datetime.ts';

/** Record a validated reading and leave the form open if persistence fails. */
function RecordWeightForm(props: RecordWeightFormProps): JSX.Element {
    const app = useAppData();
    const latest = () => app.bodyweightMeasurements()[0];
    const [value, setValue] = createSignal(latest()?.value ?? 80);
    const [unit, setUnit] = createSignal<'kg' | 'lb'>(latest()?.unit ?? 'kg');
    let initialized = false;
    createEffect(() => {
        const reading = latest();
        if (!initialized && reading) {
            initialized = true;
            setValue(reading.value);
            setUnit(reading.unit);
        }
    });
    const [busy, setBusy] = createSignal(false);
    const [error, setError] = createSignal('');

    async function submit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        if (busy()) {
            return;
        }
        const form = event.currentTarget as HTMLFormElement;
        const data = new FormData(form);
        setBusy(true);
        setError('');
        try {
            const result = await app.saveBodyweight({
                id: generateBodyweightMeasurementId(),
                value: value(),
                unit: unit(),
                measuredAt: fromDatetimeLocalValue(String(data.get('measuredAt'))),
            });
            if (!result.ok) {
                setError(result.errors.map((issue) => issue.message).join('. '));
                return;
            }
            props.onRecorded(result.value);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not record weight. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form class="stack" onSubmit={(event) => void submit(event)}>
            <div class="weight-fields">
                <Spinner
                    label="Weight"
                    value={value()}
                    onChange={setValue}
                    min={0.01}
                    step={0.1}
                    integerDigits={3}
                    fractionDigits={2}
                    popoverMount={document.getElementById('root') ?? undefined}
                />
                <label class="form-field">
                    <span class="form-label">Unit</span>
                    <select
                        class="form-input"
                        name="unit"
                        value={unit()}
                        onChange={(event) => setUnit(event.currentTarget.value as 'kg' | 'lb')}
                    >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                    </select>
                </label>
            </div>
            <label class="form-field">
                <span class="form-label">Measured at</span>
                <input
                    class="form-input"
                    name="measuredAt"
                    type="datetime-local"
                    value={toDatetimeLocalValue(Date.now())}
                    required
                />
            </label>
            <Show when={error()}>
                <p role="alert" class="error-text">
                    {error()}
                </p>
            </Show>
            <Button disabled={busy()} onPress={(event) => event.currentTarget.form?.requestSubmit()}>
                {busy() ? 'Recording…' : 'Add reading'}
            </Button>
        </form>
    );
}

interface RecordWeightFormProps {
    onRecorded: (weight: BodyweightMeasurement) => void;
}

export { RecordWeightForm };
