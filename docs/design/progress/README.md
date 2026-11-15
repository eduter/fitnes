# Progress chart review

The retained 256×640 Chromium captures use seeded preview data, DPR 1,
loaded pixel fonts and CRT intensity zero:

- [Bodyweight](weight.png): latest individual reading and inline daily/average chart.
- [Weight records](records.png): scrollable history over the existing page.
- [Exercise progress](exercise.png): graph opened directly from an exercise row.
- [Graph help](help.png): explanation behind ? over the current graph.

Reproduce the palette/attribute/sprite checks from the repository root:

```sh
node tools/prove-design-system.ts docs/design/progress/weight.png work/progress/weight-proof progress
node tools/prove-design-system.ts docs/design/progress/records.png work/progress/records-proof progress
node tools/prove-design-system.ts docs/design/progress/exercise.png work/progress/exercise-proof progress
node tools/prove-design-system.ts docs/design/progress/help.png work/progress/help-proof progress
```

The progress composition assigns background palette 2 to PPU codes [15, 0, 39,
32]: black, steel, orange and off-white. This uses the owner's requested source
inks without requiring long graph lines to consume sprites. Other background
and sprite palettes remain those of the home construction. No constraints in
the checker are relaxed. All twelve vertical crops pass `mmc5-exattr` with
Composite Direct RGB and red emphasis 1; the maximum is two sprites per scanline.
This is the existing construction checker, not an independent emulator run.

Browser checks at 256×640 and 390×844 cover records/edit stacking, direct
exercise-row progress, ? help, browser Back, restored focus and transparent
backdrops, with no page errors or horizontal overflow. Component tests cover
editing/deleting a reading and refreshing the latest-reading summary. Android
device review remains pending.
