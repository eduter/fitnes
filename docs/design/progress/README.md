# Progress chart review

The retained 256×640 captures use seeded preview data, Chromium at DPR 1,
loaded pixel fonts and CRT intensity zero. They cover the complete Bodyweight
screen and Bent-over row Progress across four completed workout sessions.

- [Bodyweight](weight.png): daily means and trailing seven-calendar-day means.
- [Exercise progress](exercise.png): Epley estimates and the underlying sets.

Reproduce the palette/attribute/sprite checks from the repository root:

```sh
node tools/prove-design-system.ts docs/design/progress/weight.png work/progress/weight-proof ui
node tools/prove-design-system.ts docs/design/progress/exercise.png work/progress/exercise-proof ui
```

All six vertical crops passed the existing `mmc5-exattr` reconstruction checker
with Composite Direct display palette and red emphasis 1. The maximum sprite
count per scanline was eight. This is the existing construction checker, not an
independent emulator run. HTML labels and CSS legend strokes avoid SVG-text and
Unicode fallback antialiasing that introduced colors outside the palette.

Chromium browser checks exercised period selection and exercise selection with
no page errors or horizontal overflow. Android device review remains pending.
