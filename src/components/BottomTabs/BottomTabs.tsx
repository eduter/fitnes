import { For, type JSX } from 'solid-js';
import { SteelPanel } from '../SteelPanel/SteelPanel.tsx';
import './BottomTabs.css';

const tabItems = [
    { id: 'home', label: 'Home', icon: new URL('./icons/home.png', import.meta.url).href },
    { id: 'templates', label: 'Workouts', icon: new URL('./icons/templates.png', import.meta.url).href },
    { id: 'exercises', label: 'Exercises', icon: new URL('./icons/exercises.png', import.meta.url).href },
    { id: 'weight', label: 'Weight', icon: new URL('./icons/weight.png', import.meta.url).href },
    { id: 'history', label: 'History', icon: new URL('./icons/history.png', import.meta.url).href },
    { id: 'settings', label: 'Settings', icon: new URL('./icons/settings.png', import.meta.url).href },
] as const;

/** The six selected icons in the steel frame; routing belongs to the consuming app. */
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
                            <img src={item.icon} width="24" height="24" alt="" />
                        </button>
                    )}
                </For>
            </div>
        </SteelPanel>
    );
}

/** IDs match the compact preview's five destinations, with Settings added for Data and future options. */
type TabId = (typeof tabItems)[number]['id'];
/** Controlled selection keeps the reusable bar independent of routing and storage. */
interface BottomTabsProps {
    active?: TabId;
    onSelect?: (tab: TabId) => void;
}

export type { BottomTabsProps, TabId };
export { BottomTabs, tabItems };
