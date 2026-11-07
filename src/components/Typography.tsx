import type { JSX } from 'solid-js';
import './Typography.css';

/** The current tab or page title. */
function PageTitle(props: HeadingProps): JSX.Element {
    return <h1 class="nes-page-title">{props.children}</h1>;
}

/** A bounded editor's title, subordinate to its page. */
function DialogTitle(props: HeadingProps): JSX.Element {
    return <h2 class="nes-dialog-title">{props.children}</h2>;
}

/** A group of related fields within an editor. */
function SectionHeading(props: HeadingProps): JSX.Element {
    return <h3 class="nes-section-heading">{props.children}</h3>;
}

/** Heading content; visual hierarchy is owned by Typography.css. */
interface HeadingProps {
    children: JSX.Element;
}

export { DialogTitle, PageTitle, SectionHeading };
