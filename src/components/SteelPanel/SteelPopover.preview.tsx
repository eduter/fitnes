import { render } from 'solid-js/web';
import { SteelPopoverPreview } from './SteelPopoverPreview.tsx';

const target = document.getElementById('popover-preview');
if (!target) {
    throw new Error('Missing steel popover preview root');
}
render(() => <SteelPopoverPreview />, target);
