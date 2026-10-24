import type { IconName } from './icons.ts';

/** A destination in the app shell's navigation. */
interface NavItem {
    href: string;
    label: string;
    /** Bottom-bar symbol. Five of them share the 32-tile row. */
    icon?: IconName;
}

/**
 * The five destinations worth a permanent slot in the bottom bar, ordered by
 * how often they are used. Kept out of the header because the bottom of a phone
 * screen is where a thumb already is, and a scrolling page must never carry the
 * navigation away with it.
 */
const primaryNavItems: NavItem[] = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/templates', label: 'Templates', icon: 'plan' },
    { href: '/exercises', label: 'Exercises', icon: 'move' },
    { href: '/bodyweight', label: 'Weight', icon: 'body' },
    { href: '/sessions', label: 'History', icon: 'history' },
];

/** Destinations that matter too rarely to earn a permanent slot. */
const secondaryNavItems: NavItem[] = [{ href: '/data', label: 'Data' }];

export type { NavItem };
export { primaryNavItems, secondaryNavItems };
