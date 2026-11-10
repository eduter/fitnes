import { Show, type JSX } from 'solid-js';
import { addedWeightLabel, exerciseCopy, targetLabel } from '../../copy/exercise.ts';
import { useAppData } from '../../app/AppData.tsx';
import { massValue } from '../../domain/convertWeight.ts';
import {
    countBasisFor,
    type ExecutionMode,
    type ExerciseDefinition,
    type MeasurementType,
} from '../../domain/exercise.ts';
import type { MeasurementValue, SetPrescription } from '../../domain/prescription.ts';
import { NumberField, SelectField } from '../fields.tsx';

/** Edit target quantities; movement and load behavior belong to the exercise. */
function PrescriptionFields(props: PrescriptionFieldsProps): JSX.Element {
    const app = useAppData();

    function setMeasurement(measurement: MeasurementType, amount?: number): void {
        const countBasis = countBasisFor(props.value.executionMode);
        const previous = props.value.measurement;
        const value: MeasurementValue =
            measurement === 'repetitions'
                ? {
                      measurement,
                      countBasis,
                      reps: amount ?? (previous.measurement === measurement ? previous.reps : 8),
                  }
                : {
                      measurement,
                      countBasis,
                      seconds: amount ?? (previous.measurement === measurement ? previous.seconds : 30),
                  };
        props.onChange({ ...props.value, executionMode: props.value.executionMode, measurement: value });
    }

    return (
        <div class="stack">
            <Show when={props.exercise.executionModes.length > 1}>
                <SelectField
                    label={exerciseCopy.sides}
                    value={props.value.executionMode}
                    options={props.exercise.executionModes.map((mode) => ({
                        value: mode,
                        label: exerciseCopy.sideOptions[mode],
                    }))}
                    onChange={(mode) =>
                        props.onChange({
                            ...props.value,
                            executionMode: mode as ExecutionMode,
                            measurement: {
                                ...props.value.measurement,
                                countBasis: countBasisFor(mode as ExecutionMode),
                            },
                        })
                    }
                />
            </Show>
            <Show when={props.exercise.measurements.length > 1}>
                <SelectField
                    label={exerciseCopy.unit}
                    value={props.value.measurement.measurement}
                    options={props.exercise.measurements.map((measurement) => ({
                        value: measurement,
                        label: exerciseCopy.units[measurement],
                    }))}
                    onChange={(value) => setMeasurement(value as MeasurementType)}
                />
            </Show>
            <Show
                when={props.value.measurement.measurement === 'repetitions'}
                fallback={
                    <NumberField
                        label={targetLabel('duration', props.value.executionMode)}
                        min={0.1}
                        value={
                            props.value.measurement.measurement === 'duration' ? props.value.measurement.seconds : 30
                        }
                        onChange={(seconds) => setMeasurement('duration', seconds)}
                    />
                }
            >
                <NumberField
                    label={targetLabel('repetitions', props.value.executionMode)}
                    min={1}
                    step={1}
                    value={props.value.measurement.measurement === 'repetitions' ? props.value.measurement.reps : 8}
                    onChange={(reps) => setMeasurement('repetitions', reps)}
                />
            </Show>
            <Show when={props.exercise.load.kind === 'external' || props.exercise.load.kind === 'bodyweightExternal'}>
                <NumberField
                    label={addedWeightLabel(app.massUnit())}
                    min={-999.99}
                    value={
                        props.value.load.kind === 'external' || props.value.load.kind === 'bodyweightExternal'
                            ? massValue(props.value.load.weight, app.massUnit())
                            : 0
                    }
                    onChange={(value) => {
                        const kind = props.exercise.load.kind;
                        if (kind !== 'external' && kind !== 'bodyweightExternal') {
                            return;
                        }
                        props.onChange({ ...props.value, load: { kind, weight: { value, unit: app.massUnit() } } });
                    }}
                />
            </Show>
        </div>
    );
}
interface PrescriptionFieldsProps {
    exercise: ExerciseDefinition;
    value: SetPrescription;
    onChange: (value: SetPrescription) => void;
}

export { PrescriptionFields };
