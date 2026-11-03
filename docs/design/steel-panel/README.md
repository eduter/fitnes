# SteelPanel

A reusable Solid component for the approved top-level metal frame. H corners
retain one cut pixel and one rivet each; metal bars are 4 pixels thick. A
2-pixel black surround belongs to the component's outer box. There are no tabs,
icons, separators, navigation handlers or workout-screen integration.

```tsx
import { SteelPanel } from '../../../src/components/SteelPanel/SteelPanel.tsx';

<SteelPanel class="workout-panel" role="region" aria-label="Workout">
    {content}
</SteelPanel>
```

Set dimensions through the caller's CSS or the normal `style` prop, or leave
height automatic to grow with children. Ordinary div attributes, classes,
classList, refs and children pass through. Importing the component imports its
CSS. The component does not depend on the app's global stylesheet.

## How sizing works

CSS `border-image` nine-slices an **18×18 SVG texture**. The 8×8 corner slices
stay fixed; only two-pixel straight-edge slices stretch. This is a small material
texture, not a bitmap of a panel at a chosen width or height. There is no canvas,
JavaScript resize logic, image-sized layout, or grid-alignment requirement on
panel dimensions. A 127×53 panel is as valid as a 256×48 panel.

The outer box uses a grid to stretch its framed child. It has 2px black padding;
the child has a 4px layout border and 4px content padding to keep content clear
of the inset corner plates. Thus an empty panel's minimum is **20×20**, and a
67px-tall child produces an 87px-tall panel. A caller-specified 256×48 box has
exactly the 252×44 frame from the approved bottom-panel study.

Pixel-art fidelity assumes whole logical-pixel dimensions/positions and crisp
presentation at device scale. Arbitrary fractional CSS positions or a blended
page transform are not certified. Children keep their own appearance and must
be checked when integrated; this component cannot make arbitrary text or colors
NES-compliant. Its default black fill is part of the approved panel treatment.

## Edit the material

`src/components/SteelPanel/corner.json` contains the approved 8×8 corner in
editable two-bit pixel rows. The four inks are black ($0F), gray ($00), silver
($10), and white ($20) from the repo's pinned FCEUX RGB table. Run
`npm run generate:steel-panel` after editing to regenerate `steel-panel.svg`.
Its paths are integer-pixel rectangles, with crisp-edge SVG rendering.

## Preview and reproduce the NES check

Run `npm run dev`, then open `/steel-panel.html`. The separate demo exercises
wide, narrow, tall, minimum and content-sized panels. It never loads the app or
IndexedDB. `/steel-panel.html?proof` removes only the ordinary explanatory text
so the checker sees the same components in a black 256px column.

The compliance checker remains a separate, unmerged experiment. Fetch its
pinned source, then run its live Chrome capture against this component demo:

```sh
git fetch origin c910349a6cd90d29766ebd69fb64ec6032a5cc0c
mkdir -p work/nes-checker
git archive c910349a6cd90d29766ebd69fb64ec6032a5cc0c tools/nes | tar -x -C work/nes-checker
node work/nes-checker/tools/nes/cli.ts \
  --url 'http://localhost:5173/steel-panel.html?proof' \
  --ready '[data-case="content"]' --out work/panel-check
```

Node 24+ and current Chromium/Chrome are required; `CHROME_PATH` selects the
browser. This PR does not adopt the checker or expand its scope. Its documented
contract and implementation were reviewed: it checks exact master-palette
colors, 16×16 background attributes, palettes and sprite budgets; it permits
unlimited distinct patterns. This border uses one four-color background
subpalette and no sprites. An independent count finds 66 unique background
patterns in the initial capture and 69 after content growth, both below a
256-pattern bank. Content/scrolling-screen bank policy remains outside this
component.

## Results

`checks/` contains **pass** reports for the actual initial Chrome capture,
the compiled standalone build, the page after content grows past a 240-line
window, and a DPR 3 screenshot
checked with `--scale 3`. [rendered.png](rendered.png) is the actual native
409px-tall initial capture. Native pixels were inspected.

`browser-verification.json` records independent browser checks:

- All **3,568** tested frame/surround pixels match the approved tab-panel artwork
  from `feat/steel-art-sample` at `babdaad`; tabs/icons were excluded from that
  comparison. The border itself has not been redesigned.
- Measured sizes include 256×48, 127×53, 201×121 and the 20×20 minimum.
- A child grows from 67px to 277px; its panel grows from 87px to 297px.
- Sixteen width/height pairs cover all residues modulo 16. Every screenshot
  remains in the same four-color palette without blends.
- A 390×844 / DPR 3 Chrome context produces exact 3× border pixels.

The independent pixel comparison used the environment's Playwright/Chromium
capture and RGB decoding. The pinned checker command above is the portable
reproduction path; no browser automation package is added to the app.

`npm run check` passes: lint, typecheck, formatting, **168 tests** (including
new component tests for content, attributes and Solid reactivity). App and
standalone preview builds pass. No claim is made for arbitrary child content,
every device/zoom configuration, or the existing app shell.

Hosted component preview: https://fitnes-steel-panel-component.eduardo-terroso.chatgpt.site

Preview identity: `appgprj_6aea556e1f308191abf04f4796d27bc9`. This is a separate
private Site; it does not replace the art-study Site or production FitNES.
