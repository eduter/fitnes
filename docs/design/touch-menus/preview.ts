import frameUrl from '../../../src/components/SteelPanel/steel-panel.svg?url';

const width = 256;
const height = 448;
const ink = { black: '#000000', shadow: '#451600', muted: '#7d5c4b', light: '#d8a082' };
const concepts: Concept[] = [
    {
        id: 'd',
        title: 'D · Slim chevron',
        description: 'A fine left chevron introduces each uppercase action. Inputs keep their corner brackets.',
        tradeoff: 'Quietest treatment. Case and position distinguish actions from the mixed-case content.',
        pointer: ['1000', '0100', '0010', '0001', '0010', '0100', '1000'],
    },
    {
        id: 'e',
        title: 'E · Bold chevron',
        description: 'A thicker left chevron gives the same actions a stronger pixel silhouette.',
        tradeoff: 'Most legible marker at a glance. The button label and chevron share the same text color.',
        pointer: ['110000', '011000', '001100', '000110', '000011', '000110', '001100', '011000', '110000'],
    },
    {
        id: 'f',
        title: 'F · Double chevron',
        description: 'Two fine left chevrons make each action marker more prominent without a button box.',
        tradeoff: 'Strongest directional cue. Slightly busier when a menu contains several actions.',
        pointer: ['10001000', '01000100', '00100010', '00010001', '00100010', '01000100', '10001000'],
    },
];

await start();

/** Mount isolated alternatives after their shared bitmap font and frame have loaded. */
async function start(): Promise<void> {
    const face = new FontFace(
        'FitNES study',
        `url(${new URL('./fonts/PixelOperator-grid.ttf', import.meta.url).href})`
    );
    document.fonts.add(await face.load());
    const frame = new Image();
    frame.src = frameUrl;
    await frame.decode();
    const selected = new URLSearchParams(location.search).get('option');
    if (concepts.some((concept) => concept.id === selected)) {
        document.body.dataset.single = selected ?? '';
    }
    for (const link of document.querySelectorAll<HTMLAnchorElement>('.chooser a')) {
        const option = new URL(link.href).searchParams.get('option');
        if (option === selected) {
            link.setAttribute('aria-current', 'page');
        }
    }
    for (const concept of concepts) {
        if (!document.body.dataset.single || selected === concept.id) {
            mount(concept, frame);
        }
    }
    document.body.dataset.ready = 'true';
}

interface Concept {
    id: 'd' | 'e' | 'f';
    title: string;
    description: string;
    tradeoff: string;
    pointer: string[];
}

function mount(concept: Concept, frame: HTMLImageElement): void {
    const article = document.createElement('article');
    article.className = 'alternative';
    article.dataset.option = concept.id;
    article.innerHTML = `<h2>${concept.title}</h2><p class="description">${concept.description}</p><div class="screen-space"><div class="screen"><canvas width="256" height="448" aria-hidden="true"></canvas><div class="controls"></div></div></div><p class="tradeoff">${concept.tradeoff}</p>`;
    document.querySelector('.alternatives')?.append(article);
    const screen = article.querySelector<HTMLDivElement>('.screen');
    const space = article.querySelector<HTMLDivElement>('.screen-space');
    const canvas = article.querySelector('canvas');
    const controls = article.querySelector<HTMLDivElement>('.controls');
    const context = canvas?.getContext('2d');
    if (!screen || !space || !canvas || !controls || !context) {
        throw new Error(`Cannot mount alternative ${concept.id}`);
    }
    const state: State = { weight: '60', reps: '8', set: 2, view: 'set', message: '', focused: '', pressed: '' };
    const demo = { concept, frame, context, controls, state };
    const resize = new ResizeObserver(() => {
        // Snap the whole logical screen to device pixels, including its font raster
        const scale = Math.max(1, Math.floor((article.clientWidth * devicePixelRatio) / width)) / devicePixelRatio;
        screen.style.transform = `scale(${scale})`;
        space.style.width = `${width * scale}px`;
        space.style.height = `${height * scale}px`;
    });
    resize.observe(article);
    render(demo);
}

