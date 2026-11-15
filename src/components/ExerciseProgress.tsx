import { createMemo, createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { exerciseProgress, progressRanges, rangeStart } from '../domain/progress.ts';
import { formatDate } from '../utils/datetime.ts';
import { OptionPicker } from './Controls/index.ts';
import { PagedList } from './PagedList.tsx';
import { ProgressChart } from './ProgressChart/ProgressChart.tsx';

/** Compare one exercise across completed workouts, preserving its actual load and reps. */
function ExerciseProgress(): JSX.Element {
    const app = useAppData();
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
            <OptionPicker
                label="Period"
                options={progressRanges}
                value={range()}
                onChange={setRange}
                popoverMount={document.getElementById('root') ?? undefined}
            />
            <ProgressChart
                label="Estimated max"
                unit={app.massUnit()}
                series={series()}
                empty="No weighted rep sets in this period."
            />
            <p>Epley estimate. Higher reps are less reliable. Compare sets near your limit.</p>
            <Show when={points().some((point) => point.reps > 15)}>
                <p>Includes sets above 15 reps.</p>
            </Show>
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
