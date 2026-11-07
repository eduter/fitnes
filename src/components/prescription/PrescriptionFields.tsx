import { useAppData } from '../../app/AppData.tsx';
import { massValue } from '../../domain/convertWeight.ts';
import { Show, type JSX } from 'solid-js';
import type { ExerciseDefinition, LoadBasis, LoadOption } from '../../domain/exercise.ts';
import type { LoadConfiguration, MeasurementValue, SetPrescription } from '../../domain/prescription.ts';
import { NumberField, SelectField } from '../fields.tsx';

interface PrescriptionFieldsProps {
    exercise: ExerciseDefinition;
    value: SetPrescription;
    onChange: (value: SetPrescription) => void;
}

/** Edit a set prescription using only the configurations the exercise allows. */
function PrescriptionFields(props: PrescriptionFieldsProps): JSX.Element {
    function setMeasurement(measurement: MeasurementValue): void {
        props.onChange({ ...props.value, measurement });
    }

    function setLoad(load: LoadConfiguration): void {
        props.onChange({ ...props.value, load });
    }

    return (
        <div class="stack">
            <SelectField
                label="Measurement"
                value={measurementKey(props.value.measurement)}
                options={props.exercise.measurements.map((option) => ({
                    value: measurementKey(option),
                    label: `${option.measurement} / ${option.countBasis}`,
                }))}
                onChange={(key) => {
                    const option = props.exercise.measurements.find((candidate) => measurementKey(candidate) === key);
                    if (!option) {
                        return;
                    }
                    setMeasurement(measurementFromOption(option, props.value.measurement));
                }}
            />
            <Show
                when={props.value.measurement.measurement === 'repetitions'}
                fallback={
                    <NumberField
                        label="Seconds"
                        min={0}
                        value={
                            props.value.measurement.measurement === 'duration' ? props.value.measurement.seconds : 30
                        }
                        onChange={(seconds) =>
                            setMeasurement({
                                measurement: 'duration',
                                countBasis: props.value.measurement.countBasis,
                                seconds,
                            })
                        }
                    />
                }
            >
                <NumberField
                    label="Reps"
                    min={1}
                    step={1}
                    value={props.value.measurement.measurement === 'repetitions' ? props.value.measurement.reps : 8}
                    onChange={(reps) =>
                        setMeasurement({
                            measurement: 'repetitions',
                            countBasis: props.value.measurement.countBasis,
                            reps,
                        })
                    }
                />
            </Show>
            <SelectField
                label="Execution mode"
                value={props.value.executionMode}
                options={props.exercise.executionModes.map((mode) => ({ value: mode, label: mode }))}
                onChange={(executionMode) =>
                    props.onChange({
                        ...props.value,
                        executionMode: executionMode as SetPrescription['executionMode'],
                    })
                }
            />
            <LoadConfigurationFields exercise={props.exercise} value={props.value.load} onChange={setLoad} />
        </div>
    );
}

interface LoadConfigurationFieldsProps {
    exercise: ExerciseDefinition;
    value: LoadConfiguration;
    onChange: (value: LoadConfiguration) => void;
}

/** Edit load kind, basis, weight, and unit. */
function LoadConfigurationFields(props: LoadConfigurationFieldsProps): JSX.Element {
    const app = useAppData();
    const selectedOption = (): LoadOption | undefined =>
        props.exercise.loads.find((option) => option.kind === props.value.kind);

    return (
        <div class="stack">
            <SelectField
                label="Load"
                value={props.value.kind}
                options={props.exercise.loads.map((option) => ({ value: option.kind, label: option.kind }))}
                onChange={(kind) => {
                    const option = props.exercise.loads.find((candidate) => candidate.kind === kind);
                    if (!option) {
                        return;
                    }
                    props.onChange(loadFromOption(option, props.value));
                }}
            />
            <Show when={props.value.kind === 'external' || props.value.kind === 'bodyweightExternal'}>
                <SelectField
                    label="Load basis"
                    value={
                        props.value.kind === 'external' || props.value.kind === 'bodyweightExternal'
                            ? props.value.basis
                            : 'total'
                    }
                    options={basesFor(selectedOption()).map((basis) => ({ value: basis, label: basis }))}
                    onChange={(basis) => {
                        if (props.value.kind !== 'external' && props.value.kind !== 'bodyweightExternal') {
                            return;
                        }
                        props.onChange({ ...props.value, basis: basis as LoadBasis });
                    }}
                />
                <div class="inline-fields">
                    <NumberField
                        label={`External weight (${app.massUnit()})`}
                        min={0}
                        value={
                            props.value.kind === 'external' || props.value.kind === 'bodyweightExternal'
                                ? massValue(props.value.weight, app.massUnit())
                                : 0
                        }
                        onChange={(value) => {
                            if (props.value.kind !== 'external' && props.value.kind !== 'bodyweightExternal') {
                                return;
                            }
                            props.onChange({ ...props.value, weight: { value, unit: app.massUnit() } });
                        }}
                    />
                </div>
            </Show>
        </div>
    );
}

function basesFor(option: LoadOption | undefined): LoadBasis[] {
    if (option?.kind === 'external' || option?.kind === 'bodyweightExternal') {
        return option.bases;
    }

    return ['total'];
}

function measurementKey(option: { measurement: string; countBasis: string }): string {
    return `${option.measurement}/${option.countBasis}`;
}

function measurementFromOption(
    option: { measurement: MeasurementValue['measurement']; countBasis: MeasurementValue['countBasis'] },
    previous: MeasurementValue
): MeasurementValue {
    if (option.measurement === 'repetitions') {
        return {
            measurement: 'repetitions',
            countBasis: option.countBasis,
            reps: previous.measurement === 'repetitions' ? previous.reps : 8,
        };
    }

    return {
        measurement: 'duration',
        countBasis: option.countBasis,
        seconds: previous.measurement === 'duration' ? previous.seconds : 30,
    };
}

function loadFromOption(option: LoadOption, previous: LoadConfiguration): LoadConfiguration {
    if (option.kind === 'none' || option.kind === 'bodyweight') {
        return { kind: option.kind };
    }

    const previousWeight =
        previous.kind === 'external' || previous.kind === 'bodyweightExternal'
            ? previous.weight
            : { value: 0, unit: 'kg' as const };
    const fallbackBasis = option.bases[0];
    if (!fallbackBasis) {
        throw new Error(`load option '${option.kind}' is missing a basis`);
    }

    const previousBasis =
        previous.kind === 'external' || previous.kind === 'bodyweightExternal' ? previous.basis : fallbackBasis;
    const basis = option.bases.includes(previousBasis) ? previousBasis : fallbackBasis;

    return { kind: option.kind, basis, weight: previousWeight };
}

export { PrescriptionFields };
