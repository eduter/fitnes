# SteelPanel

A Solid wrapper for the approved top-level frame: 4px metal bars, H-style
riveted corners with one cut pixel, and a 2px black surround. No tabs or icons.

```tsx
import { SteelPanel } from './components/SteelPanel/SteelPanel.tsx';

<SteelPanel class="workout-panel" role="region" aria-label="Workout">
    {content}
</SteelPanel>
```

Set width/height through normal CSS or `style`, or let height grow with children.
Ordinary div attributes and refs pass through; reactive `class` and `classList`
inputs are merged while preserving the required frame class. Importing the component
also imports its CSS; it does not depend on the app's stylesheet.

CSS nine-slices the editable **18×18 SVG**: 8px corners stay fixed while the
straight edges stretch. The SVG is the canonical material source; no generator
or build step is needed. Its four inks match background palette 1 of the
[final home artwork](../../../art/home/construction.json), using the documented
Composite Direct display model with red emphasis (`emphasis: 1`):

| Material | PPU code | RGB |
| --- | --- | --- |
| Black | `$0F` | `#000000` |
| Shadow | `$07` | `#451600` |
| Midtone | `$00` | `#7d5c4b` |
| Highlight | `$10` | `#d8a082` |

Keep these inks and integer coordinates when editing. The asset palette regression
checks them against the home construction's palette and emphasis. An assembled
home/panel screen still needs its own shared-palette and budget validation.
The frame has a 4px border and 4px content padding inside its 2px
surround. Minimum outer size is **20×20**; a 67px child gives an 87px panel.

Use whole logical-pixel sizes/positions and crisp scaling. Arbitrary children
and blended/fractional transforms need their own NES checks.

Run `npm run dev` and open `/src/components/SteelPanel/preview.html` for wide,
narrow, tall, minimum and content-sized examples. Add `?proof` to omit only the
ordinary explanatory text, leaving the same components in a 256px black column.
The demo never loads the app or IndexedDB.

Open `/src/components/SteelPanel/popover.html` for the interactive **256×240**
stepped-window experiment. A **208×96** SteelPanel opens top-down in either
3px or 16px strips, holding each step for one or two nominal 60Hz frames.
The default is 16px strips held for two frames (200ms for the 96px panel).
Its close button (or Escape) plays the same CSS animation backwards; the panel
stays mounted until it finishes, then focus returns to the opener. Settings
stay fixed while the panel is visible. Reduced motion finishes in 1ms.
This isolated timing preview uses ordinary browser text, like the static panel
preview; it is not a hardware-validated screen composition or adopted app UI.

The NES checker remains a separate experiment. To reproduce the live check
with Node 24+ and Chromium (`CHROME_PATH` may select the browser):

```sh
git fetch origin c910349a6cd90d29766ebd69fb64ec6032a5cc0c
mkdir -p work/nes-checker
git archive c910349a6cd90d29766ebd69fb64ec6032a5cc0c tools/nes | tar -x -C work/nes-checker
node work/nes-checker/tools/nes/cli.ts \
  --url 'http://localhost:5173/src/components/SteelPanel/preview.html?proof' \
  --ready '[data-case="content"]' --out work/panel-check
```

The border uses one four-color background palette and no sprites. Check results
and preview links belong in the PR; generated screenshots/reports are not source.
