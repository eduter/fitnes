import type { JSX } from 'solid-js';
import { Show } from 'solid-js';

interface PageHeaderProps {
    title: string;
    actions?: JSX.Element;
}

/** Page title with an optional action slot. */
function PageHeader(props: PageHeaderProps): JSX.Element {
    return (
        <div class="page-header">
            <h1 class="page-title">{props.title}</h1>
            <Show when={props.actions}>
                <div class="page-actions">{props.actions}</div>
            </Show>
        </div>
    );
}

export { PageHeader };
