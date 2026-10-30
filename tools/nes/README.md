# NES visual check

Run this after changing UI, using the **actual rendered pixels**. The check is
independent of the app's components, CSS, artwork pipeline, and renderer. It
requires Node 24+; live capture also requires current Chromium/Chrome
(`CHROME_PATH` selects the executable; the default is `chromium`).

```sh
npm run dev
# In another terminal, capture an initial page once its content is ready:
npm run nes:check -- --url http://localhost:5173/ --ready '#root h1'
# Check screenshots of any routes, dialogs, forms, or workout states:
npm run nes:check -- screenshots/menu.png screenshots/dialog.png
# Check a device image that is an exact 3× enlargement of a logical column:
npm run nes:check -- screenshots/menu-at-3x.png --scale 3
```

The default output directory is `work/nes-check` (ignored by Git). `--out DIR`
changes it. Each input produces a numbered `.png` copy and `.json` report.
The JSON array is also printed to stdout; invocation errors go to stderr.
Use `node tools/nes/cli.ts ...` if consuming stdout directly (npm prints a
script banner). `--help` describes the command.

| Result | Exit | Meaning |
| --- | --- | --- |
| `pass` | 0 | A legal background or background-plus-sprites construction was found |
| `fail` | 1 | A definite violation: dimensions, off-palette pixels, or over 25 visible colors |
| `inconclusive` | 2 | The bounded search did not establish compliance; candidate diagnostics explain where it ran out of room |
| `error` | 3 | Invalid invocation/PNG/scaling, missing Chrome, navigation/readiness failure, or capture overflow |

**Only exit 0 is approval evidence.** Inconclusive is deliberately separate
from a proven violation: the sprite search is constructive but heuristic.
It can miss a legal arrangement. Simplify the reported region or preserve an
explicit layer construction when investigating; do not disable the check or
present an inconclusive report as proof that the UI is compliant or impossible.
A palette-packing budget shared across all attempts prevents exponential search
from hanging a job.

## Contract

- A 256-pixel logical column, with positive height. Pages may scroll past 240.
  Partial final 16-pixel rows are supported; no arbitrary viewport-height rule.
- Exact colors from the source-controlled FCEUX RGB interpretation in
  `palette.json`. Duplicate RGB entries count as the same visible color. The
  console does not emit RGB; this is the project's reproducible display table.
- 8×8 background patterns and one subpalette per 16×16 attribute region,
  anchored at document origin. Four background subpalettes, each with three
  colors plus one shared universal color. Regions need not display that color.
- Four sprite subpalettes of three visible colors each; transparent entry 0.
  Sprites may supply colors that a background region cannot display. A fifth
  color in one tile alone is therefore **not** a violation.
- A single sprite mode (8×8 or 8×16) per picture, at most eight sprite bounding
  boxes per scanline, and at most 64 sprites intersecting any 240-line window.
  Transparent rows still consume scanline budget. Sprite slots can be reused
  further down a scrolling page.
- One background palette set and one sprite palette set across the whole
  captured document. No mid-frame palette switching, extended attributes,
  emphasis/CRT effects, emulator/CPU timing, audio, or controller restrictions.
- **Unlimited distinct background and sprite tile patterns.** There is no
  CHR/pattern-bank cap, even for short images. All other spatial/color limits
  remain in force.

The background solver exactly packs region color sets into shared palettes.
When it cannot do that, the sprite search tries universal colors, keeps common
and wide colors in the background, and covers remaining pixels with transparent
sprite patterns. A successful search satisfies the budgets; a failed greedy
choice is not a mathematical impossibility proof. Definite violations are
checked before the search.

## Capture and coverage

Live capture uses a clean, temporary Chrome profile, a **256×240 CSS viewport**
and DPR 1. It waits for document load, fonts, and `--ready SELECTOR` (default
`body`). It captures the full document without resizing the viewport to the
page height, and rejects horizontal overflow instead of cropping it. It keeps
normal font rendering, antialiasing, and animation: the check must see what the
page really displays. Capture and protocol waits have timeouts; the process,
WebSocket, and profile are cleaned up on success and failure.

For data-dependent and interactive states, prepare the state in a browser and
supply its PNG. A clean URL capture has no existing IndexedDB/session data and
checks one initial state. Choose a readiness selector that proves the desired
content has loaded. Capture each relevant route, dialog, input focus, error,
transition frame, and scroll position yourself. A single pass proves only the
captured pixels, not every state of an app. Fixed/sticky elements and
viewport-dependent layouts need separate screenshots at real scroll positions.

The PNG path supports opaque, non-interlaced 8-bit RGB/RGBA, all five filters,
and checked chunk CRCs/decoded lengths. It rejects transparency and unsupported
encodings rather than guessing a compositing background. It never quantizes,
resizes, or hides off-palette pixels. `--scale N` checks **every** pixel of each
N×N block before extracting its logical pixel. Fractional/blended scaling fails.
There is no inferred scale, guessed crop, or tolerance. For letterboxed device
screenshots, supply the known content rectangle and separately inspect the
surrounding chrome/margins; a content-only pass does not certify the full device
presentation.

`npm run check` includes algorithm, PNG, scaling, command exit/report, and real
Chrome capture regressions. CI installs stable Chrome. It validates the checker;
it does not declare today's non-NES application shell compliant. Future UI
changes must attach the reports for the states they change.

## Consolidation

This replaces the **NES compliance-checking** work in
`cursor/nes-sprite-layer-2fae`, `cursor/nes-window-ui-81c6`, and
`cursor/nes-typography-menu-research-33d8`. Palette data, pixel I/O, background
packing, sprite inference, and useful regression fixtures were adapted from
those experiments, especially `b12fd56` on the sprite branch. The window and
typography branches retain an older background-only checker, which rejects
legal sprite overlays. `cursor/nes-design-system-31db` supplies UI/artwork rather
than a compliance checker.

Their JSON drawing language, screen compiler, renderer, fonts, artwork, and UI
prototypes are separate experiments and are not prerequisites for this tool.
