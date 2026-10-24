/** One bitmap. `.` is empty, `1` is black, `2` is the fill, `3` is gold. */
interface IconBitmaps {
    /** One tile, the same size as a letter. */
    small: readonly string[];
    /** Two tiles. This is the size drawn in the bottom bar. */
    large: readonly string[];
}

/** Destinations that have a drawn symbol. */
type IconName = 'home' | 'plan' | 'move' | 'body' | 'history';

/** Order used by the size comparison and the bottom bar. */
const iconNames: readonly IconName[] = ['home', 'plan', 'move', 'body', 'history'];

/**
 * Menu symbols drawn from the reference sheet: a house, a clipboard, a
 * dumbbell, rising bars, and a calendar. Holes stay empty so the pane shows
 * through, which is how a blue window or a blue plate stays inside four colors.
 */
const icons: Record<IconName, IconBitmaps> = {
    home: {
        small: bitmap(`
            ...11...
            ..1221..
            .111111.
            12....21
            12.11.21
            11111111
            ........
            ........
        `),
        large: bitmap(`
            ................
            ......1111......
            ......1221......
            ....11122111....
            ...1122222111...
            ..112222222111..
            .11111111111111.
            .1222....222221.
            .1222....222221.
            .1222.11.222221.
            .1222.11.222221.
            .1222.11.222221.
            .11111111111111.
            ................
            ................
            ................
        `),
    },
    plan: {
        small: bitmap(`
            .111111.
            .122221.
            11111111
            1.3333.1
            1......1
            1.3333.1
            11111111
            ........
        `),
        large: bitmap(`
            ................
            ....11111111....
            ....12222221....
            ...1122222211...
            1111111111111111
            1.333333333333.1
            1..............1
            1.333333333333.1
            1..............1
            1.333333333333.1
            1..............1
            1.333333333333.1
            1111111111111111
            ................
            ................
            ................
        `),
    },
    move: {
        small: bitmap(`
            11....11
            1......1
            11111111
            ...22...
            11111111
            1......1
            11....11
            ........
        `),
        large: bitmap(`
            ................
            ................
            ..1111....1111..
            ..1..1....1..1..
            .11..111111..11.
            .1....1221....1.
            .1....1221....1.
            .11..111111..11.
            ..1..1....1..1..
            ..1111....1111..
            ................
            ................
            ................
            ................
            ................
            ................
        `),
    },
    body: {
        small: bitmap(`
            .....11.
            .....121
            ...11.21
            ...12121
            .11.2121
            .1212121
            11111111
            ........
        `),
        large: bitmap(`
            ................
            ................
            .............11.
            .............121
            ..........11.121
            ..........121121
            .......11.121121
            .......121121121
            ....11.121121121
            ....121121121121
            .11.121121121121
            .121121121121121
            1111111111111111
            ................
            ................
            ................
        `),
    },
    history: {
        small: bitmap(`
            .111111.
            .1....1.
            11111111
            13232321
            13232321
            13232321
            11111111
            ........
        `),
        large: bitmap(`
            ................
            ..111111111111..
            ..1..........1..
            1111111111111111
            1222222222222221
            1233333333333321
            1232323232323321
            1233333333333321
            1232323232323321
            1233333333333321
            1232323232323321
            1222222222222221
            1111111111111111
            ................
            ................
            ................
        `),
    },
};

/** Rows of a picture. Leading spaces are source indent, not pixels. */
function bitmap(art: string): readonly string[] {
    return art
        .trim()
        .split('\n')
        .map((row) => row.trim());
}

export type { IconName };
export { iconNames, icons };
