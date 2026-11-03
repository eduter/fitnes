# Bottom tab panel study

Five layouts use the selected H corner (one outermost pixel cut off), now with
4-pixel metal bars on all four sides and a rivet at each corner. Every standalone
PNG is 256×48. The framed panel is 252×44 at (2,2), with **two black pixels
around all four sides**. The interior is 244×36. Separators are simple 1-pixel
gray rules; the second tab is marked with a short white underline.

| Variant | Tabs | Icon canvas | Per-tab width, excluding separator | Free horizontal space around each icon |
| --- | --- | --- | --- | --- |
| A | 4 | 24×24 | 60–61 px | 36–37 px total |
| B | 5 | 24×24 | 48 px | 24 px total / 12 each side |
| C | 5 | 32×32 | 48 px | 16 px total / 8 each side |
| D | 6 | 24×24 | 39–40 px | 15–16 px total |
| E | 5 | 16×16 plus 7px labels | 48 px | 32 px total / 16 each side |

B is the balanced starting point: five icons at 24×24 with room to breathe.
C explores the larger icon limit at this panel height: only two vertical pixels
remain above and below a 32-pixel canvas inside the metal. D demonstrates that
six 24-pixel icons still fit horizontally, with closer separators. E trades
icon size for visible labels. Tab names/order are sample data, not a navigation
decision. Artwork is review material, not an interactive navigation control.

## Editable sources and reproduction

`icons.json` holds deliberately authored pixel rows at 16, 24 and 32 pixels;
icons are drawn directly at each resolution, not resized from a large raster.
0 = transparent/black, 1 = NES $00 gray, 2 = $10 silver, 3 = $20 white, using
the same FCEUX RGB interpretation as the previous studies. The placeholder
icons suggest home, workout, log, progress, settings, and time/history.

`tools/art-sample/tabs.ts` draws the frame from the existing H pixel source
and adds the fourth bar pixel behind the plate. It lays out icons, separators,
selection marks and sample labels in logical pixels. `corner-H4.json`,
`*-pixels.json`, PNGs and `layout.json` are generated construction artifacts.
Edit `icons.json` or the renderer and run `npm run art:render`.

Native images and exact 3× images are supplied for each layout, plus a labeled
comparison sheet. Labels above each panel belong to the review sheet; its panel
PNGs independently retain the complete two-pixel outer margin.

## Verification and limits

The actual native panels and comparison sheet were checked with the pinned
checker from `c910349a6cd90d29766ebd69fb64ec6032a5cc0c`; all six images pass.
Reports are in `checks/`. All pixels share one four-color background palette,
so 16×16 attribute regions remain legal even at frame and icon boundaries.
No sprite overlays are required. The renderer's output was separately checked
for exact dimensions, black margins, palette membership, per-panel pattern
counts below a 256-tile bank, corner cuts and every enlarged pixel.
`verification.json` records the pattern counts. A native panel has only 192
background tile positions before pattern reuse. The checker itself permits
unlimited patterns; the independent count closes that gap for each variant.

Native and 3× results were inspected and the settings icon refined to have
clearer gear teeth. Repository lint/typecheck/formatting and all 166 existing
tests pass; build passes. The review page uses ordinary presentation text
outside the art; its page chrome is not claimed as an NES-rendered screen.
These are static visual studies; touch targets, navigation, motion, real-phone
readability and the final tab/icon choices remain for review.
