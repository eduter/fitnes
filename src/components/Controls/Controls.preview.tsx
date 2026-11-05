import { createSignal, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { Button } from '../Button/Button.tsx';
import { Popover } from '../Popover/Popover.tsx';
import { Spinner } from '../Spinner/Spinner.tsx';
import { SteelPanel } from '../SteelPanel/SteelPanel.tsx';
import { TextInput } from '../TextInput/TextInput.tsx';
import './Controls.preview.css';

function Preview(): JSX.Element {
    const [name, setName] = createSignal('Bench press');
    const [weight, setWeight] = createSignal(60);
    const [reps, setReps] = createSignal(8);
    const [step, setStep] = createSignal(2.5);
    const [scope, setScope] = createSignal<HTMLDivElement>();
    const [about, setAbout] = createSignal(false);
    const [message, setMessage] = createSignal('Sample values only.');
    let opener: HTMLButtonElement | undefined;
    let space: HTMLDivElement | undefined;

    function scalePreview(): void {
        const screen = scope();
        if (!screen || !space) {
            return;
        }
        const ratio = devicePixelRatio || 1;
        // innerWidth can expand with overflow during a phone rotation; clientWidth stays tied to the viewport
        const viewportWidth = document.documentElement.clientWidth;
        const available = Math.min(viewportWidth, 512);
        const scale = Math.max(1, Math.floor((available * ratio) / 256)) / ratio;
        const physicalLeft = Math.floor((viewportWidth * ratio - 256 * scale * ratio) / 2);
        screen.style.transform = `translateX(${Math.max(0, physicalLeft) / ratio}px) scale(${scale})`;
        space.style.height = `${screen.scrollHeight * scale}px`;
    }

    onMount(() => {
        scalePreview();
        window.addEventListener('resize', scalePreview);
        void document.fonts.ready.then(scalePreview);
    });
    onCleanup(() => window.removeEventListener('resize', scalePreview));

    return (
        <>
            <header class="nes-demo__intro">
                <h1>Reusable FitNES controls</h1>
                <p>Type a name with your phone keyboard. Tap a number for the number pad.</p>
            </header>
            <div class="nes-demo__space" ref={space}>
                <div class="nes-demo__screen nes-control" ref={setScope} data-testid="controls-preview-screen">
                    <header class="nes-demo__brand">FitNES</header>
                    <SteelPanel>
                        <h2 class="nes-demo__title">{name() || 'Exercise name'}</h2>
                        <TextInput
                            label="Exercise name"
                            value={name()}
                            onInput={(event) => setName(event.currentTarget.value)}
                            name="exercise-name"
                            autocomplete="off"
                        />
                        <Show when={scope()}>
                            {(mount) => (
                                <>
                                    <div class="nes-demo__quantities">
                                        <Spinner
                                            label="Weight (kg)"
                                            value={weight()}
                                            onChange={setWeight}
                                            step={step()}
                                            integerDigits={3}
                                            fractionDigits={2}
                                            popoverMount={mount()}
                                        />
                                        <Spinner
                                            label="Reps"
                                            value={reps()}
                                            onChange={setReps}
                                            integerDigits={2}
                                            popoverMount={mount()}
                                        />
                                    </div>
                                    <Spinner
                                        label="Weight step (kg)"
                                        value={step()}
                                        onChange={setStep}
                                        step={0.25}
                                        min={0.01}
                                        integerDigits={1}
                                        fractionDigits={2}
                                        popoverMount={mount()}
                                    />
                                    <Button
                                        class="nes-demo__action"
                                        onPress={() => setMessage(`${weight().toFixed(2)} kg x ${reps()} recorded`)}
                                    >
                                        Log set
                                    </Button>
                                    <Button
                                        class="nes-demo__action"
                                        ref={(element) => {
                                            opener = element;
                                        }}
                                        aria-haspopup="dialog"
                                        aria-expanded={about()}
                                        onPress={() => setAbout(true)}
                                    >
                                        About these controls
                                    </Button>
                                    <Popover
                                        open={about()}
                                        onOpenChange={setAbout}
                                        label="Reusable popover"
                                        mount={mount()}
                                        height={96}
                                        returnFocus={() => opener}
                                    >
                                        <p class="nes-demo__about">Thin border. Stepped reveal.</p>
                                        <Button onPress={() => setAbout(false)}>Close</Button>
                                    </Popover>
                                </>
                            )}
                        </Show>
                        <p class="nes-demo__readout" aria-live="polite">
                            {message()}
                        </p>
                    </SteelPanel>
                </div>
            </div>
            <footer class="nes-demo__notes">
                Demo only. The controls do not open your workout database. Popovers inherit PR 23’s 16px reveal and
                reverse closing; reduced motion is supported.
            </footer>
        </>
    );
}

const target = document.getElementById('controls-preview');
if (!target) {
    throw new Error('Missing controls preview root');
}
render(() => <Preview />, target);
