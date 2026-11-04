import { For, type JSX } from 'solid-js';
import { SteelPanel } from '../SteelPanel/SteelPanel.tsx';
import './BottomTabs.css';

const tabItems = [
    { id: 'home', label: 'Home' },
    { id: 'templates', label: 'Templates' },
    { id: 'exercises', label: 'Exercises' },
    { id: 'weight', label: 'Weight' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
] as const;
const iconVariants = ['a', 'b', 'c'] as const;
const acceptedTabs = new Set<TabId>(['templates', 'exercises', 'weight', 'history', 'settings']);
const iconFiles = import.meta.glob<string>('./icons/*.png', { eager: true, query: '?url', import: 'default' });

/** A candidate icon-only bar; routing and Settings contents belong to the consuming app. */
function BottomTabs(props: BottomTabsProps): JSX.Element {
    return (
        <SteelPanel class="bottom-tabs" role="navigation" aria-label="Main">
            <div class="bottom-tabs__items">
                <For each={tabItems}>
                    {(item) => (
                        <button
                            type="button"
                            class="bottom-tabs__item"
                            aria-label={item.label}
                            title={item.label}
                            aria-current={props.active === item.id ? 'page' : undefined}
                            onClick={() => props.onSelect?.(item.id)}
                        >
                            <img src={tabIconUrl(item.id, props.choices[item.id])} width="24" height="24" alt="" />
                        </button>
                    )}
                </For>
            </div>
        </SteelPanel>
    );
}

/** Resolve one of the 8 standalone, native-resolution PNG sprites. */
function tabIconUrl(tab: TabId, variant: IconVariant): string {
    const choice = acceptedTabs.has(tab) ? 'a' : variant;
    return iconFiles[`./icons/${tab}-${choice}.png`];
}

/** IDs match the compact preview's five destinations, with Settings added for Data and future options. */
type TabId = (typeof tabItems)[number]['id'];
/** Three independently selectable alternatives for every tab. */
type IconVariant = (typeof iconVariants)[number];
/** The chosen artwork for each destination. */
type IconChoices = Record<TabId, IconVariant>;
/** Controlled selection keeps the reusable bar independent of routing and storage. */
interface BottomTabsProps {
    choices: IconChoices;
    active?: TabId;
    onSelect?: (tab: TabId) => void;
}

export type { BottomTabsProps, IconChoices, IconVariant, TabId };
export { acceptedTabs, BottomTabs, iconVariants, tabIconUrl, tabItems };
