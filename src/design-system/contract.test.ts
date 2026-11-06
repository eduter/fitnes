import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import { expect, it } from 'vitest';

it('keeps native controls inside their approved component implementations', () => {
    const implementations: Record<string, readonly string[]> = {
        button: ['src/components/Button/Button.tsx', 'src/components/BottomTabs/BottomTabs.tsx'],
        input: ['src/components/TextInput/TextInput.tsx', 'src/components/DateSpinner/DateSpinner.tsx'],
    };
    implementations.textarea = ['src/components/TextArea/TextArea.tsx'];
    const violations: string[] = [];
    for (const path of sourceFiles('src')) {
        const source = parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
        function visit(node: unknown): void {
            if (!node || typeof node !== 'object') {
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(visit);
                return;
            }
            const fields = node as Record<string, unknown>;
            if (fields.type === 'JSXOpeningElement') {
                const element = fields.name as { name?: string };
                const tag = element.name ?? '';
                if (
                    ['button', 'input', 'select', 'textarea', 'details'].includes(tag) &&
                    !implementations[tag]?.includes(path)
                ) {
                    violations.push(`${path}: use the design-system component instead of <${tag}>`);
                }
            }
            Object.values(fields).forEach(visit);
        }
        visit(source);
    }
    expect(violations, 'Missing patterns belong in the design system before screen integration').toEqual([]);
});

function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return sourceFiles(path);
        }
        return path.endsWith('.tsx') && !path.includes('.test.') ? [path] : [];
    });
}
