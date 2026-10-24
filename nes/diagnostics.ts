/** Stable machine-readable category for a diagnostic, so agents can branch on it. */
type DiagnosticCode =
    | 'asset-file'
    | 'attribute-conflict'
    | 'attribute-grid'
    | 'duplicate-name'
    | 'missing-glyph'
    | 'out-of-bounds'
    | 'palette-index'
    | 'palette-reference'
    | 'palette-shape'
    | 'pattern-limit'
    | 'schema'
    | 'screen-dimensions'
    | 'sprite-limit'
    | 'sprite-scanline-limit'
    | 'tile-pixel'
    | 'tile-reference'
    | 'tile-size';

/**
 * One problem found in a screen or asset. `path` points into the source
 * document (`layers[3].text`, `tiles.frame.tl[2]`); `file` names the document.
 */
interface Diagnostic {
    readonly severity: 'error' | 'warning';
    readonly code: DiagnosticCode;
    readonly file: string;
    readonly path: string;
    readonly message: string;
}

/** Accumulates diagnostics for one file; nothing is repaired or dropped. */
class DiagnosticSink {
    readonly items: Diagnostic[] = [];

    error(code: DiagnosticCode, file: string, path: string, message: string): void {
        this.items.push({ severity: 'error', code, file, path, message });
    }

    warning(code: DiagnosticCode, file: string, path: string, message: string): void {
        this.items.push({ severity: 'warning', code, file, path, message });
    }

    hasErrors(): boolean {
        return this.items.some((item) => item.severity === 'error');
    }
}

/** Render a diagnostic as one line: `error tile-pixel ui.json tiles.x[2]: …`. */
function formatDiagnostic(diagnostic: Diagnostic): string {
    const { severity, code, file, path, message } = diagnostic;
    const where = path === '' ? file : `${file} ${path}`;
    return `${severity} ${code} ${where}: ${message}`;
}

export { DiagnosticSink, formatDiagnostic };
export type { Diagnostic, DiagnosticCode };
