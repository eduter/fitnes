# Bottom tab icons

Owner selections: **Home A, Templates A, Exercises A**. Their silhouettes are
retained. History, Settings, and Weight each have three new candidates, for twelve
native **24×24 PNG** assets. The chooser keeps the three approved icons selected.
History uses back arrows rather than calendars. Weight offers an analog bathroom
scale, digital glass platform, and upright medical balance scale. The new gears
have straight-sided teeth, deep gaps, and large central bores.

Run `npm run dev` and open `/src/components/BottomTabs/preview.html`. Choose each
remaining icon, compare sets A/B/C, download PNGs, or bookmark the selection URL.
PNG pixels remain crisp with `image-rendering: pixelated` and integer enlargement;
SVG is unnecessary for this fixed logical grid. These PNG assets are drawn in
NES background tiles, so they consume no additional hardware sprite entries.

## Shared home hardware state

The icons use the exact PPU codes, Composite Direct display interpretation, and
red emphasis from [the final home artwork](../../../art/home/README.md). No new
palette or emphasis state is introduced:

| Material | PPU entries | RGB under emphasis 1 |
| --- | --- | --- |
| Dark shadow | `$07` | `#451600` |
| Steel | `$00` | `#7d5c4b` |
| Light steel | `$10` | `#d8a082` |
| Gold, Home and Exercises | `$38` | `#ffd679` |
| Universal background | `$0F` | `#000000` |

The **256×56** bar reuses the approved `SteelPanel` geometry with a palette-matched
18×18 PNG nine-slice, scoped to this bar. Slots remain 39/39/40/39/39/40 pixels.
Five **1×24** steel dividers stop six pixels short of the content edges and ten
pixels short of the metal. Icons, selection markers and keyboard focus outlines
sit on integer pixels.

The proof route places the scene above the bar in a **256×240** frame. It crops
16 floor rows from the bottom of the scene for this composition study; it never
changes `art/home/gym.png`. The indexed proof retains all 57 home sprites, its
four background palettes, three sprite palettes, MMC5 8×8 attributes and one
emphasis value. The combined frame still uses nine visible colors and at most
eight sprites per scanline. Full-scene layout and final icon choices remain open.

## Reproduction

Regenerate pixels directly from TypeScript on Node 24+:

```sh
node tools/generate-tab-icons.ts
```

Capture `/src/components/BottomTabs/preview.html?proof&variant=a` at exactly
256×240 in Chromium, after all images have loaded, then run:

```sh
node tools/prove-tab-icons.ts capture.png work/tab-proof
npm run nes:proof -- work/tab-proof/construction.json capture.png
npm run nes:emulate -- work/tab-proof/construction.json capture.png work/nes-emulator-core/fceumm_libretro.so
```

Set up the emulator with `npm run nes:emulator:setup` once. `variant=b`/`variant=c`
change only the three remaining choices. `choices=aaaabc` sets a mixed selection;
`active=settings` changes the selected destination. The proof builder verifies
the actual browser pixels, using the home construction unchanged above y=184 and
assigning only its existing background palettes to the bar. It does not repair,
resample, or reduce colors in the capture.

The gallery's explanatory text is ordinary review UI and outside the artwork
contract. Workout routing, stored data and the live workout preview are unchanged.
