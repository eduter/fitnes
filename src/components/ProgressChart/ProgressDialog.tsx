import { createSignal, type JSX } from 'solid-js';
import { progressRanges } from '../../domain/progress.ts';
import { Button, OptionPicker, Popover } from '../Controls/index.ts';
import { DialogActions } from '../DialogActions.tsx';
import { DialogTitle } from '../Typography.tsx';
import { type ChartSeries, ProgressChart } from './ProgressChart.tsx';
import './ProgressDialog.css';

/** Give the graph its own opaque window, with optional explanation in a child dialog. */
function ProgressDialog(props: ProgressDialogProps): JSX.Element {
    const [help, setHelp] = createSignal(false);
    let helpTrigger: HTMLElement | undefined;
    const mount = () => document.getElementById('root') ?? undefined;
    return (
        <>
            <Popover
                open={props.open}
                onOpenChange={props.onOpenChange}
                label={`${props.label} graph`}
                class="progress-dialog"
                width={240}
                mount={mount()}
                returnFocus={props.trigger}
            >
                <div class="stack">
                    <OptionPicker
                        label="Period"
                        options={progressRanges}
                        value={props.range}
                        onChange={props.onRangeChange}
                        popoverMount={mount()}
                    />
                    <ProgressChart
                        label={props.label}
                        unit={props.unit}
                        series={props.series}
                        empty={props.empty}
                        width={216}
                        height={240}
                    />
                    <div class="progress-dialog__actions">
                        <Button
                            aria-label="About this graph"
                            onPress={(event) => {
                                helpTrigger = event.currentTarget;
                                setHelp(true);
                            }}
                        >
                            ?
                        </Button>
                        <DialogActions kind="end" onConfirm={() => props.onOpenChange(false)} />
                    </div>
                </div>
            </Popover>
            <Popover
                open={help()}
                onOpenChange={setHelp}
                label="About this graph"
                mount={mount()}
                anchor={() => helpTrigger}
                returnFocus={() => helpTrigger}
            >
                <div class="stack">
                    <DialogTitle>About this graph</DialogTitle>
                    <p>{props.explanation}</p>
                    <DialogActions kind="end" onConfirm={() => setHelp(false)} />
                </div>
            </Popover>
        </>
    );
}

/** Controlled chart data and period; histories stay outside the graph window. */
interface ProgressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: () => HTMLElement | undefined;
    label: string;
    unit: string;
    series: readonly ChartSeries[];
    range: string;
    onRangeChange: (range: string) => void;
    explanation: string;
    empty?: string;
}

export type { ProgressDialogProps };
export { ProgressDialog };