interface State {
    weight: string;
    reps: string;
    set: number;
    view: 'set' | 'more' | 'history';
    message: string;
    focused: string;
    pressed: string;
}

interface Demo {
    concept: Concept;
    frame: HTMLImageElement;
    context: CanvasRenderingContext2D;
    controls: HTMLDivElement;
    state: State;
}

function render(demo: Demo, rebuild = true): void {
    const { context: c, state, controls } = demo;
    c.imageSmoothingEnabled = false;
    c.fillStyle = ink.black;
    c.fillRect(0, 0, width, height);
    if (rebuild) {
        controls.replaceChildren();
    }
    text(c, 'FitNES', 12, 12);
    text(c, 'Training', 244, 12, ink.muted, 'right');
    panel(demo, 0, 40, 256, 360);
    text(c, 'Push day', 16, 56, ink.muted);
    text(c, 'Bench press', 16, 80);
    text(c, `Set ${state.set} of 4`, 16, 104);
    for (let i = 0; i < 4; i++) {
        c.fillStyle = i < state.set - 1 ? ink.light : ink.muted;
        c.fillRect(192 + i * 12, 109, 8, 4);
    }
    c.fillStyle = ink.muted;
    c.fillRect(16, 128, 224, 1);
    if (state.view === 'more') {
        text(c, 'Set options', 16, 152);
        action(
            demo,
            'Last session',
            16,
            184,
            224,
            40,
            () => {
                state.view = 'history';
                render(demo);
            },
            rebuild
        );
        action(demo, 'Skip this set', 16, 232, 224, 40, () => advance(demo, 'Set skipped'), rebuild);
        action(
            demo,
            'Back to set',
            16,
            296,
            224,
            40,
            () => {
                state.view = 'set';
                render(demo);
            },
            rebuild
        );
    } else if (state.view === 'history') {
        text(c, 'Last session · 1 Nov', 16, 152);
        text(c, 'Set 1      60 kg x 8', 16, 184);
        text(c, 'Set 2      60 kg x 8', 16, 208);
        text(c, 'Set 3      60 kg x 7', 16, 232);
        action(
            demo,
            'Back to options',
            16,
            296,
            224,
            40,
            () => {
                state.view = 'more';
                render(demo);
            },
            rebuild
        );
    } else {
        text(c, 'Target', 16, 144, ink.muted);
        text(c, '60 kg x 8', 240, 144, ink.light, 'right');
        text(c, 'Last time', 16, 168, ink.muted);
        text(c, '60 kg x 8', 240, 168, ink.light, 'right');
        text(c, 'This set', 16, 200);
        text(c, 'Weight (kg)', 16, 224, ink.muted);
        text(c, 'Reps', 136, 224, ink.muted);
        value(demo, 'weight', 16, 248, 104, rebuild);
        value(demo, 'reps', 136, 248, 104, rebuild);
        action(demo, 'Log set', 16, 312, 224, 40, () => advance(demo, 'Set logged'), rebuild);
        action(
            demo,
            'More',
            16,
            352,
            224,
            40,
            () => {
                state.view = 'more';
                render(demo);
            },
            rebuild
        );
    }
    text(c, state.message || 'Your session stays on this device.', 12, 408, ink.muted);
}

function text(
    c: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    color = ink.light,
    align: CanvasTextAlign = 'left'
): void {
    c.font = '16px "FitNES study"';
    c.textBaseline = 'top';
    c.textAlign = align;
    c.fillStyle = color;
    c.fillText(label, x, y);
}

function panel(demo: Demo, x: number, y: number, w: number, h: number): void {
    const { context: c, frame } = demo;
    c.fillStyle = ink.black;
    c.fillRect(x, y, w, h);
    for (const [sx, sw, dx, dw] of [
        [0, 8, x + 2, 8],
        [8, 2, x + 10, w - 20],
        [10, 8, x + w - 10, 8],
    ]) {
        for (const [sy, sh, dy, dh] of [
            [0, 8, y + 2, 8],
            [8, 2, y + 10, h - 20],
            [10, 8, y + h - 10, 8],
        ]) {
            c.drawImage(frame, sx, sy, sw, sh, dx, dy, dw, dh);
        }
    }
}

