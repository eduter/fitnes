import { createMemo, For, type JSX, Show } from 'solid-js';
import './ProgressChart.css';

/** Fixed-resolution, integer-pixel time series using passive NES inks and square markers. */
function ProgressChart(props: ProgressChartProps): JSX.Element {
    const all = createMemo(() => props.series.flatMap((series) => series.points));
    const bounds = createMemo(() => {
        const values = all().map((point) => point.value);
        const low = Math.min(...values);
        const high = Math.max(...values);
        const padding = Math.max((high - low) * 0.1, 1);
        const dates = all().map((point) => point.at);
        return { low: low - padding, high: high + padding, start: Math.min(...dates), end: Math.max(...dates) };
    });
    const x = (at: number) => 40 + Math.round(((at - bounds().start) / (bounds().end - bounds().start || 1)) * 176);
    const y = (value: number) => 112 - Math.round(((value - bounds().low) / (bounds().high - bounds().low)) * 104);
    return (
        <figure class="progress-chart" aria-label={props.label}>
            <figcaption>
                {props.label} ({props.unit})
            </figcaption>
            <Show
                when={all().length}
                fallback={<p class="progress-chart__empty">{props.empty ?? 'No data in this period.'}</p>}
            >
                <div class="progress-chart__plot">
                    <svg
                        viewBox="0 0 232 144"
                        width="232"
                        height="144"
                        role="img"
                        aria-label={props.label}
                        shape-rendering="crispEdges"
                    >
                        <title>
                            {props.label}.{' '}
                            {props.series.map((series) => `${series.label}: ${series.points.length} points`).join('. ')}
                        </title>
                        <For each={[0, 1, 2]}>
                            {(index) => {
                                const value = () => bounds().low + ((bounds().high - bounds().low) * index) / 2;
                                return (
                                    <g>
                                        <path class="progress-chart__grid" d={`M40 ${y(value())} H216`} />
                                    </g>
                                );
                            }}
                        </For>
                        <For each={props.series}>
                            {(series, index) => (
                                <g class={index() === 0 ? 'progress-chart__daily' : 'progress-chart__average'}>
                                    <polyline
                                        fill="none"
                                        points={series.points
                                            .map((point) => `${x(point.at)},${y(point.value)}`)
                                            .join(' ')}
                                        stroke-dasharray={index() === 0 && props.series.length > 1 ? '2 2' : undefined}
                                    />
                                    <For each={series.points}>
                                        {(point) => (
                                            <rect x={x(point.at) - 1} y={y(point.value) - 1} width="3" height="3">
                                                <title>
                                                    {new Date(point.at).toLocaleDateString()}: {point.value.toFixed(1)}{' '}
                                                    {props.unit}
                                                </title>
                                            </rect>
                                        )}
                                    </For>
                                </g>
                            )}
                        </For>
                    </svg>
                    <For each={[0, 1, 2]}>
                        {(index) => {
                            const value = () => bounds().low + ((bounds().high - bounds().low) * index) / 2;
                            return (
                                <span
                                    class="progress-chart__tick"
                                    style={{ top: `${y(value()) - 8}px` }}
                                    aria-hidden="true"
                                >
                                    {value().toFixed(1)}
                                </span>
                            );
                        }}
                    </For>
                    <span class="progress-chart__start" aria-hidden="true">
                        {shortDate(bounds().start)}
                    </span>
                    <span class="progress-chart__end" aria-hidden="true">
                        {shortDate(bounds().end)}
                    </span>
                </div>
                <div class="progress-chart__legend">
                    <For each={props.series}>
                        {(series, index) => (
                            <span>
                                <span
                                    aria-hidden="true"
                                    class={
                                        index() === 0 && props.series.length > 1
                                            ? 'progress-chart__key progress-chart__key--dotted'
                                            : 'progress-chart__key'
                                    }
                                />{' '}
                                {series.label}
                            </span>
                        )}
                    </For>
                </div>
            </Show>
        </figure>
    );
}

/** Time/value points in a shared display unit, ordered chronologically. */
interface ChartSeries {
    label: string;
    points: readonly { at: number; value: number }[];
}
/** Accessible title, unit, and time series for a fixed 232-pixel plot. */
interface ProgressChartProps {
    label: string;
    unit: string;
    series: readonly ChartSeries[];
    empty?: string;
}
function shortDate(at: number): string {
    const date = new Date(at);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

export type { ChartSeries, ProgressChartProps };
export { ProgressChart };
