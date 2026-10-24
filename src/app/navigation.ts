/** A destination in the app shell's navigation. */
interface NavItem {
    href: string;
    label: string;
    /**
     * Bottom-bar text. Four letters, because five of them have to fit a row
     * that is 32 tiles wide.
     */
    short: string;
}

/**
 * The five destinations worth a permanent slot in the bottom bar, ordered by
 * how often they are used. Kept out of the header because the bottom of a phone
 * screen is where a thumb already is, and a scrolling page must never carry the
 * navigation away with it.
 */
const primaryNavItems: NavItem[] = [
    { href: '/', label: 'Home', short: 'Home' },
    { href: '/templates', label: 'Templates', short: 'Plan' },
    { href: '/exercises', label: 'Exercises', short: 'Move' },
    { href: '/bodyweight', label: 'Weight', short: 'Body' },
    { href: '/sessions', label: 'History', short: 'Hist' },
];

/** Destinations that matter too rarely to earn a permanent slot. */
const secondaryNavItems: NavItem[] = [{ href: '/data', label: 'Data', short: 'Data' }];

export type { NavItem };
export { primaryNavItems, secondaryNavItems };
