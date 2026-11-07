import { createEffect, createSignal, type JSX, on } from 'solid-js';
import { DraftGuard } from '../../app/DraftGuard.tsx';
import { useAppData } from '../../app/AppData.tsx';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import { generateExerciseId } from '../../domain/generateIds.ts';
import { validateExercise } from '../../domain/validateExercise.ts';
import type { ValidationIssue } from '../../domain/validation.ts';
import { Button, ConfirmDialog, Popover } from '../Controls/index.ts';
import { ExerciseForm } from './ExerciseForm.tsx';

/** Keep the full exercise form over its library, with immediate existing edits and explicit creation. */
function ExerciseEditor(props: ExerciseEditorProps): JSX.Element {
    const app = useAppData();
    const [draft, setDraft] = createSignal(blankExercise());
    const [baseline, setBaseline] = createSignal('');
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const [discarding, setDiscarding] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    let pending = Promise.resolve();
    let revision = 0;
    const changed = () => JSON.stringify(draft()) !== baseline();
    const unsaved = () => (props.creating ? changed() : errors().length > 0);

    createEffect(
        on(
            () => (props.open ? props.value?.id : undefined),
            (id) => {
                if (!id || !props.value) {
                    return;
                }
                const value = structuredClone(props.value);
                revision++;
                setDraft(value);
                setBaseline(JSON.stringify(value));
                setErrors([]);
            }
        )
    );

    function edit(value: ExerciseDefinition): void {
        setDraft(value);
        const current = ++revision;
        if (props.creating) {
            return;
        }
        const valid = validateExercise(value);
        setErrors(valid.ok ? [] : valid.errors);
        if (!valid.ok) {
            return;
        }

        // Keep rapid text and membership changes in order without replacing the open form
        pending = pending.then(async () => {
            const saved = await app.saveExercise(value);
            if (current === revision) {
                setErrors(saved.ok ? [] : saved.errors);
            }
        });
    }

    async function close(): Promise<void> {
        await pending;
        if (unsaved()) {
            setDiscarding(true);
            return;
        }
        props.onOpenChange(false);
    }

    async function create(): Promise<void> {
        if (busy()) {
            return;
        }
        setBusy(true);
        const result = await app.saveExercise(draft());
        setBusy(false);
        if (!result.ok) {
            setErrors(result.errors);
            return;
        }
        setBaseline(JSON.stringify(draft()));
        props.onCreated(result.value);
        props.onOpenChange(false);
    }

    return (
        <>
            <DraftGuard dirty={props.open && unsaved()} />
            <Popover
                open={props.open}
                onOpenChange={(open) => {
                    if (!open) {
                        void close();
                    }
                }}
                label={props.creating ? 'Create exercise' : 'Edit exercise'}
                anchor={props.trigger}
                returnFocus={props.trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <h2 class="dialog-title">{props.creating ? 'Create exercise' : 'Edit exercise'}</h2>
                    <ExerciseForm value={draft()} errors={errors()} onChange={edit} />
                    <div class="editor-actions">
                        {props.creating ? (
                            <>
                                <Button disabled={busy()} onPress={() => void create()}>
                                    Create
                                </Button>
                                <Button disabled={busy()} onPress={() => props.onOpenChange(false)}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button onPress={() => void close()}>End</Button>
                        )}
                    </div>
                </div>
            </Popover>
            <ConfirmDialog
                open={discarding()}
                onOpenChange={setDiscarding}
                message="Discard unsaved exercise changes?"
                onConfirm={() => {
                    setBaseline(JSON.stringify(draft()));
                    setErrors([]);
                    props.onOpenChange(false);
                }}
                mount={document.getElementById('root') ?? undefined}
            />
        </>
    );
}
interface ExerciseEditorProps {
    open: boolean;
    creating: boolean;
    value?: ExerciseDefinition;
    trigger?: () => HTMLElement | undefined;
    onOpenChange: (open: boolean) => void;
    onCreated: (value: ExerciseDefinition) => void;
}

/** Start an independent exercise draft with the most common tracking options. */
function blankExercise(): ExerciseDefinition {
    return {
        id: generateExerciseId(),
        name: '',
        measurements: [{ measurement: 'repetitions', countBasis: 'total' }],
        executionModes: ['bilateral'],
        loads: [{ kind: 'none' }],
    };
}

export { ExerciseEditor, blankExercise };
