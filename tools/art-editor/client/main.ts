import {
    copyRegion,
    EditHistory,
    floodFill,
    type PixelPatch,
    paintLine,
    pasteRegion,
    type Region,
    replaceRegion,
} from '../model.ts';
import type { EditorConfig, VerificationResult } from '../protocol.ts';
import './style.css';

async function main(): Promise<void> {
    const chosen = new URL(location.href).searchParams.get('asset') ?? 'home';
    const api = (path: string) => `${path}?asset=${encodeURIComponent(chosen)}`;
    const response = await fetch(api('/api/config'));
    if (!response.ok) {
        throw new Error('Could not open the local editor');
    }
    const config: EditorConfig = await response.json();
    const storageKey = `fitnes.art-editor.${config.baselineHash}`;
    let starting = decode(config.pixels);
    let recovered = false;
    let lastVerified = config.lastVerified ? decode(config.lastVerified) : null;
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (saved && saved.updatedAt > config.updatedAt) {
            starting = decode(saved.pixels);
            lastVerified = saved.lastVerified ? decode(saved.lastVerified) : lastVerified;
            recovered = true;
        }
    } catch {
        notify('A browser backup could not be read. The server draft and original artwork are still available.');
    }
    const history = new EditHistory(starting);
    let revision = config.revision + (recovered ? 1 : 0);
    let tool: 'pencil' | 'fill' | 'select' | 'pick' = 'fill';
    let previousTool: 'pencil' | 'fill' | 'select' = 'fill';
    let stroke: { pixels: Uint8Array; last: { x: number; y: number }; color: number } | null = null;
    let from =
        config.assetId === 'home'
            ? 56
            : (config.colors.find((color) => color.group === 'current' && color.code !== 15)?.code ?? 15);
    let to = 32;
    let active: 'from' | 'to' = 'to';
    let selection: Region | null = null;
    let anchor: { x: number; y: number } | null = null;
    let clipboard: PixelPatch | null = null;
    let floating: { patch: PixelPatch; left: number; top: number } | null = null;
    let pasteDrag: { x: number; y: number } | null = null;
    let zoom = 3;
    const zoomMax = Math.min(64, Math.floor(4096 / config.width), Math.floor(3200 / config.height));
    let regions: Region[] = [];
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let savedRevision = -1;
    const art = element<HTMLCanvasElement>('art');
    const overview = element<HTMLCanvasElement>('overview');
    const overlay = element<HTMLCanvasElement>('overlay');
    const viewport = element('viewport');
    const context = art.getContext('2d');
    const mini = overview.getContext('2d');
    const marks = overlay.getContext('2d');
    if (!context || !mini || !marks) {
        throw new Error('This browser does not support canvas editing');
    }
    if (config.recoveryMessage) {
        notify(config.recoveryMessage);
    }
    if (!config.emulatorReady) {
        notify(
            'Emulator setup is needed for green checks. In Ubuntu, run npm run nes:emulator:setup, then restart this editor.'
        );
    }

    element('pencil').onclick = () => {
        tool = 'pencil';
        selection = null;
        active = 'to';
        renderControls();
        renderOverlay();
    };
    element('fill').onclick = () => {
        tool = 'fill';
        selection = null;
        active = 'to';
        renderControls();
        renderOverlay();
    };
    element('select').onclick = () => {
        tool = 'select';
        renderControls();
    };
    element('pick').onclick = () => {
        if (tool !== 'pick') {
            previousTool = tool;
        }
        tool = 'pick';
        renderControls();
    };
    element('from').onclick = () => {
        active = 'from';
        renderControls();
        renderPalette();
    };
    element('to').onclick = () => {
        active = 'to';
        renderControls();
        renderPalette();
    };
    element('clear').onclick = () => {
        selection = null;
        renderControls();
        renderOverlay();
    };
    element('copy').onclick = copySelection;
    element('paste').onclick = beginPaste;
    element('place-paste').onclick = placePaste;
    element('cancel-paste').onclick = cancelPaste;
    element('replace').onclick = () => {
        if (selection) {
            commit(replaceRegion(history.pixels, config.width, selection, from, to), 'Replace in selection');
        }
    };
    element('undo').onclick = undo;
    element('redo').onclick = redo;
    element('restore').onclick = () => {
        if (lastVerified) {
            commit(lastVerified, 'Return to last verified');
        }
    };
    element('zoom-in').onclick = () => setZoom(zoom + 1);
    element('zoom-out').onclick = () => setZoom(zoom - 1);
    element('project').onclick = () => downloadProject();
    const fileMenu = element<HTMLDetailsElement>('file-menu');
    fileMenu.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('button')) {
            fileMenu.open = false;
        }
    });
    document.addEventListener('pointerdown', (event) => {
        if (event.target instanceof Node && !fileMenu.contains(event.target)) {
            fileMenu.open = false;
        }
    });
    element('save').onclick = () => {
        void saveToRepository();
    };
    element('close-saved').onclick = () => element<HTMLDialogElement>('saved-dialog').close();
    element('copy-commands').onclick = () => {
        void navigator.clipboard
            .writeText(element('commit-commands').textContent ?? '')
            .then(() => {
                element('copy-commands').textContent = 'Copied';
            })
            .catch(() => notify('Select and copy the commands in the save dialog.'));
    };
    element('export').onclick = () => {
        window.location.assign(`${api('/api/export')}&revision=${revision}`);
    };
    element('open').onclick = () => element<HTMLInputElement>('file').click();
    element<HTMLInputElement>('file').onchange = async (event) => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        try {
            if (file.size > 100000) {
                throw new Error('This file is too large for an editor project');
            }
            const project = JSON.parse(await file.text());
            if (
                project.format !== 'fitnes-art-editor-v1' ||
                project.width !== config.width ||
                project.height !== config.height ||
                project.emphasis !== config.emphasis
            ) {
                throw new Error(`Choose a project for this ${config.width}×${config.height} asset`);
            }
            commit(decode(project.pixels), 'Open project');
            if (project.baselineHash !== config.baselineHash) {
                notify(
                    'This project uses a different source version. Its exact pixels will be rechecked against the current NES layout.'
                );
            }
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error));
        }
        input.value = '';
    };
    art.onpointerdown = (event) => {
        if (event.button !== 0) {
            return;
        }
        const point = position(event);
        if (floating) {
            const inside =
                point.x >= floating.left &&
                point.x < floating.left + floating.patch.width &&
                point.y >= floating.top &&
                point.y < floating.top + floating.patch.height;
            pasteDrag = { x: inside ? point.x - floating.left : 0, y: inside ? point.y - floating.top : 0 };
            art.setPointerCapture(event.pointerId);
            movePaste(point.x - pasteDrag.x, point.y - pasteDrag.y);
            return;
        }
        const source = history.pixels[point.y * config.width + point.x];
        if (tool === 'pick' || event.altKey) {
            const pickingFrom = selection !== null || (tool === 'pick' ? previousTool === 'select' : tool === 'select');
            if (pickingFrom) {
                from = source;
            } else {
                to = source;
            }
            active = 'to';
            if (tool === 'pick') {
                tool = previousTool;
            }
            renderControls();
            renderPalette();
            return;
        }
        if (tool === 'fill') {
            from = source;
            commit(floodFill(history.pixels, config.width, point.x, point.y, to), 'Bucket fill');
            renderControls();
            return;
        }
        if (tool === 'pencil') {
            art.setPointerCapture(event.pointerId);
            revision++;
            clearTimeout(timer);
            controller?.abort();
            element<HTMLButtonElement>('save').disabled = true;
            element<HTMLButtonElement>('export').disabled = true;
            setStatus('checking', 'Drawing…', 'Release the pencil to check this stroke.');
            stroke = {
                pixels: paintLine(history.pixels, config.width, point.x, point.y, point.x, point.y, to),
                last: point,
                color: to,
            };
            render(stroke.pixels);
            return;
        }
        art.setPointerCapture(event.pointerId);
        anchor = point;
        selection = { left: point.x, top: point.y, width: 1, height: 1 };
        renderControls();
        renderOverlay();
    };
    art.onpointermove = (event) => {
        if (floating && pasteDrag) {
            const point = position(event);
            movePaste(point.x - pasteDrag.x, point.y - pasteDrag.y);
            return;
        }
        if (stroke) {
            const point = position(event);
            stroke.pixels = paintLine(
                stroke.pixels,
                config.width,
                stroke.last.x,
                stroke.last.y,
                point.x,
                point.y,
                stroke.color
            );
            stroke.last = point;
            render(stroke.pixels);
            return;
        }
        if (!anchor) {
            return;
        }
        const point = position(event);
        selection = {
            left: Math.min(anchor.x, point.x),
            top: Math.min(anchor.y, point.y),
            width: Math.abs(anchor.x - point.x) + 1,
            height: Math.abs(anchor.y - point.y) + 1,
        };
        renderControls();
        renderOverlay();
    };
    art.onpointerup = () => {
        if (pasteDrag) {
            pasteDrag = null;
            placePaste();
            return;
        }
        anchor = null;
        finishStroke();
    };
    art.onpointercancel = () => {
        if (pasteDrag) {
            pasteDrag = null;
            cancelPaste();
            return;
        }
        anchor = null;
        finishStroke();
    };
    art.onlostpointercapture = () => {
        if (pasteDrag) {
            pasteDrag = null;
            cancelPaste();
            return;
        }
        anchor = null;
        finishStroke();
    };
    art.addEventListener(
        'wheel',
        (event) => {
            if (event.shiftKey) {
                return;
            }
            event.preventDefault();
            const bounds = art.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / zoom;
            const y = (event.clientY - bounds.top) / zoom;
            setZoom(zoom + (event.deltaY < 0 ? 1 : -1), x, y);
        },
        { passive: false }
    );
    window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (!element<HTMLButtonElement>('save').disabled) {
                void saveToRepository();
            } else {
                element('save-state').textContent = floating
                    ? 'Place or cancel the paste before saving'
                    : 'Draft saved; waiting for verification';
            }
            return;
        }
        if (element<HTMLDialogElement>('saved-dialog').open) {
            return;
        }
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
        }
        const modifier = event.ctrlKey || event.metaKey;
        if (
            modifier &&
            event.key.toLowerCase() === 'c' &&
            (selection || floating) &&
            !stroke &&
            window.getSelection()?.isCollapsed !== false
        ) {
            event.preventDefault();
            copySelection();
            return;
        }
        if (modifier && event.key.toLowerCase() === 'v' && clipboard && !stroke) {
            event.preventDefault();
            beginPaste();
            return;
        }
        if (floating && !modifier) {
            const steps: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
            };
            const step = steps[event.key];
            if (step) {
                event.preventDefault();
                const distance = event.shiftKey ? 8 : 1;
                movePaste(floating.left + step[0] * distance, floating.top + step[1] * distance);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                placePaste();
                return;
            }
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
                redo();
            } else {
                undo();
            }
        } else if (event.ctrlKey && event.key.toLowerCase() === 'y') {
            event.preventDefault();
            redo();
        } else if (event.key === 'Escape') {
            if (floating) {
                event.preventDefault();
                cancelPaste();
                return;
            }
            fileMenu.open = false;
            selection = null;
            renderControls();
            renderOverlay();
        }
    });
    const picker = element<HTMLSelectElement>('artwork');
    for (const asset of config.assets) {
        const option = document.createElement('option');
        option.value = asset.id;
        option.textContent = asset.label;
        picker.append(option);
    }
    picker.value = config.assetId;
    picker.onchange = () => {
        saveBackup();
        location.assign(`/?asset=${encodeURIComponent(picker.value)}`);
    };
    for (const canvas of [art, overview]) {
        canvas.width = config.width;
        canvas.height = config.height;
    }
    document.documentElement.style.setProperty('--art-width', String(config.width));
    document.documentElement.style.setProperty('--art-height', String(config.height));
    const previewScale = Math.max(1, Math.floor(Math.min(256 / config.width, 200 / config.height)));
    for (const preview of document.querySelectorAll<HTMLElement>('aside img, aside canvas')) {
        preview.style.width = `${config.width * previewScale}px`;
        preview.style.height = `${config.height * previewScale}px`;
        preview.style.margin = 'auto';
    }
    element<HTMLImageElement>('concept-preview').style.imageRendering =
        config.assetId === 'home' || config.assetId === 'logo' ? 'auto' : 'pixelated';
    element<HTMLImageElement>('concept-preview').src = api('/assets/concept.png');
    element<HTMLImageElement>('current-preview').src = api('/assets/current.png');
    element('saved-directory').textContent = config.saveDirectory;
    element('save').title = `Save verified artwork to ${config.saveDirectory} for committing`;
    if (config.assetId !== 'home') {
        element('reference-caption').textContent = 'Reference image';
        element('current-caption').textContent = 'Repository image';
    }
    render();
    setZoom(
        Math.max(config.width, config.height) <= 64
            ? Math.floor(
                  Math.min((viewport.clientWidth - 24) / config.width, (viewport.clientHeight - 24) / config.height)
              )
            : 3
    );
    schedule();

    function decode(value: unknown): Uint8Array {
        return parsePixels(value, config.width * config.height);
    }
    function commit(pixels: Uint8Array, label: string): void {
        if (!history.commit(pixels, label)) {
            return;
        }
        changed();
    }
    function finishStroke(): void {
        if (!stroke) {
            return;
        }
        const painted = stroke.pixels;
        stroke = null;
        if (history.commit(painted, 'Pencil stroke')) {
            changed();
        } else {
            render();
            schedule();
        }
    }
    function undo(): void {
        if (floating) {
            cancelPaste();
            return;
        }
        if (stroke) {
            stroke = null;
            render();
            schedule();
            return;
        }
        if (!history.canUndo) {
            return;
        }
        history.undo();
        changed();
    }
    function redo(): void {
        if (stroke || floating) {
            return;
        }
        if (!history.canRedo) {
            return;
        }
        history.redo();
        changed();
    }
    function changed(): void {
        revision++;
        regions = [];
        saveBackup();
        render();
        schedule();
    }
    function copySelection(): void {
        if (stroke) {
            return;
        }
        if (floating) {
            clipboard = { ...floating.patch, pixels: floating.patch.pixels.slice() };
        } else if (selection) {
            clipboard = copyRegion(history.pixels, config.width, selection);
        }
        renderControls();
    }
    function beginPaste(): void {
        if (!clipboard || stroke) {
            return;
        }
        if (floating) {
            placePaste();
        }
        const left = Math.min(config.width - clipboard.width, (selection?.left ?? 0) + (selection?.width ?? 0));
        const top = Math.min(config.height - clipboard.height, selection?.top ?? 0);
        floating = { patch: { ...clipboard, pixels: clipboard.pixels.slice() }, left, top };
        regions = [];
        tool = 'select';
        revision++;
        clearTimeout(timer);
        controller?.abort();
        element<HTMLButtonElement>('save').disabled = true;
        element('save').textContent = 'Save artwork';
        element('save-state').textContent = 'Paste preview — release to place';
        element<HTMLButtonElement>('export').disabled = true;
        setStatus(
            'checking',
            'Positioning paste',
            'Drag and release to place; arrows nudge, Enter places, Esc cancels.'
        );
        render();
    }
    function movePaste(left: number, top: number): void {
        if (!floating) {
            return;
        }
        floating.left = Math.max(0, Math.min(config.width - floating.patch.width, left));
        floating.top = Math.max(0, Math.min(config.height - floating.patch.height, top));
        render();
    }
    function placePaste(): void {
        if (!floating) {
            return;
        }
        const placed = floating;
        floating = null;
        pasteDrag = null;
        selection = { left: placed.left, top: placed.top, width: placed.patch.width, height: placed.patch.height };
        const pixels = pasteRegion(history.pixels, config.width, placed.patch, placed.left, placed.top);
        if (history.commit(pixels, 'Paste selection')) {
            changed();
        } else {
            render();
            schedule();
        }
    }
    function cancelPaste(): void {
        if (!floating) {
            return;
        }
        floating = null;
        pasteDrag = null;
        render();
        schedule();
    }
    function saveBackup(): void {
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    pixels: encode(history.pixels),
                    lastVerified: lastVerified ? encode(lastVerified) : null,
                    updatedAt: Date.now(),
                })
            );
            element('save-state').textContent = 'Draft auto-saved locally';
        } catch {
            element('save-state').textContent =
                'Browser backup is unavailable. Download your project before closing; the server also keeps a draft.';
        }
    }
    function schedule(): void {
        clearTimeout(timer);
        controller?.abort();
        element<HTMLButtonElement>('export').disabled = true;
        element<HTMLButtonElement>('save').disabled = true;
        element('save').textContent = 'Save artwork';
        setStatus('checking', 'Checking…', 'Checking the current pixels and then the real NES emulator.');
        const snapshot = history.pixels;
        const requested = revision;
        timer = setTimeout(() => {
            void verify(snapshot, requested);
        }, 140);
    }
    async function verify(snapshot: Uint8Array, requested: number): Promise<void> {
        controller = new AbortController();
        try {
            const reply = await fetch(api('/api/verify'), {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json', 'X-Editor-Token': config.token },
                body: JSON.stringify({ revision: requested, pixels: encode(snapshot) }),
            });
            const data = await reply.json();
            if (requested !== revision) {
                return;
            }
            if (!reply.ok) {
                throw new Error(data.error ?? 'The local checker could not be reached');
            }
            const result = data as VerificationResult;
            if (result.revision !== revision) {
                return;
            }
            regions = result.regions;
            renderOverlay();
            if (result.status === 'verified') {
                lastVerified = snapshot.slice();
                saveBackup();
                element<HTMLButtonElement>('restore').disabled = false;
                element<HTMLButtonElement>('export').disabled = false;
                element<HTMLButtonElement>('save').disabled = false;
                element('save').textContent = savedRevision === revision ? 'Saved' : 'Save artwork';
                setStatus(
                    'verified',
                    '✓ Verified',
                    `${result.reason} ${Math.round(result.elapsedMs)} ms.`,
                    result.detail
                );
            } else if (result.status === 'superseded') {
                setStatus('checking', 'Checking…', result.reason);
            } else {
                setStatus(
                    result.status === 'emulator-unavailable' ? 'checking' : 'unverified',
                    result.status === 'emulator-unavailable' ? 'Emulator setup needed' : 'Not verified',
                    result.reason,
                    result.detail
                );
            }
        } catch (error) {
            if (requested !== revision || (error instanceof DOMException && error.name === 'AbortError')) {
                return;
            }
            setStatus('unverified', 'Checker unavailable', error instanceof Error ? error.message : String(error));
        }
    }
    function setStatus(state: string, title: string, message: string, detail = ''): void {
        element('proof').dataset.state = state;
        element('proof-title').textContent = title;
        element('proof-message').textContent = message;
        element('proof-detail').textContent = detail;
        element('proof-details').hidden = !detail;
        const icon = state === 'verified' ? '✓' : state === 'unverified' ? '×' : '…';
        element('proof-toggle').textContent = icon;
        element('proof-toggle').setAttribute('aria-label', `${title}. ${message}`);
        element('proof-announcement').textContent = `${title}. ${message}`;
    }
    function render(
        pixels = floating
            ? pasteRegion(history.pixels, config.width, floating.patch, floating.left, floating.top)
            : history.pixels
    ): void {
        const data = new Uint8ClampedArray(config.width * config.height * 4);
        for (let p = 0; p < pixels.length; p++) {
            data.set(config.colors[pixels[p]].rgb, p * 4);
            data[p * 4 + 3] = 255;
        }
        const image = new ImageData(data, config.width, config.height);
        context?.putImageData(image, 0, 0);
        mini?.putImageData(image, 0, 0);
        renderControls();
        renderPalette();
        renderOverlay();
    }
    function renderControls(): void {
        for (const name of ['pencil', 'fill', 'select', 'pick']) {
            element(name).setAttribute('aria-pressed', String(tool === name));
            element<HTMLButtonElement>(name).disabled = !!floating;
        }
        element<HTMLSelectElement>('artwork').disabled = !!floating || !!stroke;
        art.style.cursor = floating ? (pasteDrag ? 'grabbing' : 'grab') : 'crosshair';
        element<HTMLButtonElement>('copy').disabled = (!selection && !floating) || !!stroke;
        element<HTMLButtonElement>('paste').disabled = !clipboard || !!stroke;
        element('place-paste').hidden = !floating;
        element('cancel-paste').hidden = !floating;
        for (const name of ['from', 'to', 'replace', 'clear', 'replace-arrow']) {
            element(name).hidden = !!floating;
        }
        element<HTMLButtonElement>('open').disabled = !!floating;
        element<HTMLButtonElement>('project').disabled = !!floating;
        element<HTMLButtonElement>('undo').disabled = !history.canUndo && !stroke && !floating;
        element('undo').title = `Undo ${history.undoLabel} · Ctrl+Z`;
        element<HTMLButtonElement>('redo').disabled = !history.canRedo || !!floating;
        element<HTMLButtonElement>('restore').disabled = !lastVerified || !!floating;
        element<HTMLButtonElement>('replace').disabled = !selection || !!floating;
        element<HTMLButtonElement>('clear').disabled = !selection || !!floating;
        element('replace-controls').hidden = !selection && tool !== 'select' && tool !== 'pick';
        element('undo').setAttribute('aria-label', 'Undo');
        element('redo').setAttribute('aria-label', 'Redo');
        element('selection-label').textContent = floating
            ? `Paste at ${floating.left}, ${floating.top} · drag / arrows · Enter places · Esc cancels`
            : selection
              ? `${selection.width}×${selection.height} pixels at ${selection.left}, ${selection.top}`
              : 'Select a rectangle to replace a color inside it.';
        for (const slot of ['from', 'to'] as const) {
            const color = config.colors[slot === 'from' ? from : to];
            const button = element(slot);
            button.replaceChildren();
            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.style.backgroundColor = color.hex;
            const label = document.createElement('span');
            const title = document.createElement('small');
            title.textContent = slot === 'from' ? 'Replace this color' : 'With / bucket color';
            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = color.name;
            label.append(title, name);
            button.append(dot, label);
            button.setAttribute('aria-pressed', String(active === slot));
        }
        element('select').title = floating
            ? 'Position the pasted pixels. Drag and release, or use arrows and Enter. Esc cancels.'
            : 'Drag a rectangle to copy it or replace a color inside it.';
        element('place-paste').title = floating
            ? `Place copy at ${floating.left}, ${floating.top} (Enter)`
            : 'Place copy (Enter)';
        element('color-help').textContent = floating
            ? 'Drag the copy into place, then release.'
            : tool === 'pencil'
              ? 'Draw one pixel or drag a stroke.'
              : tool === 'pick'
                ? 'Pick a source color.'
                : tool === 'select'
                  ? 'Drag a region, then replace a color.'
                  : 'Choose a color and fill a region.';
    }
    function renderPalette(): void {
        const used = new Set(history.pixels);
        for (const group of ['current', 'candidate', 'other'] as const) {
            const parent = element(`${group}-colors`);
            parent.replaceChildren();
            for (const color of config.colors.filter(
                (c) => c.group === group && (group !== 'other' || used.has(c.code))
            )) {
                const button = document.createElement('button');
                button.className = 'swatch';
                button.style.background = color.hex;
                button.title = `${color.name} · ${color.hex}`;
                button.setAttribute('aria-label', button.title);
                button.dataset.code = String(color.code);
                button.setAttribute('aria-pressed', String(color.code === (active === 'from' ? from : to)));
                button.onclick = () => {
                    if (active === 'from') {
                        from = color.code;
                    } else {
                        to = color.code;
                    }
                    renderControls();
                    renderPalette();
                };
                parent.append(button);
            }
        }
        element('other-group').hidden = element('other-colors').childElementCount === 0;
    }
    function renderOverlay(): void {
        if (overlay.width !== config.width * zoom) {
            overlay.width = config.width * zoom;
        }
        if (overlay.height !== config.height * zoom) {
            overlay.height = config.height * zoom;
        }
        if (!marks) {
            return;
        }
        marks.clearRect(0, 0, overlay.width, overlay.height);
        if (zoom >= 8) {
            marks.strokeStyle = 'rgba(170,190,220,.18)';
            marks.lineWidth = 1;
            marks.beginPath();
            for (let x = 0; x <= config.width; x++) {
                marks.moveTo(x * zoom + 0.5, 0);
                marks.lineTo(x * zoom + 0.5, config.height * zoom);
            }
            for (let y = 0; y <= config.height; y++) {
                marks.moveTo(0, y * zoom + 0.5);
                marks.lineTo(config.width * zoom, y * zoom + 0.5);
            }
            marks.stroke();
        }
        marks.lineWidth = 2;
        marks.strokeStyle = '#ff7373';
        marks.fillStyle = 'rgba(255,40,40,.12)';
        for (const region of regions) {
            marks.fillRect(region.left * zoom, region.top * zoom, region.width * zoom, region.height * zoom);
            marks.strokeRect(
                region.left * zoom + 1,
                region.top * zoom + 1,
                region.width * zoom - 2,
                region.height * zoom - 2
            );
        }
        if (floating) {
            marks.strokeStyle = '#80f0ba';
            marks.setLineDash([5, 3]);
            marks.strokeRect(
                floating.left * zoom + 1,
                floating.top * zoom + 1,
                floating.patch.width * zoom - 2,
                floating.patch.height * zoom - 2
            );
            marks.setLineDash([]);
        } else if (selection) {
            marks.strokeStyle = '#84c5ff';
            marks.fillStyle = 'rgba(90,170,255,.12)';
            marks.setLineDash([5, 3]);
            marks.fillRect(
                selection.left * zoom,
                selection.top * zoom,
                selection.width * zoom,
                selection.height * zoom
            );
            marks.strokeRect(
                selection.left * zoom + 1,
                selection.top * zoom + 1,
                selection.width * zoom - 2,
                selection.height * zoom - 2
            );
            marks.setLineDash([]);
        }
    }
    function setZoom(next: number, x = viewport.scrollLeft / zoom, y = viewport.scrollTop / zoom): void {
        const value = Math.min(zoomMax, Math.max(1, next));
        const old = zoom;
        zoom = value;
        document.documentElement.style.setProperty('--zoom', String(zoom));
        element('zoom-label').textContent = `${zoom}×`;
        viewport.scrollLeft += x * (zoom - old);
        viewport.scrollTop += y * (zoom - old);
        element<HTMLButtonElement>('zoom-out').disabled = zoom === 1;
        element<HTMLButtonElement>('zoom-in').disabled = zoom === zoomMax;
        renderOverlay();
    }
    function position(event: PointerEvent): { x: number; y: number } {
        const bounds = art.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(255, Math.floor((event.clientX - bounds.left) / zoom))),
            y: Math.max(0, Math.min(199, Math.floor((event.clientY - bounds.top) / zoom))),
        };
    }
    function downloadProject(): void {
        const blob = new Blob(
            [
                JSON.stringify(
                    {
                        format: 'fitnes-art-editor-v1',
                        width: config.width,
                        height: config.height,
                        emphasis: config.emphasis,
                        baselineHash: config.baselineHash,
                        pixels: encode(history.pixels),
                    },
                    null,
                    2
                ),
            ],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fitnes-${config.assetId.replace(/[^a-zA-Z0-9_-]/g, '-')}-project.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function saveToRepository(): Promise<void> {
        if (savedRevision === revision) {
            element<HTMLDialogElement>('saved-dialog').showModal();
            return;
        }
        const requested = revision;
        element<HTMLButtonElement>('save').disabled = true;
        try {
            const reply = await fetch(api('/api/save'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Editor-Token': config.token },
                body: JSON.stringify({ revision: requested }),
            });
            const result = await reply.json();
            if (!reply.ok) {
                throw new Error(result.error ?? 'Could not save the artwork');
            }
            const files = (result.files as string[]).map((file) => `'${file.replaceAll("'", "'\"'\"'")}'`).join(' ');
            element('commit-commands').textContent = `art_branch=$(git branch --show-current)
if [ -z "$art_branch" ] || [ "$art_branch" = main ] || [ "$art_branch" = master ]; then
  git switch -c "art/edit-$(date +%Y%m%d-%H%M%S)"
fi
git add -- ${files}
git commit --only -m "Edit artwork" -- ${files}`;
            savedRevision = requested;
            if (revision === requested) {
                element('save-state').textContent = `Saved to ${config.saveDirectory}/`;
                element('save').textContent = 'Saved';
            } else {
                notify('The checked image was saved. Your newer edits still need checking and saving.');
            }
            element<HTMLDialogElement>('saved-dialog').showModal();
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error));
        } finally {
            if (revision === requested) {
                element<HTMLButtonElement>('save').disabled = false;
            }
        }
    }
}

function element<T extends HTMLElement = HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) {
        throw new Error(`Missing editor element: ${id}`);
    }
    return node as T;
}
function parsePixels(value: unknown, count: number): Uint8Array {
    if (typeof value !== 'string' || value.length > Math.ceil((count * 4) / 3) + 4) {
        throw new Error('Invalid editor pixel data');
    }
    const pixels = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    if (pixels.length !== count || pixels.some((v) => v > 63)) {
        throw new Error(`Expected ${count} native pixels using NES color codes`);
    }
    return pixels;
}
function encode(pixels: Uint8Array): string {
    return btoa(String.fromCharCode(...pixels));
}
function notify(message: string): void {
    const notice = element('notice');
    notice.textContent = message;
    notice.hidden = false;
}

void main().catch((error) => {
    element('proof-title').textContent = 'Editor could not start';
    element('proof-message').textContent = error instanceof Error ? error.message : String(error);
});
