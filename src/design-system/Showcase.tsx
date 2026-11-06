import { createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import homeArt from '../../art/home/gym.png';
import { Button, OptionPicker, Popover, Spinner, TextInput } from '../components/Controls/index.ts';
import { MembershipExample, WeightExample, WorkoutExample } from './PageExamples.tsx';
import { homePalette } from './palette.ts';
import './showcase.css';

function Showcase(): JSX.Element {
    const [page, setPage] = createSignal('workout');
    const [sound, setSound] = createSignal('on');
    const [unit, setUnit] = createSignal('kg');
    const [routine, setRoutine] = createSignal('full');
    const [name, setName] = createSignal('Bench press');
    const [weight, setWeight] = createSignal(60);
    const [editor, setEditor] = createSignal(false);
    const [mount, setMount] = createSignal<HTMLDivElement>();
    let spacer: HTMLDivElement | undefined;
    let trigger: HTMLButtonElement | undefined;
    const pages = [
        { value: 'workout', label: 'Workout' },
        { value: 'weight', label: 'Weight' },
        { value: 'members', label: 'Multiple' },
        { value: 'framed', label: 'Fields' },
        { value: 'windows', label: 'Windows' },
        { value: 'palette', label: 'Palette' },
        { value: 'art', label: 'Artwork' },
    ];

    function scale(): void {
        const surface = mount();
        if (!surface || !spacer) {
            return;
        }
        const ratio = devicePixelRatio || 1;
        const factor =
            Math.max(1, Math.floor((Math.min(document.documentElement.clientWidth, 512) * ratio) / 256)) / ratio;
        surface.style.transform = `scale(${factor})`;
        spacer.style.width = `${256 * factor}px`;
        const available = Math.floor(window.innerHeight / factor);
        surface.style.setProperty('--nes-screen-height', `${Math.max(240, available)}px`);
        spacer.style.height = `${surface.offsetHeight * factor}px`;
    }
    onMount(() => {
        const observer = new ResizeObserver(scale);
        if (mount()) {
            observer.observe(mount() as HTMLDivElement);
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
                <Show when={mount()}>
                    {(host) => (
                        <>
                            <header class="ds-nav">
                                <OptionPicker
                                    label="Review"
                                    value={page()}
                                    onChange={setPage}
                                    options={pages}
                                    popoverMount={host()}
                                />
                            </header>
                            <Show when={page() === 'workout'}>
                                <WorkoutExample mount={host()} />
                            </Show>
                            <Show when={page() === 'weight'}>
                                <WeightExample mount={host()} />
                            </Show>
                            <Show when={page() === 'members'}>
                                <MembershipExample mount={host()} />
                            </Show>
                            <Show when={page() === 'framed'}>
                                <section class="ds-section" aria-label="Framed fields">
                                    <div class="ds-fields">
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
                                            label="Unit"
                                            value={unit()}
                                            onChange={setUnit}
                                            popoverMount={host()}
                                            options={[
                                                { value: 'kg', label: 'kg' },
                                                { value: 'lb', label: 'lb' },
                                            ]}
                                        />
                                        <OptionPicker
                                            label="Routine"
                                            value={routine()}
                                            onChange={setRoutine}
                                            popoverMount={host()}
                                            options={[
                                                { value: 'full', label: 'Full body' },
                                                { value: 'upper', label: 'Upper body' },
                                                { value: 'lower', label: 'Lower body' },
                                            ]}
                                        />
                                    </div>
                                    <p class="ds-note">
                                        Gold values open menus.
                                        <br />
                                        Tap outside to dismiss.
                                    </p>
                                </section>
                            </Show>
                            <Show when={page() === 'windows'}>
                                <section class="ds-section">
                                    <Button
                                        ref={(element) => {
                                            trigger = element;
                                        }}
                                        onPress={() => setEditor(true)}
                                    >
                                        Edit exercise
                                    </Button>
                                    <p class="ds-note">
                                        Open a value in the editor.
                                        <br />
                                        The next window overlays it.
                                    </p>
                                    <p role="status">
                                        {name()}: {weight().toFixed(1)} {unit()}
                                    </p>
                                </section>
                                <Popover
                                    open={editor()}
                                    onOpenChange={setEditor}
                                    label="Edit exercise"
                                    mount={host()}
                                    anchor={() => trigger}
                                    returnFocus={() => trigger}
                                >
                                    <TextInput
                                        label="Name"
                                        value={name()}
                                        onInput={(event) => setName(event.currentTarget.value)}
                                    />
                                    <div class="ds-fields">
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
                                    </div>
                                    <Spinner
                                        label={`Weight (${unit()})`}
                                        value={weight()}
                                        onChange={setWeight}
                                        integerDigits={3}
                                        fractionDigits={1}
                                        step={2.5}
                                        popoverMount={host()}
                                    />
                                </Popover>
                            </Show>
                            <Show when={page() === 'palette'}>
                                <section class="ds-section" aria-label="Home palette">
                                    <ul class="ds-palette">
                                        <For each={homePalette}>
                                            {(color) => (
                                                <li>
                                                    <span
                                                        class="ds-swatch"
                                                        style={{ background: `var(--nes-color-${color.token})` }}
                                                    />
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
                            </Show>
                            <Show when={page() === 'art'}>
                                <img
                                    class="ds-home"
                                    src={homeArt}
                                    width="256"
                                    height="200"
                                    alt="FitNES home artwork, the source of all nine colors"
                                />
                            </Show>
                        </>
                    )}
                </Show>
            </main>
        </div>
    );
}
const target = document.getElementById('design-system');
if (!target) {
    throw new Error('Missing design-system showcase root');
}
render(() => <Showcase />, target);
