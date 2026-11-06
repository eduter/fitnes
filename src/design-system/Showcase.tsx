import { createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import homeArt from '../../art/home/gym.png';
import { Button, OptionPicker, Popover, Spinner, TextInput } from '../components/Controls/index.ts';
import { SteelPanel } from '../components/SteelPanel/SteelPanel.tsx';
import { homePalette } from './palette.ts';
import './showcase.css';

function Showcase(): JSX.Element {
    const [name, setName] = createSignal('Bench press');
    const [weight, setWeight] = createSignal(60);
    const [reps, setReps] = createSignal(8);
    const [unit, setUnit] = createSignal('kg');
    const [sound, setSound] = createSignal('on');
    const [message, setMessage] = createSignal('No sets recorded.');
    const [confirm, setConfirm] = createSignal(false);
    const [mount, setMount] = createSignal<HTMLDivElement>();
    let spacer: HTMLDivElement | undefined;
    let reset: HTMLButtonElement | undefined;

    function scale(): void {
        const surface = mount();
        if (!surface || !spacer) {
            return;
        }
        const ratio = devicePixelRatio || 1;
        const width = document.documentElement.clientWidth;
        const factor = Math.max(1, Math.floor((Math.min(width, 512) * ratio) / 256)) / ratio;
        surface.style.transform = `scale(${factor})`;
        spacer.style.width = `${256 * factor}px`;
        spacer.style.height = `${surface.offsetHeight * factor}px`;
    }

    onMount(() => {
        const observer = new ResizeObserver(scale);
        const surface = mount();
        if (surface) {
            observer.observe(surface);
        }
        scale();
        window.addEventListener('resize', scale);
        void document.fonts.ready.then(scale);
        onCleanup(() => {
            observer.disconnect();
            window.removeEventListener('resize', scale);
        });
    });

    return (
        <div class="ds-space" ref={spacer}>
            <main class="ds-screen nes-control" ref={setMount} data-testid="design-system-screen">
                <img
                    class="ds-home"
                    src={homeArt}
                    width="256"
                    height="200"
                    alt="FitNES industrial gym artwork: the palette source"
                />
                <header class="ds-section">
                    <h1>Design system</h1>
                    <p>Foundation review</p>
                    <p>Try the controls. All demo values reset when you reload.</p>
                </header>
                <section class="ds-section" aria-labelledby="palette-heading">
                    <h2 id="palette-heading">Home palette</h2>
                    <p>All nine colors from the gym image.</p>
                    <ul class="ds-palette">
                        <For each={homePalette}>
                            {(color) => (
                                <li>
                                    <span class="ds-swatch" style={{ background: `var(--nes-color-${color.token})` }} />
                                    <span>
                                        {color.name}
                                        <br />
                                        {color.hex}
                                    </span>
                                </li>
                            )}
                        </For>
                    </ul>
                </section>
                <section class="ds-section" aria-labelledby="language-heading">
                    <h2 id="language-heading">Text language</h2>
                    <p>Passive text is copper.</p>
                    <p>Gold text invites a tap.</p>
                    <Button onPress={() => setMessage('Action pressed.')}>Try action</Button>
                    <Button disabled>Unavailable</Button>
                    <p>Actions are uppercase. Names and descriptions keep mixed case.</p>
                </section>
                <SteelPanel>
                    <section class="ds-panel" aria-labelledby="controls-heading">
                        <h2 id="controls-heading">Log a set</h2>
                        <TextInput
                            label="Exercise name"
                            value={name()}
                            onInput={(event) => setName(event.currentTarget.value)}
                        />
                        <Show when={mount()}>
                            {(host) => (
                                <>
                                    <div class="ds-quantities">
                                        <Spinner
                                            label={`Weight (${unit()})`}
                                            value={weight()}
                                            onChange={setWeight}
                                            step={2.5}
                                            integerDigits={3}
                                            fractionDigits={1}
                                            popoverMount={host()}
                                        />
                                        <Spinner label="Reps" value={reps()} onChange={setReps} popoverMount={host()} />
                                    </div>
                                    <p>Tap a number for the pad. Arrows step immediately.</p>
                                    <Button
                                        onPress={() =>
                                            setMessage(
                                                `${name() || 'Exercise'}: ${weight().toFixed(1)} ${unit()} x ${reps()} recorded.`
                                            )
                                        }
                                    >
                                        Log set
                                    </Button>
                                </>
                            )}
                        </Show>
                        <p class="ds-readout" role="status">
                            {message()}
                        </p>
                    </section>
                </SteelPanel>
                <section class="ds-section" aria-labelledby="settings-heading">
                    <h2 id="settings-heading">Choose a value</h2>
                    <p>Tap the gold value. Choose an option to apply it and close.</p>
                    <Show when={mount()}>
                        {(host) => (
                            <div class="ds-settings">
                                <OptionPicker
                                    label="Demo unit"
                                    value={unit()}
                                    onChange={setUnit}
                                    popoverMount={host()}
                                    options={[
                                        { value: 'kg', label: 'kg' },
                                        { value: 'lb', label: 'lb' },
                                    ]}
                                />
                                <OptionPicker
                                    label="Sound"
                                    value={sound()}
                                    onChange={setSound}
                                    popoverMount={host()}
                                    options={[
                                        { value: 'on', label: 'On' },
                                        { value: 'off', label: 'Off' },
                                    ]}
                                />
                                <OptionPicker
                                    label="Unavailable choice"
                                    value="off"
                                    onChange={() => undefined}
                                    disabled
                                    options={[{ value: 'off', label: 'Off' }]}
                                />
                            </div>
                        )}
                    </Show>
                    <p>Same menu for on/off. Unit changes only this demo label.</p>
                </section>
                <section class="ds-section" aria-labelledby="messages-heading">
                    <h2 id="messages-heading">Messages</h2>
                    <p role="note">No workouts yet. Start with one set.</p>
                    <p class="ds-error">Error: enter an exercise name.</p>
                    <p>Errors include words; color is an extra cue.</p>
                    <Button
                        ref={(element) => {
                            reset = element;
                        }}
                        onPress={() => setConfirm(true)}
                    >
                        Reset demo
                    </Button>
                    <Show when={mount()}>
                        {(host) => (
                            <Popover
                                open={confirm()}
                                onOpenChange={setConfirm}
                                label="Reset demo?"
                                mount={host()}
                                anchor={() => reset}
                                returnFocus={() => reset}
                            >
                                <p>Reset the sample values?</p>
                                <Button
                                    onPress={() => {
                                        setName('Bench press');
                                        setWeight(60);
                                        setReps(8);
                                        setUnit('kg');
                                        setSound('on');
                                        setMessage('No sets recorded.');
                                        setConfirm(false);
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button onPress={() => setConfirm(false)}>Back</Button>
                            </Popover>
                        )}
                    </Show>
                </section>
                <footer class="ds-section">
                    <p>256 logical pixels. Native text entry. Stepped menus.</p>
                    <p>Palette roles and new patterns are proposals for review.</p>
                </footer>
            </main>
        </div>
    );
}

const target = document.getElementById('design-system');
if (!target) {
    throw new Error('Missing design-system showcase root');
}
render(() => <Showcase />, target);
