import type { JSX } from 'solid-js';
import { exerciseCopy } from '../../copy/exercise.ts';
import type { ExerciseDefinition, ExecutionMode, LoadOption, MeasurementType } from '../../domain/exercise.ts';
import type { ValidationIssue } from '../../domain/validation.ts';
import { MultiPicker, SectionHeading } from '../Controls/index.ts';
import { SelectField, TextAreaField, TextField } from '../fields.tsx';
import { TimingFields } from '../session/TimingFields.tsx';
import { ValidationErrors } from '../ValidationErrors.tsx';

/** Define the exercise's fixed movement, supported units, and load behavior. */
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
            <SelectField
                label={exerciseCopy.sides}
                value={props.value.executionMode}
                options={[
                    { value: 'bilateral', label: exerciseCopy.sideOptions.bilateral },
                    { value: 'unilateral', label: exerciseCopy.sideOptions.unilateral },
                ]}
                onChange={(value) => patch({ executionMode: value as ExecutionMode })}
            />
            <MultiPicker
                label={exerciseCopy.unit}
                values={props.value.measurements}
                options={[
                    { value: 'repetitions', label: exerciseCopy.units.repetitions },
                    { value: 'duration', label: exerciseCopy.units.duration },
                ]}
                onChange={(values) => patch({ measurements: values as MeasurementType[] })}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <SelectField
                label={exerciseCopy.weight}
                value={props.value.load.kind}
                options={[
                    { value: 'none', label: exerciseCopy.weights.none },
                    { value: 'bodyweight', label: exerciseCopy.weights.bodyweight },
                    { value: 'external', label: exerciseCopy.weights.external },
                    { value: 'bodyweightExternal', label: exerciseCopy.weights.bodyweightExternal },
                ]}
                onChange={(kind) => patch({ load: { kind } as LoadOption })}
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

export { ExerciseForm };
