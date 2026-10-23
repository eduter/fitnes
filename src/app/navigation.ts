import type { PixelIconName } from '../components/pixel/index.ts';

/** A destination in the app shell's navigation. */
interface NavItem {
    href: string;
    label: string;
    /** Pixel-art symbol shown in the bottom bar, where there is no room for a word. */
    icon: PixelIconName;
}

/**
 * The five destinations worth a permanent slot in the bottom bar, ordered by
 * how often they are used. Kept out of the header because the bottom of a phone
 * screen is where a thumb already is, and a scrolling page must never carry the
 * navigation away with it.
 */
const primaryNavItems: NavItem[] = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/templates', label: 'Templates', icon: 'clipboard' },
    { href: '/exercises', label: 'Exercises', icon: 'dumbbell' },
    { href: '/bodyweight', label: 'Weight', icon: 'progress' },
    { href: '/sessions', label: 'History', icon: 'calendar' },
];

/** Destinations that matter too rarely to earn a permanent slot. */
const secondaryNavItems: NavItem[] = [{ href: '/data', label: 'Data', icon: 'diamond' }];

export { primaryNavItems, secondaryNavItems };
export type { NavItem };
