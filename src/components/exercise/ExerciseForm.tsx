import type { JSX } from 'solid-js';
import type { ExerciseDefinition, LoadOption, MeasurementOption } from '../../domain/exercise.ts';
import type { ValidationIssue } from '../../domain/validation.ts';
import { MultiPicker, SectionHeading } from '../Controls/index.ts';
import { TextAreaField, TextField } from '../fields.tsx';
import { TimingFields } from '../session/TimingFields.tsx';
import { ValidationErrors } from '../ValidationErrors.tsx';

const measurements: { value: string; label: string; option: MeasurementOption }[] = [
    { value: 'repetitions/total', label: 'Reps', option: { measurement: 'repetitions', countBasis: 'total' } },
    {
        value: 'repetitions/perSide',
        label: 'Reps per side',
        option: { measurement: 'repetitions', countBasis: 'perSide' },
    },
    { value: 'duration/total', label: 'Seconds', option: { measurement: 'duration', countBasis: 'total' } },
    {
        value: 'duration/perSide',
        label: 'Seconds per side',
        option: { measurement: 'duration', countBasis: 'perSide' },
    },
];
const loads = [
    { value: 'none', label: 'No weight' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'external/total', label: 'Added weight' },
    { value: 'external/perSide', label: 'Weight per side' },
    { value: 'bodyweightExternal/total', label: 'BW + added weight' },
    { value: 'bodyweightExternal/perSide', label: 'BW + weight per side' },
];

/** Edit identity and all supported capabilities together in one bounded form. */
function ExerciseForm(props: ExerciseFormProps): JSX.Element {
    function patch(next: Partial<ExerciseDefinition>): void {
        const value = { ...props.value, ...next };
        if (!value.description) {
            delete value.description;
        }
        props.onChange(value);
    }
    return (
        <div class="editor-fields">
            <TextField label="Name" value={props.value.name} required onChange={(name) => patch({ name })} />
            <SectionHeading>Tracking options</SectionHeading>
            <MultiPicker
                label="Measure"
                values={props.value.measurements.map((item) => `${item.measurement}/${item.countBasis}`)}
                options={measurements}
                onChange={(values) =>
                    patch({
                        measurements: measurements
                            .filter((item) => values.includes(item.value))
                            .map((item) => item.option),
                    })
                }
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <MultiPicker
                label="Movement"
                values={props.value.executionModes}
                options={[
                    { value: 'bilateral', label: 'Both sides' },
                    { value: 'unilateral', label: 'One side' },
                ]}
                onChange={(values) => patch({ executionModes: values as ExerciseDefinition['executionModes'] })}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <MultiPicker
                label="Weight"
                values={props.value.loads.flatMap((item) =>
                    item.kind === 'external' || item.kind === 'bodyweightExternal'
                        ? item.bases.map((basis) => `${item.kind}/${basis}`)
                        : [item.kind]
                )}
                options={loads}
                onChange={(values) => patch({ loads: loadOptions(values) })}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <SectionHeading>Timing defaults</SectionHeading>
            <TimingFields value={props.value.timing} onChange={(timing) => patch({ timing })} />
            <TextAreaField
                label="Description"
                value={props.value.description ?? ''}
                onChange={(description) => patch({ description })}
            />
            <ValidationErrors errors={props.errors} />
        </div>
    );
}
interface ExerciseFormProps {
    value: ExerciseDefinition;
    errors: ValidationIssue[];
    onChange: (value: ExerciseDefinition) => void;
}

function loadOptions(values: string[]): LoadOption[] {
    const result: LoadOption[] = [];
    for (const kind of ['none', 'bodyweight', 'external', 'bodyweightExternal'] as const) {
        if (kind === 'none' || kind === 'bodyweight') {
            if (values.includes(kind)) {
                result.push({ kind });
            }
            continue;
        }
        const bases = (['total', 'perSide'] as const).filter((basis) => values.includes(`${kind}/${basis}`));
        if (bases.length) {
            result.push({ kind, bases });
        }
    }
    return result;
}

export { ExerciseForm };
