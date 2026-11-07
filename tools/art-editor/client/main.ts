import { EditHistory, floodFill, paintLine, type Region, replaceRegion } from '../model.ts';
import type { EditorConfig, VerificationResult } from '../protocol.ts';
import './style.css';

async function main(): Promise<void> {
    const response = await fetch('/api/config');
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
    let from = 56;
    let to = 32;
    let active: 'from' | 'to' = 'to';
    let selection: Region | null = null;
    let anchor: { x: number; y: number } | null = null;
    let zoom = 3;
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
    element('replace').onclick = () => {
        if (selection) {
            commit(replaceRegion(history.pixels, 256, selection, from, to), 'Replace in selection');
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
        window.location.assign(`/api/export?revision=${revision}`);
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
                project.width !== 256 ||
                project.height !== 200 ||
                project.emphasis !== config.emphasis
            ) {
                throw new Error('Choose a FitNES artwork editor project for the 256×200 hero');
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
        const source = history.pixels[point.y * 256 + point.x];
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
            commit(floodFill(history.pixels, 256, point.x, point.y, to), 'Bucket fill');
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
                pixels: paintLine(history.pixels, 256, point.x, point.y, point.x, point.y, to),
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
        if (stroke) {
            const point = position(event);
            stroke.pixels = paintLine(stroke.pixels, 256, stroke.last.x, stroke.last.y, point.x, point.y, stroke.color);
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
        anchor = null;
        finishStroke();
    };
    art.onpointercancel = () => {
        anchor = null;
        finishStroke();
    };
    art.onlostpointercapture = () => {
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
                element('save-state').textContent = 'Draft saved; waiting for verification';
            }
            return;
        }
        if (element<HTMLDialogElement>('saved-dialog').open) {
            return;
        }
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
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
            fileMenu.open = false;
            selection = null;
            renderControls();
            renderOverlay();
        }
    });
    render();
    schedule();

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
        if (stroke) {
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
            const reply = await fetch('/api/verify', {
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
    function render(pixels = history.pixels): void {
        const data = new Uint8ClampedArray(256 * 200 * 4);
        for (let p = 0; p < pixels.length; p++) {
            data.set(config.colors[pixels[p]].rgb, p * 4);
            data[p * 4 + 3] = 255;
        }
        const image = new ImageData(data, 256, 200);
        context?.putImageData(image, 0, 0);
        mini?.putImageData(image, 0, 0);
        renderControls();
        renderPalette();
        renderOverlay();
    }
    function renderControls(): void {
        for (const name of ['pencil', 'fill', 'select', 'pick']) {
            element(name).setAttribute('aria-pressed', String(tool === name));
        }
        element<HTMLButtonElement>('undo').disabled = !history.canUndo && !stroke;
        element('undo').title = `Undo ${history.undoLabel} · Ctrl+Z`;
        element<HTMLButtonElement>('redo').disabled = !history.canRedo;
        element<HTMLButtonElement>('restore').disabled = !lastVerified;
        element<HTMLButtonElement>('replace').disabled = !selection;
        element<HTMLButtonElement>('clear').disabled = !selection;
        element('replace-controls').hidden = !selection && tool !== 'select' && tool !== 'pick';
        element('undo').setAttribute('aria-label', 'Undo');
        element('redo').setAttribute('aria-label', 'Redo');
        element('selection-label').textContent = selection
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
        element('color-help').textContent =
            tool === 'pencil'
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
        overlay.width = 256 * zoom;
        overlay.height = 200 * zoom;
        if (!marks) {
            return;
        }
        if (zoom >= 8) {
            marks.strokeStyle = 'rgba(170,190,220,.18)';
            marks.lineWidth = 1;
            marks.beginPath();
            for (let x = 0; x <= 256; x++) {
                marks.moveTo(x * zoom + 0.5, 0);
                marks.lineTo(x * zoom + 0.5, 200 * zoom);
            }
            for (let y = 0; y <= 200; y++) {
                marks.moveTo(0, y * zoom + 0.5);
                marks.lineTo(256 * zoom, y * zoom + 0.5);
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
        if (selection) {
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
        const value = Math.min(16, Math.max(1, next));
        const old = zoom;
        zoom = value;
        document.documentElement.style.setProperty('--zoom', String(zoom));
        element('zoom-label').textContent = `${zoom}×`;
        viewport.scrollLeft += x * (zoom - old);
        viewport.scrollTop += y * (zoom - old);
        element<HTMLButtonElement>('zoom-out').disabled = zoom === 1;
        element<HTMLButtonElement>('zoom-in').disabled = zoom === 16;
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
                        width: 256,
                        height: 200,
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
        link.download = 'fitnes-hero-project.json';
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
            const reply = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Editor-Token': config.token },
                body: JSON.stringify({ revision: requested }),
            });
            const result = await reply.json();
            if (!reply.ok) {
                throw new Error(result.error ?? 'Could not save the artwork');
            }
            const files = (result.files as string[]).join(' ');
            element('commit-commands').textContent = `art_branch=$(git branch --show-current)
if [ -z "$art_branch" ] || [ "$art_branch" = main ] || [ "$art_branch" = master ]; then
  git switch -c "art/home-edit-$(date +%Y%m%d-%H%M%S)"
fi
git add -- ${files}
git commit --only -m "Edit home artwork" -- ${files}`;
            savedRevision = requested;
            if (revision === requested) {
                element('save-state').textContent = 'Saved to art/home/edited/';
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
function decode(value: unknown): Uint8Array {
    if (typeof value !== 'string' || value.length > 69000) {
        throw new Error('Invalid editor pixel data');
    }
    const pixels = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    if (pixels.length !== 51200 || pixels.some((v) => v > 63)) {
        throw new Error('Expected a 256×200 image using NES color codes');
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