function action(
    demo: Demo,
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    invoke: () => void,
    rebuild: boolean
): void {
    const { context: c, state, concept } = demo;
    const key = label;
    const pressed = state.pressed === key;
    const active = pressed || state.focused === key;
    const baseline = y + Math.floor((h - 16) / 2);
    const color = active ? ink.black : ink.light;

    // Inversion provides immediate touch and keyboard feedback without permanent button chrome
    if (active) {
        c.fillStyle = ink.light;
        c.fillRect(x, y + 2, w, h - 4);
    }
    text(c, label.toUpperCase(), x + 24, baseline, color);
    chevron(c, concept.pointer, x + 8, y + Math.floor((h - concept.pointer.length) / 2), color);
    if (rebuild) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label.toUpperCase();
        position(button, key, x, y, w, h);
        button.addEventListener('click', invoke);
        button.addEventListener('pointerdown', () => {
            state.pressed = key;
            render(demo, false);
        });
        for (const event of ['pointerup', 'pointercancel', 'pointerleave']) {
            button.addEventListener(event, () => {
                state.pressed = '';
                render(demo, false);
            });
        }
        button.addEventListener('focus', () => {
            state.focused = key;
            render(demo, false);
        });
        button.addEventListener('blur', () => {
            state.focused = '';
            render(demo, false);
        });
        demo.controls.append(button);
    }
}

function value(demo: Demo, field: 'weight' | 'reps', x: number, y: number, w: number, rebuild: boolean): void {
    const { context: c, state } = demo;
    const thickness = state.focused === field ? 3 : 2;
    c.fillStyle = ink.light;
    for (const xx of [x, x + w - 8]) {
        for (const yy of [y + 4, y + 42]) {
            c.fillRect(xx, yy, 8, thickness);
            c.fillRect(xx === x ? xx : xx + 8 - thickness, yy === y + 4 ? yy : yy - 4, thickness, 6);
        }
    }
    text(c, state[field], x + w / 2, y + 16, ink.light, 'center');
    if (rebuild) {
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = field === 'weight' ? 'decimal' : 'numeric';
        input.setAttribute('aria-label', field === 'weight' ? 'Weight in kg' : 'Reps');
        input.value = state[field];
        position(input, field, x, y, w, 48);
        input.addEventListener('focus', () => {
            state.focused = field;
            input.select();
            render(demo, false);
        });
        input.addEventListener('blur', () => {
            if (state[field] === '' || !Number.isFinite(Number(state[field]))) {
                state[field] = field === 'weight' ? '60' : '8';
                input.value = state[field];
            }
            state.focused = '';
            render(demo, false);
        });
        input.addEventListener('input', () => {
            const valid = field === 'weight' ? /^\d{0,3}([.,]\d{0,2})?$/ : /^\d{0,3}$/;
            if (valid.test(input.value)) {
                state[field] = input.value.replace(',', '.');
            } else {
                input.value = state[field];
            }
            render(demo, false);
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                input.blur();
            }
        });
        demo.controls.append(input);
    }
}

function position(element: HTMLElement, key: string, x: number, y: number, w: number, h: number): void {
    element.dataset.key = key;
    Object.assign(element.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
}

function chevron(c: CanvasRenderingContext2D, pixels: string[], x: number, y: number, color: string): void {
    c.fillStyle = color;
    for (let row = 0; row < pixels.length; row++) {
        for (let column = 0; column < pixels[row].length; column++) {
            if (pixels[row][column] === '1') {
                c.fillRect(x + column, y + row, 1, 1);
            }
        }
    }
}

function advance(demo: Demo, message: string): void {
    const { state } = demo;
    state.message = state.set === 4 ? 'Exercise complete. Nice work!' : `${message}. Next set ready.`;
    state.set = Math.min(4, state.set + 1);
    state.view = 'set';
    state.focused = '';
    state.pressed = '';
    render(demo);
}
