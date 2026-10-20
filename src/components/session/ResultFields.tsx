import { Show, type JSX } from 'solid-js';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import type { ActualResult } from '../../domain/session.ts';
import type { LoadConfiguration, MeasurementValue } from '../../domain/prescription.ts';
import { NumberField } from '../fields.tsx';
import { LoadConfigurationFields } from '../prescription/PrescriptionFields.tsx';

interface ResultFieldsProps {
    exercise: ExerciseDefinition;
    value: ActualResult;
    onChange: (value: ActualResult) => void;
}

/** Edit actual numeric values while keeping the prescribed measurement and load meaning. */
function ResultFields(props: ResultFieldsProps): JSX.Element {
    function setMeasurement(measurement: MeasurementValue): void {
        props.onChange({ ...props.value, measurement });
    }

    function setLoad(load: LoadConfiguration): void {
        props.onChange({ ...props.value, load });
    }

    return (
        <div class="stack">
            <p class="muted">
                {props.value.measurement.measurement} / {props.value.measurement.countBasis} · {props.value.load.kind}
                {props.value.load.kind === 'external' || props.value.load.kind === 'bodyweightExternal'
                    ? ` / ${props.value.load.basis}`
                    : ''}
            </p>
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
            <Show when={props.value.load.kind === 'external' || props.value.load.kind === 'bodyweightExternal'}>
                <LoadConfigurationFields
                    exercise={props.exercise}
                    value={props.value.load}
                    lockSemantics
                    onChange={setLoad}
                />
            </Show>
        </div>
    );
}

export { ResultFields };
