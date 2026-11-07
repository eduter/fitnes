import type { JSX } from 'solid-js';
import { DateSpinner, OptionPicker, Spinner, TextArea, TextInput } from './Controls/index.ts';
import { fromDateLocalValue, toDateLocalValue } from '../utils/datetime.ts';

/** Labeled native name entry using the shared frame. */
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
interface TextFieldProps {
    label: string;
    value: string;
    placeholder?: string;
    required?: boolean;
    onChange: (value: string) => void;
}

/** Notes belong directly in their owning editor. */
function TextAreaField(props: TextAreaFieldProps): JSX.Element {
    return <TextArea label={props.label} value={props.value} rows={2} onChange={props.onChange} />;
}
interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

/** Shared quantity entry, including keyboard-free numeric editing. */
function NumberField(props: NumberFieldProps): JSX.Element {
    return (
        <Spinner
            label={props.label}
            value={props.value}
            onChange={props.onChange}
            min={props.min}
            step={typeof props.step === 'number' ? props.step : 1}
            integerDigits={3}
            fractionDigits={props.fractionDigits ?? (props.step === 1 ? 0 : 2)}
            disabled={props.disabled}
            popoverMount={document.getElementById('root') ?? undefined}
        />
    );
}
interface NumberFieldProps {
    label: string;
    value: number;
    min?: number;
    step?: number | string;
    disabled?: boolean;
    fractionDigits?: number;
    onChange: (value: number) => void;
}

/** A logged row opens the same spinner in its bounded editor. */
function CompactNumberField(props: CompactNumberFieldProps): JSX.Element {
    return (
        <Spinner
            label={props.label}
            value={props.value}
            onChange={props.onChange}
            min={props.min}
            step={props.integer ? 1 : 0.25}
            integerDigits={3}
            fractionDigits={props.integer ? 0 : 2}
            disabled={props.disabled}
            popoverMount={document.getElementById('root') ?? undefined}
        />
    );
}
interface CompactNumberFieldProps extends NumberFieldProps {
    integer?: boolean;
}

/** Labeled choice with the adopted options-only child window. */
function SelectField(props: SelectFieldProps): JSX.Element {
    return <OptionPicker {...props} popoverMount={document.getElementById('root') ?? undefined} />;
}
interface SelectFieldProps {
    label: string;
    value: string;
    options: SelectOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
}
/** Stored and displayed values for a single choice. */
interface SelectOption {
    value: string;
    label: string;
}

/** Adapt local epoch dates without changing stored date semantics. */
function DateField(props: DateFieldProps): JSX.Element {
    return (
        <DateSpinner
            label={props.label}
            value={toDateLocalValue(props.value)}
            onChange={(date) => props.onChange(fromDateLocalValue(date))}
        />
    );
}
interface DateFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

export { CompactNumberField, DateField, NumberField, SelectField, TextAreaField, TextField };
export type { SelectOption };
