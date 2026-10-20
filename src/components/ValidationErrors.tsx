import { For, Show, type JSX } from 'solid-js';
import type { ValidationIssue } from '../domain/validation.ts';

interface ValidationErrorsProps {
    errors: ValidationIssue[];
}

/** Show every validation issue so a document can be fixed without hunting. */
function ValidationErrors(props: ValidationErrorsProps): JSX.Element {
    return (
        <Show when={props.errors.length > 0}>
            <ul class="error-list">
                <For each={props.errors}>
                    {(issue) => (
                        <li>
                            <Show when={issue.path} fallback={issue.message}>
                                <span class="error-path">{issue.path}</span> {issue.message}
                            </Show>
                        </li>
                    )}
                </For>
            </ul>
        </Show>
    );
}

export { ValidationErrors };
