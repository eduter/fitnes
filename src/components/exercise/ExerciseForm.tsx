import { Button } from '../Button/Button.tsx';
import { For, Show, type JSX } from 'solid-js';
import type {
    ExecutionMode,
    ExerciseDefinition,
    LoadBasis,
    LoadOption,
    MeasurementCountBasis,
    MeasurementOption,
    MeasurementType,
} from '../../domain/exercise.ts';
import { CheckboxGroup, SelectField, TextAreaField, TextField } from '../fields.tsx';
import { ValidationErrors } from '../ValidationErrors.tsx';
import type { ValidationIssue } from '../../domain/validation.ts';

const MEASUREMENT_TYPES: MeasurementType[] = ['repetitions', 'duration'];
const COUNT_BASES: MeasurementCountBasis[] = ['total', 'perSide'];
const EXECUTION_MODES: ExecutionMode[] = ['bilateral', 'unilateral'];
const LOAD_KINDS: LoadOption['kind'][] = ['none', 'bodyweight', 'external', 'bodyweightExternal'];
const LOAD_BASES: LoadBasis[] = ['total', 'perSide'];

interface ExerciseFormProps {
    value: ExerciseDefinition;
    errors: ValidationIssue[];
    onChange: (value: ExerciseDefinition) => void;
}

/** Edit a catalog exercise's identity and full capability set. */
function ExerciseForm(props: ExerciseFormProps): JSX.Element {
    function patch(next: Partial<ExerciseDefinition>): void {
        const merged: ExerciseDefinition = { ...props.value, ...next };

        if (!merged.description) {
            delete merged.description;
        }

        props.onChange(merged);
    }

    return (
        <div class="stack">
            <ValidationErrors errors={props.errors} />
            <TextField label="Name" value={props.value.name} required onChange={(name) => patch({ name })} />
            <TextAreaField
                label="Description"
                value={props.value.description ?? ''}
                onChange={(description) => patch({ description })}
            />
            <MeasurementOptionsField
                value={props.value.measurements}
                onChange={(measurements) => patch({ measurements })}
            />
            <CheckboxGroup
                label="Execution modes"
                values={props.value.executionModes}
                options={EXECUTION_MODES.map((mode) => ({ value: mode, label: mode }))}
                onToggle={(mode) =>
                    patch({ executionModes: toggleItem(props.value.executionModes, mode as ExecutionMode) })
                }
            />
            <LoadOptionsField value={props.value.loads} onChange={(loads) => patch({ loads })} />
        </div>
    );
}

interface MeasurementOptionsFieldProps {
    value: MeasurementOption[];
    onChange: (value: MeasurementOption[]) => void;
}

function MeasurementOptionsField(props: MeasurementOptionsFieldProps): JSX.Element {
    function updateAt(index: number, next: MeasurementOption): void {
        props.onChange(props.value.map((option, optionIndex) => (optionIndex === index ? next : option)));
    }

    return (
        <fieldset class="form-field">
            <legend class="form-label">Measurements</legend>
            <For each={props.value}>
                {(option, index) => (
                    <div class="inline-fields">
                        <SelectField
                            label="Type"
                            value={option.measurement}
                            options={MEASUREMENT_TYPES.map((type) => ({ value: type, label: type }))}
                            onChange={(measurement) =>
                                updateAt(index(), { ...option, measurement: measurement as MeasurementType })
                            }
                        />
                        <SelectField
                            label="Count basis"
                            value={option.countBasis}
                            options={COUNT_BASES.map((basis) => ({ value: basis, label: basis }))}
                            onChange={(countBasis) =>
                                updateAt(index(), { ...option, countBasis: countBasis as MeasurementCountBasis })
                            }
                        />
                        <Button
                            class="btn btn--secondary"
                            type="button"
                            onPress={() =>
                                props.onChange(props.value.filter((_, optionIndex) => optionIndex !== index()))
                            }
                        >
                            Remove
                        </Button>
                    </div>
                )}
            </For>
            <Button
                class="btn btn--secondary"
                type="button"
                onPress={() => props.onChange([...props.value, { measurement: 'repetitions', countBasis: 'total' }])}
            >
                Add measurement
            </Button>
        </fieldset>
    );
}

interface LoadOptionsFieldProps {
    value: LoadOption[];
    onChange: (value: LoadOption[]) => void;
}

function LoadOptionsField(props: LoadOptionsFieldProps): JSX.Element {
    return (
        <fieldset class="form-field">
            <legend class="form-label">Load modes</legend>
            <CheckboxGroup
                label="Kinds"
                values={props.value.map((option) => option.kind)}
                options={LOAD_KINDS.map((kind) => ({ value: kind, label: kind }))}
                onToggle={(kind) => props.onChange(toggleLoadKind(props.value, kind as LoadOption['kind']))}
            />
            <For each={props.value}>
                {(option) => (
                    <Show when={option.kind === 'external' || option.kind === 'bodyweightExternal'}>
                        <CheckboxGroup
                            label={`${option.kind} bases`}
                            values={
                                option.kind === 'external' || option.kind === 'bodyweightExternal' ? option.bases : []
                            }
                            options={LOAD_BASES.map((basis) => ({ value: basis, label: basis }))}
                            onToggle={(basis) =>
                                props.onChange(
                                    props.value.map((candidate) =>
                                        candidate.kind === option.kind
                                            ? toggleLoadBasis(candidate, basis as LoadBasis)
                                            : candidate
                                    )
                                )
                            }
                        />
                    </Show>
                )}
            </For>
        </fieldset>
    );
}

function toggleItem<T extends string>(items: T[], item: T): T[] {
    return items.includes(item) ? items.filter((candidate) => candidate !== item) : [...items, item];
}

function toggleLoadKind(loads: LoadOption[], kind: LoadOption['kind']): LoadOption[] {
    if (loads.some((option) => option.kind === kind)) {
        return loads.filter((option) => option.kind !== kind);
    }

    if (kind === 'none' || kind === 'bodyweight') {
        return [...loads, { kind }];
    }

    return [...loads, { kind, bases: ['total'] }];
}

function toggleLoadBasis(option: LoadOption, basis: LoadBasis): LoadOption {
    if (option.kind !== 'external' && option.kind !== 'bodyweightExternal') {
        return option;
    }

    const bases = option.bases.includes(basis)
        ? option.bases.filter((candidate) => candidate !== basis)
        : [...option.bases, basis];

    return { ...option, bases };
}

export { ExerciseForm };
