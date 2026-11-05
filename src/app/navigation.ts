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
    { href: '/', label: 'Home', icon: '⌂' },
    { href: '/templates', label: 'Templates', icon: '☰' },
    { href: '/exercises', label: 'Exercises', icon: '◈' },
    { href: '/bodyweight', label: 'Weight', icon: '⚖' },
    { href: '/sessions', label: 'History', icon: '◷' },
];

/** Destinations that matter too rarely to earn a permanent slot. */
const secondaryNavItems: NavItem[] = [{ href: '/data', label: 'Data', icon: '⇅' }];

export { primaryNavItems, secondaryNavItems };
export type { NavItem };
