/** A destination in the app shell's navigation. */
interface NavItem {
    href: string;
    label: string;
    /** Single glyph shown in the bottom bar, where there is no room for a word. */
    icon: string;
}

/**
 * The five destinations worth a permanent slot in the bottom bar, ordered by
 * how often they are used. Kept out of the header because the bottom of a phone
 * screen is where a thumb already is, and a scrolling page must never carry the
 * navigation away with it.
 */
const primaryNavItems: NavItem[] = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/templates', label: 'Plans', icon: 'plan' },
    { href: '/exercises', label: 'Moves', icon: 'move' },
    { href: '/bodyweight', label: 'Weight', icon: 'body' },
    { href: '/sessions', label: 'Log', icon: 'history' },
];

/** Destinations that matter too rarely to earn a permanent slot. */
const secondaryNavItems: NavItem[] = [{ href: '/settings', label: 'Settings', icon: '*' }];

export { primaryNavItems, secondaryNavItems };
export type { NavItem };
