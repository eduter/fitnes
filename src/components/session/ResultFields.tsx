import { Show, type JSX } from 'solid-js';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import type { ActualResult } from '../../domain/session.ts';
import type { ActualMeasurement, LoadConfiguration } from '../../domain/prescription.ts';
import { NumberField } from '../fields.tsx';
import { LoadConfigurationFields } from '../prescription/PrescriptionFields.tsx';

interface ResultFieldsProps {
    exercise: ExerciseDefinition;
    value: ActualResult;
    onChange: (value: ActualResult) => void;
}

/** Edit actual numeric values while keeping the prescribed measurement and load meaning. */
function ResultFields(props: ResultFieldsProps): JSX.Element {
    function setMeasurement(measurement: ActualMeasurement): void {
        props.onChange({ ...props.value, measurement });
    }

    function setLoad(load: LoadConfiguration): void {
        props.onChange({ ...props.value, load });
    }

    const measurement = () => props.value.measurement;

    return (
        <div class="stack">
            <p class="muted">
                {measurement().measurement} / {measurement().countBasis} · {props.value.load.kind}
                {props.value.load.kind === 'external' || props.value.load.kind === 'bodyweightExternal'
                    ? ` / ${props.value.load.basis}`
                    : ''}
            </p>
            <Show
                when={measurement().measurement === 'repetitions'}
                fallback={
                    <Show
                        when={perSideSeconds(measurement())}
                        fallback={<TotalSecondsField measurement={measurement} onChange={setMeasurement} />}
                    >
                        {(sides) => (
                            <div class="inline-fields">
                                <NumberField
                                    label="Seconds left"
                                    min={0}
                                    value={sides().left}
                                    onChange={(left) =>
                                        setMeasurement({
                                            measurement: 'duration',
                                            countBasis: 'perSide',
                                            sides: { ...sides(), left },
                                        })
                                    }
                                />
                                <NumberField
                                    label="Seconds right"
                                    min={0}
                                    value={sides().right}
                                    onChange={(right) =>
                                        setMeasurement({
                                            measurement: 'duration',
                                            countBasis: 'perSide',
                                            sides: { ...sides(), right },
                                        })
                                    }
                                />
                            </div>
                        )}
                    </Show>
                }
            >
                <Show
                    when={perSideReps(measurement())}
                    fallback={<TotalRepsField measurement={measurement} onChange={setMeasurement} />}
                >
                    {(sides) => (
                        <div class="inline-fields">
                            <NumberField
                                label="Reps left"
                                min={0}
                                step={1}
                                value={sides().left}
                                onChange={(left) =>
                                    setMeasurement({
                                        measurement: 'repetitions',
                                        countBasis: 'perSide',
                                        sides: { ...sides(), left },
                                    })
                                }
                            />
                            <NumberField
                                label="Reps right"
                                min={0}
                                step={1}
                                value={sides().right}
                                onChange={(right) =>
                                    setMeasurement({
                                        measurement: 'repetitions',
                                        countBasis: 'perSide',
                                        sides: { ...sides(), right },
                                    })
                                }
                            />
                        </div>
                    )}
                </Show>
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

interface TotalFieldProps {
    measurement: () => ActualMeasurement;
    onChange: (measurement: ActualMeasurement) => void;
}

/** The single duration field shown for a total-counted set. */
function TotalSecondsField(props: TotalFieldProps): JSX.Element {
    return (
        <NumberField
            label="Seconds"
            min={0}
            value={totalSeconds(props.measurement()) ?? 30}
            onChange={(seconds) => props.onChange({ measurement: 'duration', countBasis: 'total', seconds })}
        />
    );
}

/** The single repetition field shown for a total-counted set. */
function TotalRepsField(props: TotalFieldProps): JSX.Element {
    return (
        <NumberField
            label="Reps"
            min={0}
            step={1}
            value={totalReps(props.measurement()) ?? 8}
            onChange={(reps) => props.onChange({ measurement: 'repetitions', countBasis: 'total', reps })}
        />
    );
}

/** The single duration of a total-counted measurement, or undefined for any other shape. */
function totalSeconds(measurement: ActualMeasurement): number | undefined {
    return measurement.measurement === 'duration' && measurement.countBasis === 'total'
        ? measurement.seconds
        : undefined;
}

/** The single repetition count of a total-counted measurement, or undefined for any other shape. */
function totalReps(measurement: ActualMeasurement): number | undefined {
    return measurement.measurement === 'repetitions' && measurement.countBasis === 'total'
        ? measurement.reps
        : undefined;
}

/** The per-side repetition counts, or undefined when the measurement is not per-side repetitions. */
function perSideReps(measurement: ActualMeasurement): { left: number; right: number } | undefined {
    if (measurement.countBasis === 'perSide' && measurement.measurement === 'repetitions') {
        return measurement.sides;
    }

    return undefined;
}

/** The per-side durations, or undefined when the measurement is not per-side duration. */
function perSideSeconds(measurement: ActualMeasurement): { left: number; right: number } | undefined {
    if (measurement.countBasis === 'perSide' && measurement.measurement === 'duration') {
        return measurement.sides;
    }

    return undefined;
}

export { ResultFields };
