import { For, createEffect, createSignal, type JSX } from 'solid-js';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../utils/datetime.ts';

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
        <label class="form-field">
            <span class="form-label">{props.label}</span>
            <input
                class="form-input"
                type="text"
                value={props.value}
                placeholder={props.placeholder}
                required={props.required}
                onInput={(event) => props.onChange(event.currentTarget.value)}
            />
        </label>
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

/** Labeled numeric input. Digits stay local until blur so multi-digit values are not truncated. */
function NumberField(props: NumberFieldProps): JSX.Element {
    const [text, setText] = createSignal(String(props.value));

    createEffect(() => {
        setText(String(props.value));
    });

    function commit(raw: string): void {
        const next = Number(raw);
        if (!Number.isFinite(next)) {
            setText(String(props.value));
            return;
        }
        props.onChange(next);
    }

    return (
        <label class="form-field">
            <span class="form-label">{props.label}</span>
            <input
                class="form-input"
                type="number"
                min={props.min}
                step={props.step ?? 'any'}
                value={text()}
                disabled={props.disabled}
                onInput={(event) => setText(event.currentTarget.value)}
                onChange={(event) => commit(event.currentTarget.value)}
                onBlur={(event) => commit(event.currentTarget.value)}
            />
        </label>
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
        <label class="form-field">
            <span class="form-label">{props.label}</span>
            <select
                class="form-input"
                value={props.value}
                disabled={props.disabled}
                onChange={(event) => props.onChange(event.currentTarget.value)}
            >
                <For each={props.options}>{(option) => <option value={option.value}>{option.label}</option>}</For>
            </select>
        </label>
    );
}

interface DateTimeFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

/** Labeled local datetime input stored as epoch millis. */
function DateTimeField(props: DateTimeFieldProps): JSX.Element {
    return (
        <label class="form-field">
            <span class="form-label">{props.label}</span>
            <input
                class="form-input"
                type="datetime-local"
                value={toDatetimeLocalValue(props.value)}
                onInput={(event) => {
                    const next = fromDatetimeLocalValue(event.currentTarget.value);
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

export { CheckboxGroup, DateTimeField, NumberField, SelectField, TextAreaField, TextField };
export type { CheckboxItem, SelectOption };
