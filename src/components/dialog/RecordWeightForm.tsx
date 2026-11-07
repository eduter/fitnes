import { createEffect, createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../../app/AppData.tsx';
import type { BodyweightMeasurement } from '../../domain/bodyweight.ts';
import { massValue } from '../../domain/convertWeight.ts';
import { generateBodyweightMeasurementId } from '../../domain/generateIds.ts';
import { fromDateLocalValue, toDateLocalValue } from '../../utils/datetime.ts';
import { DialogActions } from '../DialogActions.tsx';
import { DateField } from '../fields.tsx';
import { Spinner } from '../Spinner/Spinner.tsx';

/** Keep a weight reading as a draft until Save; Cancel leaves stored data unchanged. */
function RecordWeightForm(props: RecordWeightFormProps): JSX.Element {
    const app = useAppData();
    const latest = () => app.bodyweightMeasurements()[0];
    const [value, setValue] = createSignal(massValue(latest() ?? { value: 80, unit: 'kg' }, app.massUnit(), 1));
    const [date, setDate] = createSignal(Date.now());
    const [busy, setBusy] = createSignal(false);
    const [error, setError] = createSignal('');
    const initialValue = value();
    const initialDate = toDateLocalValue(date());
    createEffect(() => props.onDirtyChange?.(value() !== initialValue || toDateLocalValue(date()) !== initialDate));
    let initialized = false;
    let form: HTMLFormElement | undefined;

    createEffect(() => {
        const reading = latest();
        if (!initialized && reading) {
            initialized = true;
            setValue(massValue(reading, app.massUnit(), 1));
        }
    });

    async function submit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        if (busy()) {
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = await app.saveBodyweight({
                id: generateBodyweightMeasurementId(),
                value: value(),
                unit: app.massUnit(),
                measuredAt: fromDateLocalValue(toDateLocalValue(date())),
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
        <form ref={form} class="stack record-weight" onSubmit={(event) => void submit(event)}>
            <div class="record-weight__row">
                <DateField label="Date" value={date()} onChange={setDate} />
                <Spinner
                    label={`Weight (${app.massUnit()})`}
                    value={value()}
                    onChange={setValue}
                    min={0.1}
                    step={0.1}
                    integerDigits={3}
                    fractionDigits={1}
                    popoverMount={document.getElementById('root') ?? undefined}
                />
            </div>
            <Show when={error()}>
                <p role="alert" class="error-text">
                    {error()}
                </p>
            </Show>
            <DialogActions
                kind="save"
                disabled={busy()}
                onCancel={props.onCancel}
                onConfirm={() => form?.requestSubmit()}
            />
        </form>
    );
}

/** Both exits belong to the containing menu; only a saved reading reaches onRecorded. */
interface RecordWeightFormProps {
    onDirtyChange?: (dirty: boolean) => void;
    onRecorded: (weight: BodyweightMeasurement) => void;
    onCancel: () => void;
}

export { RecordWeightForm };
