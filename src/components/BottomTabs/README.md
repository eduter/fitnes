# Bottom tab icons

Owner selections: **A for every tab**. Templates, Exercises, Weight, History,
and Settings are fixed to A. The house keeps A's gable, chimney and footprint,
with three detail alternatives: simple lit windows, framed windows, and window
panes with brickwork. Gray walls and light steel edges keep the structure visible
against black; yellow appears only in the window glass. There are eight native
**24×24 PNG** assets in the chooser.

Run `npm run dev` and open `/src/components/BottomTabs/preview.html`. Compare the
three houses in the bar, download PNGs, or bookmark the selection URL. PNG pixels
remain crisp with `image-rendering: pixelated` and integer enlargement. The five
other A icons are unchanged.

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
changes `art/home/gym.png`. The indexed proof retains all 57 home sprites and adds two 8×8 window overlays
using the existing gold sprite palette. Light steel edges and gold windows can
then share a house tile without changing any palette. The complete frame uses
59 of 64 sprites, the same four background palettes and three sprite palettes,
nine visible colors, and at most eight sprites per scanline. Full-scene layout
and the final house detail choice remain open.

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
change only the house. `choices=caaaaa` selects house C;
`active=settings` changes the selected destination. The proof builder verifies
the actual browser pixels, using the home construction unchanged above y=184 and
assigning its existing background palettes and two gold window overlays to the bar. It does not repair,
resample, or reduce colors in the capture.

The gallery's explanatory text is ordinary review UI and outside the artwork
contract. Workout routing, stored data and the live workout preview are unchanged.
