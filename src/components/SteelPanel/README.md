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
Ordinary div attributes, classes and refs pass through. Importing the component
also imports its CSS; it does not depend on the app's stylesheet.

CSS nine-slices the editable **18×18 SVG**: 8px corners stay fixed while the
straight edges stretch. The SVG is the canonical material source; no generator
or build step is needed. Use its existing four NES inks and integer coordinates
when editing. The frame has a 4px border and 4px content padding inside its 2px
surround. Minimum outer size is **20×20**; a 67px child gives an 87px panel.

Use whole logical-pixel sizes/positions and crisp scaling. Arbitrary children
and blended/fractional transforms need their own NES checks.

Run `npm run dev` and open `/src/components/SteelPanel/preview.html` for wide,
narrow, tall, minimum and content-sized examples. Add `?proof` to omit only the
ordinary explanatory text, leaving the same components in a 256px black column.
The demo never loads the app or IndexedDB.

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
