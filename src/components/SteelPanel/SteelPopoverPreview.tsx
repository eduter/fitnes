import { createSignal, type JSX } from 'solid-js';
import { SteelPanel } from './SteelPanel.tsx';
import './SteelPopoverPreview.css';

/** Standalone 256-pixel experiment comparing stepped reveals of the shared steel frame. */
function SteelPopoverPreview(): JSX.Element {
    const [stepPixels, setStepPixels] = createSignal(3);
    const [frames, setFrames] = createSignal(1);
    const [phase, setPhase] = createSignal<'closed' | 'opening' | 'open' | 'closing'>('closed');
    let opener!: HTMLButtonElement;
    let closer!: HTMLButtonElement;
    const busy = () => phase() !== 'closed';
    const steps = () => 96 / stepPixels();

    function finishAnimation(event: AnimationEvent) {
        if (event.target !== event.currentTarget) {
            return;
        }
        if (phase() === 'opening') {
            setPhase('open');
            closer.focus({ preventScroll: true });
        } else if (phase() === 'closing') {
            setPhase('closed');
            opener.focus({ preventScroll: true });
        }
    }

    return (
        <main
            class="steel-popover-preview"
            style={{
                '--reveal-steps': steps(),
                '--reveal-duration': `${(steps() * frames() * 1000) / 60}ms`,
            }}
            onKeyDown={(event) => {
                if (event.key !== 'Escape' || phase() !== 'open') {
                    return;
                }
                event.preventDefault();
                setPhase('closing');
            }}
        >
            <h1>Stepped windows</h1>
            <fieldset disabled={busy()}>
                <legend>Pixels per step</legend>
                <button type="button" aria-pressed={stepPixels() === 3} onClick={() => setStepPixels(3)}>
                    3px
                </button>
                <button type="button" aria-pressed={stepPixels() === 16} onClick={() => setStepPixels(16)}>
                    16px
                </button>
            </fieldset>
            <fieldset disabled={busy()}>
                <legend>Hold each step</legend>
                <button type="button" aria-pressed={frames() === 1} onClick={() => setFrames(1)}>
                    1 frame
                </button>
                <button type="button" aria-pressed={frames() === 2} onClick={() => setFrames(2)}>
                    2 frames
                </button>
            </fieldset>
            <button
                ref={opener}
                class="steel-popover-preview__opener"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={busy()}
                aria-controls="steel-popover"
                disabled={busy()}
                onClick={() => setPhase('opening')}
            >
                Open popover
            </button>
            <SteelPanel
                id="steel-popover"
                class="steel-popover-preview__popover"
                role="dialog"
                aria-labelledby="steel-popover-title"
                hidden={phase() === 'closed'}
                inert={phase() !== 'open'}
                data-phase={phase()}
                onAnimationEnd={finishAnimation}
            >
                <h2 id="steel-popover-title">Steel popover</h2>
                <p>One strip at a time.</p>
                <button ref={closer} type="button" onClick={() => setPhase('closing')}>
                    Close popover
                </button>
            </SteelPanel>
            <p class="steel-popover-preview__readout" aria-live="polite">
                {stepPixels()}px · {steps()} steps · {Math.round((steps() * frames() * 1000) / 60)}ms
            </p>
            <p class="steel-popover-preview__resolution">256 × 240 logical pixels</p>
        </main>
    );
}

export { SteelPopoverPreview };
