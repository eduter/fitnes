import { OptionPicker } from './OptionPicker/OptionPicker.tsx';
import { Spinner } from './Spinner/Spinner.tsx';
import { TextInput } from './TextInput/TextInput.tsx';
import { For, type JSX } from 'solid-js';
import { fromDateLocalValue, toDateLocalValue } from '../utils/datetime.ts';

interface TextFieldProps {
    label: string;
    value: string;
    placeholder?: string;
    required?: boolean;
    onChange: (value: string) => void;
}

/** Labeled single-line text input. */
function TextField(props: TextFieldProps): JSX.Element {
    return (
        <TextInput
            label={props.label}
            value={props.value}
            placeholder={props.placeholder}
            required={props.required}
            onInput={(event) => props.onChange(event.currentTarget.value)}
        />
    );
}

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

/** Labeled multiline text input. */
function TextAreaField(props: TextAreaFieldProps): JSX.Element {
    return (
        <label class="form-field">
            <span class="form-label">{props.label}</span>
            <textarea
                class="form-input"
                rows={3}
                value={props.value}
                onInput={(event) => props.onChange(event.currentTarget.value)}
            />
        </label>
    );
}

interface NumberFieldProps {
    label: string;
    value: number;
    min?: number;
    step?: number | string;
    disabled?: boolean;
    onChange: (value: number) => void;
}

/** The adopted spinner handles quantity entry and immediate stepping. */
function NumberField(props: NumberFieldProps): JSX.Element {
    const fractionDigits = () => (props.step === 1 ? 0 : 2);
    return (
        <Spinner
            label={props.label}
            value={props.value}
            onChange={props.onChange}
            min={props.min}
            step={typeof props.step === 'number' ? props.step : 1}
            integerDigits={3}
            fractionDigits={fractionDigits()}
            disabled={props.disabled}
            popoverMount={document.getElementById('root') ?? undefined}
        />
    );
}

interface CompactNumberFieldProps {
    label: string;
    value: number;
    min?: number;
    step?: number | string;
    disabled?: boolean;
    integer?: boolean;
    onChange: (value: number) => void;
}

/** A compact table presentation of the same number-pad spinner. */
function CompactNumberField(props: CompactNumberFieldProps): JSX.Element {
    return (
        <Spinner
            class="compact-spinner"
            label={props.label}
            value={props.value}
            onChange={props.onChange}
            min={props.min}
            step={props.integer ? 1 : 0.25}
            integerDigits={props.integer ? 2 : 3}
            fractionDigits={props.integer ? 0 : 2}
            disabled={props.disabled}
            popoverMount={document.getElementById('root') ?? undefined}
        />
    );
}

interface SelectOption {
    value: string;
    label: string;
}

interface SelectFieldProps {
    label: string;
    value: string;
    options: SelectOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
}

/** Labeled select. */
function SelectField(props: SelectFieldProps): JSX.Element {
    return (
        <OptionPicker
            label={props.label}
            value={props.value}
            options={props.options}
            disabled={props.disabled}
            onChange={props.onChange}
            popoverMount={document.getElementById('root') ?? undefined}
        />
    );
}

interface DateFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

/** A native date picker; the stored value remains local epoch millis. */
function DateField(props: DateFieldProps): JSX.Element {
    return (
        <label class="form-field">
            <span class="form-label">{props.label}</span>
            <input
                class="form-input"
                type="date"
                value={toDateLocalValue(props.value)}
                onInput={(event) => {
                    const next = fromDateLocalValue(event.currentTarget.value);
                    if (Number.isNaN(next)) {
                        return;
                    }
                    props.onChange(next);
                }}
            />
        </label>
    );
}

interface CheckboxItem {
    value: string;
    label: string;
}

interface CheckboxGroupProps {
    label: string;
    values: string[];
    options: CheckboxItem[];
    onToggle: (value: string) => void;
}

/** Labeled set of independent checkboxes. */
function CheckboxGroup(props: CheckboxGroupProps): JSX.Element {
    return (
        <fieldset class="form-field">
            <legend class="form-label">{props.label}</legend>
            <div class="check-grid">
                <For each={props.options}>
                    {(option) => (
                        <label class="check-item">
                            <input
                                type="checkbox"
                                checked={props.values.includes(option.value)}
                                onChange={() => props.onToggle(option.value)}
                            />
                            {option.label}
                        </label>
                    )}
                </For>
            </div>
        </fieldset>
    );
}

export { CheckboxGroup, CompactNumberField, DateField, NumberField, SelectField, TextAreaField, TextField };
export type { CheckboxItem, SelectOption };
