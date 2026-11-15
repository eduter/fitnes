import { createMemo, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import { exerciseProgress, rangeStart } from '../domain/progress.ts';
import { ProgressDialog } from './ProgressChart/ProgressDialog.tsx';

/** Show the selected library exercise's graph across completed workouts. */
function ExerciseProgress(props: ExerciseProgressProps): JSX.Element {
    const app = useAppData();
    const [range, setRange] = createSignal('3');
    const points = createMemo(() =>
        exerciseProgress(app.sessions(), props.exercise?.id ?? '', app.massUnit()).filter(
            (point) => point.at >= rangeStart(range(), Date.now())
        )
    );
    return (
        <ProgressDialog
            open={props.open}
            onOpenChange={props.onOpenChange}
            trigger={props.trigger}
            label={props.exercise?.name ?? 'Exercise'}
            unit={app.massUnit()}
            range={range()}
            onRangeChange={setRange}
            series={[{ label: 'Estimated 1RM', points: points() }]}
            empty="No weighted rep sets in this period."
            explanation="Epley estimate: weight × (1 + reps ÷ 30). Each point is your best set from a completed workout. Use it as a rough strength trend across rep ranges; higher-rep estimates are less precise."
        />
    );
}

/** Stable exercise selection is retained while the graph closes. */
interface ExerciseProgressProps {
    exercise: ExerciseDefinition | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: () => HTMLElement | undefined;
}

export type { ExerciseProgressProps };
export { ExerciseProgress };
