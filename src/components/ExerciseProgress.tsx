import { createMemo, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { exerciseProgress, rangeStart } from '../domain/progress.ts';
import { formatDate } from '../utils/datetime.ts';
import { Button, OptionPicker } from './Controls/index.ts';
import { PagedList } from './PagedList.tsx';
import { ProgressDialog } from './ProgressChart/ProgressDialog.tsx';

/** Compare one exercise across completed workouts, preserving its actual load and reps. */
function ExerciseProgress(): JSX.Element {
    const app = useAppData();
    const [graphOpen, setGraphOpen] = createSignal(false);
    let graphTrigger: HTMLElement | undefined;
    const [selected, setSelected] = createSignal('');
    const [range, setRange] = createSignal('3');
    const choices = createMemo(() => {
        const names = new Map(app.exercises().map((exercise) => [exercise.id, exercise.name]));
        // Historical snapshots keep deleted exercises available for progress review.
        for (const session of app.sessions()) {
            for (const exercise of session.snapshot.exercises) {
                if (!names.has(exercise.id)) {
                    names.set(exercise.id, exercise.name);
                }
            }
        }
        return [...names].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
    });
    const exerciseId = () =>
        choices().some((choice) => choice.value === selected()) ? selected() : (choices()[0]?.value ?? '');
    const points = createMemo(() =>
        exerciseProgress(app.sessions(), exerciseId(), app.massUnit()).filter(
            (point) => point.at >= rangeStart(range(), Date.now())
        )
    );
    const series = () => [{ label: 'Estimated 1RM', points: points() }];
    return (
        <>
            <OptionPicker
                label="Exercise"
                options={choices()}
                value={exerciseId()}
                onChange={setSelected}
                disabled={!choices().length}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <Button
                onPress={(event) => {
                    graphTrigger = event.currentTarget;
                    setGraphOpen(true);
                }}
            >
                Graph
            </Button>
            <ProgressDialog
                open={graphOpen()}
                onOpenChange={setGraphOpen}
                trigger={() => graphTrigger}
                label={choices().find((choice) => choice.value === exerciseId())?.label ?? 'Exercise'}
                unit={app.massUnit()}
                range={range()}
                onRangeChange={setRange}
                series={series()}
                empty="No weighted rep sets in this period."
                explanation="Epley estimate: weight × (1 + reps ÷ 30). Each point is your best set from a completed workout. Use it as a rough strength trend across rep ranges; higher-rep estimates are less precise."
            />
            <PagedList
                label="Exercise progress sets"
                items={points().toReversed()}
                rowHeight={48}
                empty="Log a completed workout to track progress."
            >
                {(point) => (
                    <article>
                        <p>
                            {formatDate(point.at)} · {point.value.toFixed(1)} {app.massUnit()} est.
                        </p>
                        <p>
                            {point.load.toFixed(1)} {app.massUnit()} × {point.reps} reps
                        </p>
                    </article>
                )}
            </PagedList>
        </>
    );
}

export { ExerciseProgress };
