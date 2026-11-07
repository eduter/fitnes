import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { displayColors } from '../nes-hardware/check.ts';
import { decodePng } from '../nes-hardware/png.ts';
import type { HardwareConstruction } from '../nes-hardware/rom.ts';
import { imageCodes } from './compile.ts';
import type { EditorConfig, VerificationResult } from './protocol.ts';
import { saveArtwork } from './save.ts';
import { createVerifier, type VerifiedArtifact } from './verification.ts';

const NAMES = new Map([
    [15, 'Black'],
    [0, 'Steel'],
    [7, 'Shadow'],
    [56, 'Gold'],
    [16, 'Copper'],
    [38, 'Coral'],
    [45, 'Charcoal'],
    [39, 'Orange'],
    [55, 'Skin'],
    [32, 'Off-white'],
    [54, 'Peach'],
    [12, 'Deep teal'],
    [60, 'Soft cream'],
    [61, 'Light copper'],
    [23, 'Ochre'],
    [8, 'Olive shadow'],
    [22, 'Ember'],
    [49, 'Pale linen'],
]);
const CANDIDATES = [32, 54, 12, 60, 61, 23, 8, 22, 49];

/** Create a loopback-only editor server with versioned drafts and serialized emulator checks. */
function createEditorServer(root: string, corePath: string): Server {
    const seed = JSON.parse(readFileSync(join(root, 'art/home/construction.json'), 'utf8')) as HardwareConstruction;
    const currentFile = readFileSync(join(root, 'art/home/gym.png'));
    const baselineHash = createHash('sha256').update(currentFile).update(JSON.stringify(seed)).digest('hex');
    const original = imageCodes(decodePng(currentFile), seed);
    const token = randomBytes(24).toString('hex');
    const work = join(root, 'work/art-editor');
    const draftPath = join(work, 'draft.json');
    mkdirSync(work, { recursive: true });
    let pixels: Uint8Array = original.slice();
    let lastVerified: Uint8Array | null = null;
    let revision = 0;
    let updatedAt = 0;
    let recoveryMessage = '';
    if (existsSync(draftPath)) {
        try {
            const draft = JSON.parse(readFileSync(draftPath, 'utf8'));
            if (draft.baselineHash !== baselineHash) {
                throw new Error('The source artwork changed');
            }
            pixels = decodePixels(draft.pixels);
            if (draft.lastVerified) {
                lastVerified = decodePixels(draft.lastVerified);
            }
            updatedAt = typeof draft.updatedAt === 'number' ? draft.updatedAt : 0;
        } catch {
            // Preserve a corrupt or older-source draft instead of overwriting the user's work
            const backup = `draft-backup-${Date.now()}.json`;
            renameSync(draftPath, join(work, backup));
            recoveryMessage = `An older or unreadable draft was preserved as work/art-editor/${backup}. Starting from the app image.`;
        }
    } else if (existsSync(join(root, 'art/home/edited/project.json'))) {
        const savedPath = join(root, 'art/home/edited/project.json');
        try {
            const saved = JSON.parse(readFileSync(savedPath, 'utf8'));
            if (saved.baselineHash !== baselineHash || saved.emphasis !== seed.emphasis) {
                throw new Error('Different source');
            }
            pixels = decodePixels(saved.pixels);
            updatedAt = statSync(savedPath).mtimeMs;
        } catch {
            recoveryMessage =
                'The saved artwork uses another source version. It remains in art/home/edited/project.json and can be opened with File → Open backup.';
        }
    }
    const verifier = createVerifier(root, corePath, seed);
    let queue = Promise.resolve();
    let artifact: VerifiedArtifact | null = null;
    let artifactRevision = -1;

    return createServer((request, response) => {
        void handle(request, response).catch((error) => {
            if (!response.headersSent && !response.destroyed) {
                json(response, 400, { error: error instanceof Error ? error.message : String(error) });
            }
        });
    });

    async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
        const host = request.headers.host ?? '';
        if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host)) {
            json(response, 403, { error: 'Use the localhost URL printed by the editor' });
            return;
        }
        if (request.headers.origin && request.headers.origin !== `http://${host}`) {
            json(response, 403, { error: 'Cross-origin editor access is not allowed' });
            return;
        }
        const url = new URL(request.url ?? '/', `http://${host}`);
        if (request.method === 'GET' && url.pathname === '/api/config') {
            const currentCodes = new Set(original);
            const config: EditorConfig = {
                token,
                baselineHash,
                emphasis: seed.emphasis,
                revision,
                pixels: Buffer.from(pixels).toString('base64'),
                lastVerified: lastVerified ? Buffer.from(lastVerified).toString('base64') : null,
                updatedAt,
                emulatorReady: existsSync(corePath),
                recoveryMessage,
                colors: displayColors(seed.emphasis).map((rgb, code) => ({
                    code,
                    name: NAMES.get(code) ?? `NES color ${code.toString(16).padStart(2, '0')}`,
                    rgb,
                    hex: `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`,
                    group: currentCodes.has(code) ? 'current' : CANDIDATES.includes(code) ? 'candidate' : 'other',
                })),
            };
            json(response, 200, config);
            return;
        }
        if (request.method === 'POST' && url.pathname === '/api/verify') {
            if (
                request.headers['x-editor-token'] !== token ||
                !request.headers['content-type']?.startsWith('application/json')
            ) {
                json(response, 403, { error: 'Reload the editor before making changes' });
                return;
            }
            const body = JSON.parse(await readBody(request));
            const edit = decodePixels(body.pixels);
            if (!Number.isSafeInteger(body.revision) || body.revision < 0) {
                throw new Error('Invalid edit revision');
            }
            const same = edit.every((value, i) => value === pixels[i]);
            if (body.revision < revision || (body.revision === revision && !same)) {
                json(response, 409, {
                    error: 'Another editor tab changed this draft. Download your project, then reload.',
                });
                return;
            }
            revision = body.revision;
            pixels = edit.slice();
            updatedAt = Date.now();
            persist();
            const editRevision = revision;
            let result: VerificationResult;
            const task = queue.then(async () => {
                if (editRevision !== revision) {
                    return superseded(editRevision);
                }
                const checked = await verifier.verify(edit, editRevision);
                if (editRevision !== revision) {
                    return superseded(editRevision);
                }
                if (checked.artifact && checked.result.status === 'verified') {
                    artifact = checked.artifact;
                    artifactRevision = editRevision;
                    lastVerified = edit.slice();
                    persist();
                }
                return checked.result;
            });
            queue = task.then(
                () => undefined,
                () => undefined
            );
            result = await task;
            if (!response.destroyed) {
                json(response, 200, result);
            }
            return;
        }
        if (request.method === 'POST' && url.pathname === '/api/save') {
            if (
                request.headers['x-editor-token'] !== token ||
                !request.headers['content-type']?.startsWith('application/json')
            ) {
                json(response, 403, { error: 'Reload the editor before saving' });
                return;
            }
            const body = JSON.parse(await readBody(request));
            if (!artifact || artifactRevision !== revision || body.revision !== revision) {
                json(response, 409, {
                    error: 'Wait until this edit is verified before saving artwork to the repository',
                });
                return;
            }
            const files = saveArtwork(root, artifact, baselineHash, seed.emphasis, pixels);
            json(response, 200, { revision, files });
            return;
        }
        if (request.method === 'GET' && url.pathname === '/api/export') {
            if (!artifact || artifactRevision !== revision || Number(url.searchParams.get('revision')) !== revision) {
                json(response, 409, {
                    error: 'Wait until the current edit is verified before downloading a verified bundle',
                });
                return;
            }
            response.writeHead(200, {
                'Content-Type': 'application/gzip',
                'Content-Disposition': 'attachment; filename="fitnes-hero-verified.tar.gz"',
                'Cache-Control': 'no-store',
            });
            response.end(readFileSync(artifact.archive));
            return;
        }
        if (request.method !== 'GET') {
            json(response, 405, { error: 'Method not allowed' });
            return;
        }
        if (url.pathname === '/assets/current.png') {
            send(response, currentFile, '.png');
            return;
        }
        if (url.pathname === '/assets/concept.png') {
            send(response, readFileSync(join(root, 'docs/reference-home-screen-image.png')), '.png');
            return;
        }
        const base = resolve(root, 'work/art-editor-ui');
        const path = resolve(base, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
        if (!path.startsWith(base + sep) || !existsSync(path)) {
            json(response, 404, { error: 'Not found' });
            return;
        }
        send(response, readFileSync(path), extname(path));
    }

    function persist(): void {
        const temp = `${draftPath}.tmp`;
        writeFileSync(
            temp,
            JSON.stringify({
                version: 1,
                baselineHash,
                updatedAt,
                pixels: Buffer.from(pixels).toString('base64'),
                lastVerified: lastVerified ? Buffer.from(lastVerified).toString('base64') : null,
            })
        );
        renameSync(temp, draftPath);
    }
}

/** Validate canonical base64 and the exact native six-bit pixel buffer. */
function decodePixels(value: unknown): Uint8Array {
    if (typeof value !== 'string' || value.length > 69000) {
        throw new Error('Expected native editor pixels');
    }
    const bytes = Buffer.from(value, 'base64');
    if (bytes.length !== 51200 || bytes.toString('base64') !== value || bytes.some((v) => v > 63)) {
        throw new Error('Pixels must contain exactly 51,200 six-bit NES colors');
    }
    return new Uint8Array(bytes);
}

async function readBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 100000) {
            throw new Error('Editor request exceeds 100 KB');
        }
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

function superseded(revision: number): VerificationResult {
    return {
        revision,
        status: 'superseded',
        reason: 'A newer edit is waiting for verification',
        regions: [],
        elapsedMs: 0,
    };
}
function json(response: ServerResponse, status: number, value: unknown): void {
    response.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    response.end(JSON.stringify(value));
}
function send(response: ServerResponse, data: Buffer, extension: string): void {
    const types: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
    };
    response.writeHead(200, {
        'Content-Type': types[extension] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Content-Security-Policy':
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    response.end(data);
}

export { createEditorServer, decodePixels };
