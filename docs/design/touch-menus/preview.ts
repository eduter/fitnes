import frameUrl from '../../../src/components/SteelPanel/steel-panel.svg?url';

const width = 256;
const height = 448;
const ink = { black: '#000000', shadow: '#451600', muted: '#7d5c4b', light: '#d8a082' };
const pointer = ['110000', '011000', '001100', '000110', '000011', '000110', '001100', '011000', '110000'];
const storageKey = 'fitnes-input-study-increments-v1';
const concepts: Concept[] = [
    {
        id: 'j',
        title: 'J · Digit grid',
        description: 'Select a fixed digit slot, then choose 0–9 from a game-style grid.',
        tradeoff: 'Closest to the name-entry reference. One tap replaces the selected digit.',
    },
    {
        id: 'k',
        title: 'K · Number pad',
        description: 'The same fixed slots, with a familiar three-column number pad.',
        tradeoff: 'Familiar number positions. Uses a taller popover without opening the system keyboard.',
    },
    {
        id: 'l',
        title: 'L · Digit spinners',
        description: 'Adjust individual places with up/down triangles in a popover.',
        tradeoff: 'Good for small place-value changes; several digits take more taps.',
    },
];

await start();

/** Mount phone-ready alternatives without loading the workout app or its database. */
async function start(): Promise<void> {
    const face = new FontFace(
        'FitNES study',
        `url(${new URL('./fonts/PixelOperator-grid.ttf', import.meta.url).href})`
    );
    document.fonts.add(await face.load());
    const frame = new Image();
    frame.src = frameUrl;
    await frame.decode();
    const requested = new URLSearchParams(location.search).get('option');
    const selected = requested ?? (matchMedia('(max-width: 1000px)').matches ? 'j' : 'all');
    if (concepts.some((concept) => concept.id === selected)) {
        document.body.dataset.single = selected;
    }
    for (const link of document.querySelectorAll<HTMLAnchorElement>('.chooser a')) {
        if (new URL(link.href).searchParams.get('option') === selected) {
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
    id: 'j' | 'k' | 'l';
    title: string;
    description: string;
    tradeoff: string;
}

function mount(concept: Concept, frame: HTMLImageElement): void {
    const article = document.createElement('article');
    article.className = 'alternative';
    article.dataset.option = concept.id;
    article.innerHTML = `<h2>${concept.title}</h2><p class="description">${concept.description}</p><div class="screen-space"><div class="screen"><canvas width="256" height="448" aria-hidden="true"></canvas><div class="controls"></div></div></div><p class="tradeoff">${concept.tradeoff}</p>`;
    document.querySelector('.alternatives')?.append(article);
    const screen = article.querySelector<HTMLDivElement>('.screen');
    const space = article.querySelector<HTMLDivElement>('.screen-space');
    const controls = article.querySelector<HTMLDivElement>('.controls');
    const context = article.querySelector('canvas')?.getContext('2d');
    if (!screen || !space || !controls || !context) {
        throw new Error(`Cannot mount alternative ${concept.id}`);
    }
    const state: State = {
        exercise: 0,
        exercises: makeExercises(),
        set: 2,
        view: 'set',
        message: '',
        focused: '',
        pressed: '',
        edit: null,
    };
    const demo: Demo = { concept, frame, context, controls, layer: controls, screen, state };
    const resize = new ResizeObserver(() => {
        const available = Math.min(article.clientWidth, 512);
        const scale = Math.max(1, Math.floor((available * devicePixelRatio) / width)) / devicePixelRatio;
        screen.style.transform = `scale(${scale})`;
        space.style.width = `${width * scale}px`;
        space.style.height = `${height * scale}px`;
    });
    resize.observe(article);
    screen.addEventListener('keydown', (event) => handleKeys(demo, event));
    screen.addEventListener('pointerdown', (event) => {
        if (!state.edit) {
            return;
        }
        const bounds = screen.getBoundingClientRect();
        const x = ((event.clientX - bounds.x) * width) / bounds.width;
        const y = ((event.clientY - bounds.y) * height) / bounds.height;
        const top = popoverTop(concept);
        if (x < 8 || x >= 248 || y < top || y >= 400) {
            event.preventDefault();
            closeEditor(demo);
        }
    });
    render(demo);
}

interface Exercise {
    id: string;
    name: string;
    weight: number;
    reps: number;
    plannedWeight: number;
    plannedReps: number;
    step: number;
}

interface State {
    exercise: number;
    exercises: Exercise[];
    set: number;
    view: 'set' | 'more' | 'exercises';
    message: string;
    focused: string;
    pressed: string;
    edit: { field: Field; slot: number } | null;
}

type Field = 'weight' | 'reps' | 'step';

interface Demo {
    concept: Concept;
    frame: HTMLImageElement;
    context: CanvasRenderingContext2D;
    controls: HTMLDivElement;
    layer: HTMLElement;
    screen: HTMLDivElement;
    state: State;
}

function makeExercises(): Exercise[] {
    const exercises = [
        { id: 'bench', name: 'Bench press', weight: 6000, reps: 8, plannedWeight: 6000, plannedReps: 8, step: 250 },
        {
            id: 'dumbbell',
            name: 'Dumbbell press',
            weight: 3000,
            reps: 10,
            plannedWeight: 3000,
            plannedReps: 10,
            step: 100,
        },
        { id: 'cable', name: 'Cable row', weight: 4500, reps: 12, plannedWeight: 4500, plannedReps: 12, step: 500 },
    ];
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        if (saved && typeof saved === 'object') {
            for (const exercise of exercises) {
                const step = (saved as Record<string, unknown>)[exercise.id];
                if (typeof step === 'number' && Number.isInteger(step) && step > 0 && step <= 99999) {
                    exercise.step = step;
                }
            }
        }
    } catch {
        /* A preview must remain usable when browser storage is unavailable */
    }
    return exercises;
}

function render(demo: Demo, rebuild = true): void {
    const { context: c, state, controls } = demo;
    const exercise = state.exercises[state.exercise];
    c.imageSmoothingEnabled = false;
    c.fillStyle = ink.black;
    c.fillRect(0, 0, width, height);
    if (rebuild) {
        controls.replaceChildren();
        demo.layer = controls;
        if (state.edit) {
            const dialog = document.createElement('div');
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', `Edit ${fieldName(state.edit.field)}`);
            controls.append(dialog);
            demo.layer = dialog;
        }
    }
    const interactive = rebuild && !state.edit;
    text(c, 'FitNES', 12, 12);
    text(c, 'Training', 244, 12, ink.muted, 'right');
    panel(demo, 0, 40, 256, 360);
    text(c, 'Push day', 16, 56, ink.muted);
    text(c, exercise.name, 16, 80);
    text(c, `Set ${state.set} of 4`, 16, 104);
    for (let i = 0; i < 4; i++) {
        c.fillStyle = i < state.set - 1 ? ink.light : ink.muted;
        c.fillRect(192 + i * 12, 109, 8, 4);
    }
    c.fillStyle = ink.muted;
    c.fillRect(16, 128, 224, 1);
    if (state.view === 'more') {
        text(c, 'This exercise', 16, 148, ink.muted);
        text(c, 'Weight increment', 16, 172);
        text(c, `${(exercise.step / 100).toFixed(2)} kg`, 240, 172, ink.light, 'right');
        action(demo, 'Edit increment', 'edit-step', 16, 200, 224, 44, () => openEditor(demo, 'step'), interactive);
        action(
            demo,
            'Change exercise',
            'exercises',
            16,
            252,
            224,
            44,
            () => {
                state.view = 'exercises';
                render(demo);
            },
            interactive
        );
        action(
            demo,
            'Back to set',
            'back',
            16,
            328,
            224,
            44,
            () => {
                state.view = 'set';
                render(demo);
            },
            interactive
        );
    } else if (state.view === 'exercises') {
        text(c, 'Choose exercise', 16, 152, ink.muted);
        state.exercises.forEach((item, index) => {
            action(
                demo,
                item.name,
                `exercise-${index}`,
                16,
                184 + index * 52,
                224,
                44,
                () => {
                    state.exercise = index;
                    state.set = 1;
                    state.view = 'set';
                    state.message = '';
                    render(demo);
                },
                interactive
            );
        });
        action(
            demo,
            'Back',
            'back',
            16,
            348,
            224,
            40,
            () => {
                state.view = 'more';
                render(demo);
            },
            interactive
        );
    } else {
        text(c, 'Target', 16, 144, ink.muted);
        text(
            c,
            `${(exercise.plannedWeight / 100).toFixed(2)} kg x ${exercise.plannedReps}`,
            240,
            144,
            ink.light,
            'right'
        );
        text(c, 'Last time', 16, 168, ink.muted);
        text(
            c,
            `${(exercise.plannedWeight / 100).toFixed(2)} kg x ${exercise.plannedReps}`,
            240,
            168,
            ink.light,
            'right'
        );
        text(c, 'This set', 16, 200);
        text(c, 'Weight (kg)', 16, 224, ink.muted);
        text(c, 'Reps', 136, 224, ink.muted);
        spinner(demo, 'weight', 16, 228, 56, interactive);
        spinner(demo, 'reps', 136, 228, 34, interactive);
        action(
            demo,
            'Log set',
            'log',
            16,
            312,
            224,
            40,
            () => {
                state.message = `Logged ${(exercise.weight / 100).toFixed(2)} kg x ${exercise.reps}`;
                state.set = Math.min(4, state.set + 1);
                exercise.reps = exercise.plannedReps;
                render(demo);
            },
            interactive
        );
        action(
            demo,
            'More',
            'more',
            16,
            352,
            224,
            40,
            () => {
                state.view = 'more';
                render(demo);
            },
            interactive
        );
    }
    text(c, state.message || `Weight step: ${(exercise.step / 100).toFixed(2)} kg`, 12, 408, ink.muted);
    if (state.edit) {
        drawEditor(demo, rebuild);
    }
}

function spinner(demo: Demo, field: 'weight' | 'reps', x: number, y: number, w: number, rebuild: boolean): void {
    const { context: c, state } = demo;
    const label = mask(state.exercises[state.exercise][field], field);
    const center = x + Math.floor(w / 2);
    const measured = label.length * 7;
    corners(c, center - measured / 2 - 4, y + 27, measured + 8, 18, state.focused === field ? 2 : 1);
    text(c, label, center, y + 26, ink.light, 'center');
    control(
        demo,
        field,
        `${fieldName(field)} ${label}${field === 'weight' ? ' kg' : ''}; open number picker`,
        x,
        y,
        w,
        68,
        () => openEditor(demo, field),
        rebuild,
        false,
        true
    );
    c.fillStyle = ink.muted;
    c.fillRect(x + w + 4, y + 18, 18, 1);
    c.fillRect(x + w + 4, y + 34, 18, 1);
    c.fillRect(x + w + 4, y + 50, 18, 1);
    c.fillRect(x + w + 21, y + 18, 1, 33);
    for (const direction of [1, -1] as const) {
        const key = `${field}-${direction}`;
        const amount = state.exercises[state.exercise][field];
        const limit = field === 'weight' ? 99999 : 99;
        const disabled = direction === 1 ? amount >= limit : amount <= 0;
        const top = direction === 1 ? y : y + 34;
        const visibleTop = direction === 1 ? y + 25 : y + 41;
        const active = state.pressed === key || state.focused === key;
        if (active && !disabled) {
            c.fillStyle = ink.light;
            c.fillRect(x + w + 5, direction === 1 ? y + 19 : y + 35, 16, 15);
        }
        triangle(c, x + w + 9, visibleTop, direction, disabled ? ink.muted : active ? ink.black : ink.light);
        const step = field === 'weight' ? state.exercises[state.exercise].step / 100 : 1;
        control(
            demo,
            key,
            `${direction === 1 ? 'Increase' : 'Decrease'} ${fieldName(field)} by ${step}${field === 'weight' ? ' kg' : ''}`,
            x + w,
            top,
            34,
            34,
            () => adjust(demo, field, direction),
            rebuild,
            disabled
        );
    }
}

function openEditor(demo: Demo, field: Field): void {
    const { state } = demo;
    state.edit = { field, slot: field === 'reps' ? 1 : 2 };
    state.focused = '';
    state.pressed = '';
    render(demo);
    demo.controls
        .querySelector<HTMLButtonElement>(`[data-key="slot-${state.edit.slot}"]`)
        ?.focus({ preventScroll: true });
}

function closeEditor(demo: Demo): void {
    const { state } = demo;
    const field = state.edit?.field;
    state.edit = null;
    state.focused = '';
    state.pressed = '';
    render(demo);
    demo.controls
        .querySelector<HTMLButtonElement>(`[data-key="${field === 'step' ? 'edit-step' : field}"]`)
        ?.focus({ preventScroll: true });
}

function drawEditor(demo: Demo, rebuild: boolean): void {
    const { context: c, state, concept } = demo;
    const edit = state.edit;
    if (!edit) {
        return;
    }
    const exercise = state.exercises[state.exercise];
    const top = popoverTop(concept);
    panel(demo, 8, top, 240, 400 - top);
    text(c, `${fieldName(edit.field)}${edit.field === 'reps' ? '' : ' · kg'}`, 24, top + 16);
    const slotTop = concept.id === 'j' ? 176 : concept.id === 'k' ? 152 : 232;
    const digits = rawDigits(exercise[edit.field], edit.field);
    const positions = slotPositions(edit.field);
    for (let i = 0; i < digits.length; i++) {
        const left = positions[i];
        const selected = i === edit.slot;
        if (selected) {
            c.fillStyle = ink.light;
            c.fillRect(left, slotTop, 34, 36);
            c.fillRect(left + 7, slotTop + 39, 20, 2);
        }
        text(c, digits[i], left + 17, slotTop + 2, selected ? ink.black : ink.light, 'center', 32);
        control(
            demo,
            `slot-${i}`,
            `Select ${placeName(edit.field, i)} digit: ${digits[i]}`,
            left,
            slotTop,
            34,
            40,
            () => {
                edit.slot = i;
                render(demo, false);
            },
            rebuild,
            false,
            false,
            selected
        );
        if (concept.id === 'l') {
            for (const direction of [1, -1] as const) {
                const y = direction === 1 ? 188 : 280;
                triangle(c, left + 14, y + 15, direction, ink.light);
                control(
                    demo,
                    `digit-${i}-${direction}`,
                    `${direction === 1 ? 'Increase' : 'Decrease'} ${placeName(edit.field, i)} digit`,
                    left,
                    y,
                    34,
                    34,
                    () => {
                        edit.slot = i;
                        changeDigit(demo, direction);
                    },
                    rebuild
                );
            }
        }
    }
    if (edit.field !== 'reps') {
        c.fillStyle = ink.light;
        c.fillRect(145, slotTop + 26, 3, 3);
    }
    if (concept.id === 'j') {
        for (let digit = 0; digit < 10; digit++) {
            digitKey(demo, digit, 16 + (digit % 5) * 44, 232 + Math.floor(digit / 5) * 44, 40, 36, rebuild);
        }
        action(demo, 'Back', 'erase', 16, 344, 104, 40, () => erase(demo), rebuild);
        action(demo, 'Done', 'done', 136, 344, 104, 40, () => closeEditor(demo), rebuild);
    } else if (concept.id === 'k') {
        for (let digit = 1; digit <= 9; digit++) {
            digitKey(demo, digit, 24 + ((digit - 1) % 3) * 72, 208 + Math.floor((digit - 1) / 3) * 40, 64, 36, rebuild);
        }
        digitKey(demo, 0, 96, 328, 64, 36, rebuild);
        action(demo, 'Back', 'erase', 24, 328, 64, 36, () => erase(demo), rebuild);
        action(demo, 'Done', 'done', 168, 328, 64, 36, () => closeEditor(demo), rebuild);
        text(c, 'Select a slot, then a digit.', 24, 376, ink.muted);
    } else {
        action(demo, 'Back', 'erase', 16, 344, 104, 40, () => erase(demo), rebuild);
        action(demo, 'Done', 'done', 136, 344, 104, 40, () => closeEditor(demo), rebuild);
    }
    if (rebuild) {
        const live = document.createElement('output');
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        demo.layer.append(live);
    }
    const live = demo.layer.querySelector('output');
    if (live) {
        live.textContent = `${fieldName(edit.field)} ${mask(exercise[edit.field], edit.field)}`;
    }
}

function digitKey(demo: Demo, digit: number, x: number, y: number, w: number, h: number, rebuild: boolean): void {
    const { context: c, state } = demo;
    const key = `key-${digit}`;
    const active = state.pressed === key || state.focused === key;
    if (active) {
        c.fillStyle = ink.light;
        c.fillRect(x, y, w, h);
    }
    text(c, String(digit), x + w / 2, y + (h - 16) / 2, active ? ink.black : ink.light, 'center');
    control(demo, key, `Digit ${digit}`, x, y, w, h, () => chooseDigit(demo, digit), rebuild);
}

function chooseDigit(demo: Demo, digit: number): void {
    const { state } = demo;
    const edit = state.edit;
    if (!edit) {
        return;
    }
    const digits = rawDigits(state.exercises[state.exercise][edit.field], edit.field).split('');
    digits[edit.slot] = String(digit);
    setValue(demo, edit.field, Number(digits.join('')));
    edit.slot = Math.min(digits.length - 1, edit.slot + 1);
    render(demo, false);
    demo.layer.querySelector<HTMLButtonElement>(`[data-key="slot-${edit.slot}"]`)?.focus({ preventScroll: true });
}

function changeDigit(demo: Demo, direction: 1 | -1): void {
    const { state } = demo;
    const edit = state.edit;
    if (!edit) {
        return;
    }
    const digits = rawDigits(state.exercises[state.exercise][edit.field], edit.field).split('');
    digits[edit.slot] = String((Number(digits[edit.slot]) + direction + 10) % 10);
    setValue(demo, edit.field, Number(digits.join('')));
    render(demo, false);
}

function erase(demo: Demo): void {
    const { state } = demo;
    const edit = state.edit;
    if (!edit) {
        return;
    }
    edit.slot = Math.max(0, edit.slot - 1);
    const digits = rawDigits(state.exercises[state.exercise][edit.field], edit.field).split('');
    digits[edit.slot] = '0';
    setValue(demo, edit.field, Number(digits.join('')));
    render(demo, false);
}

function adjust(demo: Demo, field: 'weight' | 'reps', direction: 1 | -1): void {
    const exercise = demo.state.exercises[demo.state.exercise];
    setValue(demo, field, exercise[field] + direction * (field === 'weight' ? exercise.step : 1));
    render(demo, false);
}

function setValue(demo: Demo, field: Field, value: number): void {
    const { state } = demo;
    const exercise = state.exercises[state.exercise];
    exercise[field] = Math.min(field === 'reps' ? 99 : 99999, Math.max(field === 'step' ? 1 : 0, value));
    if (field !== 'step') {
        return;
    }
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        const steps = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
        localStorage.setItem(storageKey, JSON.stringify({ ...steps, [exercise.id]: exercise.step }));
    } catch {
        /* Adjustments still work in memory if local storage is blocked */
    }
}

