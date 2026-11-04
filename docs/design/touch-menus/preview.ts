import frameUrl from '../../../src/components/SteelPanel/steel-panel.svg?url';

const width = 256;
const height = 448;
const ink = { black: '#000000', shadow: '#451600', muted: '#7d5c4b', light: '#d8a082' };
const pointer = ['110000', '011000', '001100', '000110', '000011', '000110', '001100', '011000', '110000'];
const concepts: Concept[] = [
    {
        id: 'g',
        title: 'G · Stacked arrows',
        description: 'Compact number brackets, with filled up/down triangles stacked immediately to their right.',
        tradeoff: 'Narrowest spinner. The vertical arrow pair needs more height for comfortable tapping.',
        layout: 'stacked',
    },
    {
        id: 'h',
        title: 'H · Side-by-side arrows',
        description: 'The down and up triangles sit side by side to the right of each tightly bracketed number.',
        tradeoff: 'Shortest spinner. Both values still fit next to each other, with separate thumb targets.',
        layout: 'inline',
    },
    {
        id: 'i',
        title: 'I · Aligned rows',
        description: 'Labels and compact spinners share a line. Both arrow pairs align on the right.',
        tradeoff: 'Clearest label-to-value pairing. Uses two rows while keeping each control compact.',
        layout: 'rows',
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
    id: 'g' | 'h' | 'i';
    title: string;
    description: string;
    tradeoff: string;
    layout: 'stacked' | 'inline' | 'rows';
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
    const { context: c, state, concept, controls } = demo;
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
        if (concept.layout === 'rows') {
            text(c, 'Weight (kg)', 16, 236, ink.muted);
            text(c, 'Reps', 16, 280, ink.muted);
            value(demo, 'weight', 112, 224, rebuild);
            value(demo, 'reps', 112, 268, rebuild);
        } else {
            text(c, 'Weight (kg)', 16, 224, ink.muted);
            text(c, 'Reps', 136, 224, ink.muted);
            const top = concept.layout === 'stacked' ? 240 : 248;
            value(demo, 'weight', 16, top, rebuild);
            value(demo, 'reps', 136, top, rebuild);
        }
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
    const { context: c, state } = demo;
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
    text(c, label.toUpperCase(), x + 16, baseline, color);
    chevron(c, pointer, x + 8, y + Math.floor((h - pointer.length) / 2), color);
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

function value(demo: Demo, field: 'weight' | 'reps', x: number, y: number, rebuild: boolean): void {
    const { context: c, state, concept, controls } = demo;
    const measured = c.measureText(state[field] || '0').width;
    const inputWidth = Math.max(34, measured + 8);
    const h = concept.layout === 'stacked' ? 68 : 40;
    const textTop = y + Math.floor((h - 16) / 2);
    const center = x + Math.floor(inputWidth / 2);
    const bracketLeft = center - Math.ceil(measured / 2) - 4;
    const thickness = state.focused === field ? 2 : 1;

    // Visible brackets hug the glyphs while the independent hit areas remain thumb-sized
    c.fillStyle = ink.light;
    for (const xx of [bracketLeft, bracketLeft + measured + 4]) {
        for (const yy of [textTop + 1, textTop + 16]) {
            c.fillRect(xx, yy, 4, thickness);
            c.fillRect(xx === bracketLeft ? xx : xx + 4 - thickness, yy === textTop + 1 ? yy : yy - 3, thickness, 4);
        }
    }
    text(c, state[field], center, textTop, ink.light, 'center');
    if (rebuild) {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.key = field;
        input.inputMode = field === 'weight' ? 'decimal' : 'numeric';
        input.setAttribute('aria-label', field === 'weight' ? 'Weight in kg' : 'Reps');
        input.setAttribute('role', 'spinbutton');
        input.setAttribute('aria-valuemin', '0');
        input.setAttribute('aria-valuemax', field === 'weight' ? '999.99' : '999');
        input.value = state[field];
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
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                adjust(demo, field, event.key === 'ArrowUp' ? 1 : -1);
            }
            if (event.key === 'Enter') {
                input.blur();
            }
        });
        demo.controls.append(input);
    }
    const input = controls.querySelector<HTMLInputElement>(`input[data-key="${field}"]`);
    if (input) {
        position(input, field, x, y, inputWidth, h);
        input.value = state[field];
        input.setAttribute('aria-valuenow', String(Number(state[field])));
    }
    if (concept.layout === 'stacked') {
        stepControl(demo, field, 1, x + inputWidth, y, 34, rebuild);
        stepControl(demo, field, -1, x + inputWidth, y + 34, 34, rebuild);
    } else {
        stepControl(demo, field, -1, x + inputWidth, y, 40, rebuild);
        stepControl(demo, field, 1, x + inputWidth + 34, y, 40, rebuild);
    }
}

function stepControl(
    demo: Demo,
    field: 'weight' | 'reps',
    direction: 1 | -1,
    x: number,
    y: number,
    h: number,
    rebuild: boolean
): void {
    const { context: c, state, controls } = demo;
    const key = `${field}-${direction}`;
    const limit = field === 'weight' ? 999.99 : 999;
    const disabled = direction === -1 ? Number(state[field]) <= 0 : Number(state[field]) >= limit;
    const active = !disabled && (state.pressed === key || state.focused === key);
    if (active) {
        c.fillStyle = ink.light;
        c.fillRect(x + 2, y + 2, 30, h - 4);
    }
    c.fillStyle = disabled ? ink.muted : active ? ink.black : ink.light;
    const top = y + Math.floor((h - 4) / 2);
    for (let row = 0; row < 4; row++) {
        const span = direction === 1 ? row : 3 - row;
        c.fillRect(x + 14 + 3 - span, top + row, span * 2 + 1, 1);
    }
    if (rebuild) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.key = key;
        const verb = direction === 1 ? 'Increase' : 'Decrease';
        button.setAttribute('aria-label', `${verb} ${field}${field === 'weight' ? ' by 2.5 kg' : ' by 1'}`);
        button.addEventListener('click', () => adjust(demo, field, direction));
        button.addEventListener('pointerdown', (event) => {
            // Arrow taps adjust immediately without focusing a text input or opening its keyboard
            event.preventDefault();
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
        controls.append(button);
    }
    const button = controls.querySelector<HTMLButtonElement>(`button[data-key="${key}"]`);
    if (button) {
        position(button, key, x, y, 34, h);
        button.disabled = disabled;
    }
}

function adjust(demo: Demo, field: 'weight' | 'reps', direction: 1 | -1): void {
    const { state } = demo;
    const step = field === 'weight' ? 250 : 100;
    const maximum = field === 'weight' ? 99999 : 99900;
    // Integer hundredths preserve directly typed fractional loads across repeated taps
    const current = Math.round(Number(state[field] || '0') * 100);
    state[field] = String(Math.max(0, Math.min(maximum, current + direction * step)) / 100);
    render(demo, false);
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
