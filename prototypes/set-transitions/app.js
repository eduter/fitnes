(function () {
    const STEP_MS = 320;

    const SETS = [
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
        { exercise: 'Bench press', weight: 60, reps: 8 },
    ];

    const CONCEPTS = [
        { id: 'a', name: 'Stations', line: 'Walk between gym markers' },
        { id: 'b', name: 'Path', line: 'A narrow trail, south' },
        { id: 'c', name: 'Cue', line: 'The hero marks the change' },
        { id: 'd', name: 'Shaft', line: 'Down the training shaft' },
    ];

    // One completed set, so every concept opens on done / now / next.
    const state = { a: 1, b: 1, c: 1, d: 1 };
    let concept = 'a';
    let stepToken = 0;

    const view = document.getElementById('view');
    const live = document.getElementById('live');

    function reduced() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function esc(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
    }

    function model(cursor) {
        const total = SETS.length;
        const finished = cursor >= total;
        const done = Math.min(cursor, total);
        const current = finished ? null : SETS[cursor];
        const next = !finished && cursor + 1 < total ? SETS[cursor + 1] : null;
        const previous = done > 0 ? SETS[done - 1] : null;

        return { cursor, total, finished, done, current, next, previous };
    }

    function focusIndex(m) {
        return m.finished ? m.total - 1 : m.cursor;
    }

    function percent(done, total) {
        if (total === 0) {
            return 0;
        }

        return (done / total) * 100;
    }

    function loggedLabel(done) {
        if (done <= 0) {
            return 'No sets logged';
        }

        if (done === 1) {
            return '1 set logged';
        }

        return `${done} sets logged`;
    }

    function hero(className) {
        return `<img class="hero ${className}" src="assets/hero-fighter.png" alt="" width="92" height="132" />`;
    }

    function meter(m, fromPct) {
        const width = percent(m.done, m.total);
        const from = fromPct == null ? width : fromPct;

        return `
            <div class="meter">
                <div class="meter__track">
                    <div class="meter__bar" style="width: ${width}%" data-from="${from}%"></div>
                </div>
                <p class="meter__count"><b>${m.done}/${m.total}</b> <span class="label">sets</span></p>
            </div>
        `;
    }

    function doneBlock(m) {
        const ack = m.done > 0 ? `Set ${m.done} logged` : loggedLabel(0);

        return `
            <div class="done-block">
                <p class="done-line">
                    <span class="done-line__rest">${loggedLabel(m.done)}</span>
                    <span class="done-line__ack">${ack}</span>
                </p>
                ${
                    m.previous
                        ? `<p class="depart" aria-hidden="true">Set ${m.done} · ${m.previous.weight} kg × ${m.previous.reps}</p>`
                        : ''
                }
            </div>
        `;
    }

    function nowPanel(m) {
        if (m.finished) {
            return `
                <article class="now">
                    <p class="kicker">Push day</p>
                    <h1 class="exercise">Session complete</h1>
                    <p class="load"><span class="load__kg"><b>${m.total}</b> <small>sets</small></span></p>
                    <button class="action" type="button" data-action="advance">Train again</button>
                </article>
            `;
        }

        const setNo = m.cursor + 1;

        return `
            <article class="now">
                <p class="kicker">Set ${setNo} of ${m.total}</p>
                <h1 class="exercise">${esc(m.current.exercise)}</h1>
                <p class="load">
                    <span class="load__kg"><b>${m.current.weight}</b> <small>kg</small></span>
                    <span class="load__times">×</span>
                    <span class="load__reps"><b>${m.current.reps}</b> <small>reps</small></span>
                </p>
                <button class="action" type="button" data-action="advance">Complete set</button>
            </article>
        `;
    }

    function nextLine(m) {
        if (m.finished) {
            return '<p class="next-line">All 8 sets logged</p>';
        }

        if (!m.next) {
            return '<p class="next-line">Last set</p>';
        }

        return `<p class="next-line">Next · Set ${m.cursor + 2} · ${m.next.weight} kg × ${m.next.reps}</p>`;
    }

    function trailLabel(m, offset) {
        if (offset < 0) {
            if (m.done <= 0) {
                return 'Start';
            }

            if (m.done === 1) {
                return '1 logged';
            }

            return `${m.done} logged`;
        }

        const index = focusIndex(m) + offset;

        if (index >= m.total) {
            return 'End';
        }

        if (m.finished && offset === 0) {
            return 'Clear';
        }

        return `Set ${index + 1}`;
    }

    function renderA(m, fromPct) {
        return `
            <section class="screen screen-a">
                ${meter(m, fromPct)}
                <div class="gym" aria-hidden="true">
                    <div class="gym__row">
                        <div class="gym__spot"><span class="marker marker--done"></span></div>
                        <p class="gym__tag">${trailLabel(m, -1)}</p>
                    </div>
                    <div class="gym__row gym__row--here">
                        <div class="gym__spot">
                            <span class="marker marker--now"></span>
                            ${hero('hero--a')}
                        </div>
                        <p class="gym__tag">${trailLabel(m, 0)}</p>
                    </div>
                    <div class="gym__row">
                        <div class="gym__spot"><span class="marker marker--ahead"></span></div>
                        <p class="gym__tag">${trailLabel(m, 1)}</p>
                    </div>
                </div>
                ${doneBlock(m)}
                ${nowPanel(m)}
                ${nextLine(m)}
            </section>
        `;
    }

    function stones(m) {
        const focus = focusIndex(m);
        const offsets = [-1, 0, 1, 2];

        return offsets
            .map((offset) => {
                const index = focus + offset;
                let kind = 'empty';

                if (index >= 0 && index < m.total) {
                    if (offset < 0 || m.finished) {
                        kind = 'done';
                    } else if (offset === 0) {
                        kind = 'now';
                    } else {
                        kind = 'ahead';
                    }
                }

                if (m.finished && offset === 0) {
                    kind = 'now';
                }

                return `<div class="stone stone--${kind}"></div>`;
            })
            .join('');
    }

    function renderB(m, fromPct) {
        return `
            <section class="screen screen-b">
                ${meter(m, fromPct)}
                <div class="b-body">
                    <div class="path" aria-hidden="true">
                        ${stones(m)}
                        ${hero('hero--b')}
                    </div>
                    <div class="b-copy">
                        ${doneBlock(m)}
                        ${nowPanel(m)}
                        ${nextLine(m)}
                    </div>
                </div>
            </section>
        `;
    }

    function renderC(m, fromPct) {
        return `
            <section class="screen screen-c">
                ${meter(m, fromPct)}
                ${doneBlock(m)}
                <div class="well" aria-hidden="true">
                    <div class="well__floor"></div>
                    ${hero('hero--c')}
                </div>
                ${nowPanel(m)}
                ${nextLine(m)}
            </section>
        `;
    }

    function renderD(m, fromPct) {
        return `
            <section class="screen screen-d">
                ${meter(m, fromPct)}
                <div class="shaft">
                    <div class="gates" aria-hidden="true">
                        <div class="gate gate--done">
                            <span class="lamp"></span>
                            <span class="gate__label">${trailLabel(m, -1)}</span>
                        </div>
                        <div class="gate gate--now">
                            <span class="lamp"></span>
                            ${hero('hero--d')}
                            <span class="gate__label">${trailLabel(m, 0)}</span>
                        </div>
                        <div class="gate gate--ahead">
                            <span class="lamp"></span>
                            <span class="gate__label">${trailLabel(m, 1)}</span>
                        </div>
                    </div>
                    <div class="bay">
                        ${doneBlock(m)}
                        ${nowPanel(m)}
                        ${nextLine(m)}
                    </div>
                </div>
            </section>
        `;
    }

    const RENDER = { a: renderA, b: renderB, c: renderC, d: renderD };

    function kickMeter(screen) {
        const bar = screen.querySelector('.meter__bar');

        if (!bar || reduced()) {
            return;
        }

        const target = bar.style.width;
        const from = bar.dataset.from;

        if (!from || from === target) {
            return;
        }

        bar.style.transition = 'none';
        bar.style.width = from;
        void bar.offsetWidth;
        bar.style.transition = '';
        bar.style.width = target;
    }

    function announce(m, stepping) {
        if (m.finished) {
            live.textContent = 'Session complete. 8 of 8 sets logged.';
            return;
        }

        const setNo = m.cursor + 1;
        const detail = `Set ${setNo} of ${m.total}. ${m.current.exercise}, ${m.current.weight} kilograms, ${m.current.reps} reps.`;

        live.textContent = stepping ? `Set ${m.done} logged. ${detail}` : detail;
    }

    function render(options) {
        const opts = options || {};
        const m = model(state[concept]);
        const fromPct = opts.step ? percent(opts.from, m.total) : percent(m.done, m.total);
        const screenHtml = RENDER[concept](m, fromPct);

        view.innerHTML = screenHtml;
        const screen = view.querySelector('.screen');

        if (opts.step && screen && !reduced()) {
            screen.classList.add('is-stepping');
            kickMeter(screen);
            const token = ++stepToken;
            window.setTimeout(() => {
                if (token !== stepToken) {
                    return;
                }

                screen.classList.remove('is-stepping');
            }, STEP_MS);
        }

        announce(m, Boolean(opts.step));
        syncSwitch();

        if (opts.focusAction) {
            screen.querySelector('[data-action="advance"]')?.focus({ preventScroll: true });
        }
    }

    function syncSwitch() {
        const current = CONCEPTS.find((item) => item.id === concept);
        document.getElementById('concept-line').textContent = `${current.name} — ${current.line}`;
        document.title = `FitNES — ${current.name}`;

        for (const button of document.querySelectorAll('#switch button')) {
            button.setAttribute('aria-pressed', button.dataset.concept === concept ? 'true' : 'false');
        }
    }

    function renderSwitch() {
        document.getElementById('switch').innerHTML = CONCEPTS.map(
            (item) => `
                <button type="button" data-concept="${item.id}" aria-pressed="false">
                    <span class="switch__key">${item.id.toUpperCase()}</span>
                    <span class="switch__name">${item.name}</span>
                </button>
            `
        ).join('');
    }

    function readHash() {
        const id = location.hash.replace('#', '');

        if (CONCEPTS.some((item) => item.id === id)) {
            return id;
        }

        return 'a';
    }

    function onAdvance() {
        const current = state[concept];

        if (current >= SETS.length) {
            state[concept] = 1;
            render({ step: false, focusAction: true });
            return;
        }

        state[concept] = current + 1;
        render({ step: true, from: current, focusAction: true });
    }

    document.getElementById('switch').addEventListener('click', (event) => {
        const button = event.target.closest('[data-concept]');

        if (!button) {
            return;
        }

        const id = button.dataset.concept;

        if (!id || id === concept) {
            return;
        }

        location.hash = id;
    });

    view.addEventListener('click', (event) => {
        if (!event.target.closest('[data-action="advance"]')) {
            return;
        }

        onAdvance();
    });

    window.addEventListener('hashchange', () => {
        concept = readHash();
        render({ step: false });
    });

    renderSwitch();
    concept = readHash();

    if (location.hash.replace('#', '') !== concept) {
        history.replaceState(null, '', `#${concept}`);
    }

    render({ step: false });
})();