function handleKeys(demo: Demo, event: KeyboardEvent): void {
    const { state } = demo;
    if (!state.edit) {
        const field = (event.target as HTMLElement).dataset.key;
        if ((field === 'weight' || field === 'reps') && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            adjust(demo, field, event.key === 'ArrowUp' ? 1 : -1);
        }
        return;
    }
    if (/^\d$/.test(event.key)) {
        event.preventDefault();
        chooseDigit(demo, Number(event.key));
    } else if (event.key === 'Escape') {
        event.preventDefault();
        closeEditor(demo);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        erase(demo);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const count = state.edit.field === 'reps' ? 2 : 5;
        state.edit.slot = (state.edit.slot + (event.key === 'ArrowRight' ? 1 : count - 1)) % count;
        render(demo, false);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        changeDigit(demo, event.key === 'ArrowUp' ? 1 : -1);
    } else if (event.key === 'Tab') {
        const buttons = [...demo.layer.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = (index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length;
        event.preventDefault();
        buttons[next]?.focus();
    }
}

function control(
    demo: Demo,
    key: string,
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    invoke: () => void,
    rebuild: boolean,
    disabled = false,
    opens = false,
    selected?: boolean
): void {
    if (!rebuild) {
        const existing = demo.layer.querySelector<HTMLButtonElement>(`[data-key="${key}"]`);
        if (existing) {
            existing.disabled = disabled;
            existing.setAttribute('aria-label', label);
            if (selected !== undefined) {
                existing.setAttribute('aria-pressed', String(selected));
            }
        }
        return;
    }
    const { state } = demo;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.key = key;
    button.setAttribute('aria-label', label);
    if (opens) {
        button.setAttribute('aria-haspopup', 'dialog');
    }
    if (selected !== undefined) {
        button.setAttribute('aria-pressed', String(selected));
    }
    button.disabled = disabled;
    Object.assign(button.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    button.addEventListener('click', invoke);
    button.addEventListener('pointerdown', (event) => {
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
        if (state.edit && /^slot-\d$/.test(key)) {
            state.edit.slot = Number(key.slice(5));
        }
        render(demo, false);
    });
    button.addEventListener('blur', () => {
        state.focused = '';
        render(demo, false);
    });
    demo.layer.append(button);
}

function action(
    demo: Demo,
    label: string,
    key: string,
    x: number,
    y: number,
    w: number,
    h: number,
    invoke: () => void,
    rebuild: boolean
): void {
    const { context: c, state } = demo;
    const active = state.pressed === key || state.focused === key;
    if (active) {
        c.fillStyle = ink.light;
        c.fillRect(x, y + 2, w, h - 4);
    }
    const color = active ? ink.black : ink.light;
    text(c, label.toUpperCase(), x + 16, y + Math.floor((h - 16) / 2), color);
    c.fillStyle = color;
    for (let row = 0; row < pointer.length; row++) {
        for (let column = 0; column < pointer[row].length; column++) {
            if (pointer[row][column] === '1') {
                c.fillRect(x + 8 + column, y + Math.floor((h - 9) / 2) + row, 1, 1);
            }
        }
    }
    control(demo, key, label.toUpperCase(), x, y, w, h, invoke, rebuild);
}

function text(
    c: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    color = ink.light,
    align: CanvasTextAlign = 'left',
    size = 16
): void {
    c.font = `${size}px "FitNES study"`;
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

function corners(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, thickness: number): void {
    c.fillStyle = ink.light;
    for (const xx of [x, x + w - 4]) {
        for (const yy of [y, y + h - thickness]) {
            c.fillRect(xx, yy, 4, thickness);
            c.fillRect(xx === x ? xx : xx + 4 - thickness, yy === y ? yy : yy - 3, thickness, 4);
        }
    }
}

function triangle(c: CanvasRenderingContext2D, x: number, y: number, direction: 1 | -1, color: string): void {
    c.fillStyle = color;
    for (let row = 0; row < 4; row++) {
        const span = direction === 1 ? row : 3 - row;
        c.fillRect(x + 3 - span, y + row, span * 2 + 1, 1);
    }
}

function rawDigits(value: number, field: Field): string {
    return String(value).padStart(field === 'reps' ? 2 : 5, '0');
}
function mask(value: number, field: Field): string {
    const digits = rawDigits(value, field);
    return field === 'reps' ? digits : `${digits.slice(0, 3)}.${digits.slice(3)}`;
}
function slotPositions(field: Field): number[] {
    return field === 'reps' ? [80, 142] : [20, 62, 104, 154, 196];
}
function fieldName(field: Field): string {
    return field === 'weight' ? 'Weight' : field === 'reps' ? 'Reps' : 'Weight increment';
}
function placeName(field: Field, slot: number): string {
    return (field === 'reps' ? ['tens', 'ones'] : ['hundreds', 'tens', 'ones', 'tenths', 'hundredths'])[slot];
}
function popoverTop(concept: Concept): number {
    return concept.id === 'j' ? 128 : concept.id === 'k' ? 104 : 144;
}
