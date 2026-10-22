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
    let committed = props.value;

    createEffect(() => {
        const incoming = props.value;
        if (incoming === committed) {
            return;
        }
        committed = incoming;
        setText(String(incoming));
    });

    function commit(raw: string): void {
        const next = Number(raw);
        if (!Number.isFinite(next)) {
            setText(String(props.value));
            return;
        }
        committed = next;
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

interface CompactNumberFieldProps {
    label: string;
    value: number;
    min?: number;
    step?: number | string;
    disabled?: boolean;
    integer?: boolean;
    onChange: (value: number) => void;
}

/**
 * A borderless numeric input sized for one cell of a dense set row. It carries
 * no visible label, so `label` becomes the accessible name; tests and screen
 * readers address it that way. Digits stay local until change or blur, exactly
 * like {@link NumberField}, because committing per keystroke would truncate a
 * multi-digit entry.
 */
function CompactNumberField(props: CompactNumberFieldProps): JSX.Element {
    const [text, setText] = createSignal(String(props.value));
    let committed = props.value;

    createEffect(() => {
        const incoming = props.value;
        if (incoming === committed) {
            return;
        }
        committed = incoming;
        setText(String(incoming));
    });

    function commit(raw: string): void {
        const next = Number(raw);
        // An empty cell must not read as `Number('') === 0`; treat it as
        // abandoned input and put the last committed value back.
        if (raw.trim() === '' || !Number.isFinite(next)) {
            setText(String(props.value));
            return;
        }
        committed = next;
        props.onChange(next);
    }

    return (
        <input
            class="set-cell set-cell--number"
            type="text"
            // `inputmode` rather than `type="number"`: Chrome on Android shows a
            // numeric keypad without the spinner arrows that eat row width.
            inputmode={props.integer ? 'numeric' : 'decimal'}
            aria-label={props.label}
            value={text()}
            disabled={props.disabled}
            onInput={(event) => setText(event.currentTarget.value)}
            onChange={(event) => commit(event.currentTarget.value)}
            onBlur={(event) => commit(event.currentTarget.value)}
            onFocus={(event) => event.currentTarget.select()}
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

export { CheckboxGroup, CompactNumberField, DateTimeField, NumberField, SelectField, TextAreaField, TextField };
export type { CheckboxItem, SelectOption };
