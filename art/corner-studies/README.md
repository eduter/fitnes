# Panel top and corner studies

Supersedes the previous gym sample. The original A–F studies are six isolated
top-left corners; each source canvas is 16×16. The metal extends only to x/y 11,
leaving a four-pixel margin at the right and bottom. Every version has thin
perpendicular bars, a small triangular overlay with a clipped outer tip, and
one rivet. No panel interior or other interface content is proposed.


## Current comparison: 252-pixel panel tops

D, E and F extend the corresponding corner designs into 252×16 top strips,
with one rivet at each corner and short descending side borders. G uses F's
8-pixel plate with **4-pixel bars**. H uses F's 3-pixel bars with **only the
single outermost pixel cut off** at each corner, instead of the three missing
pixels in F's stepped cut. These are independent comparisons, so thickness
and corner geometry can be judged separately.

`D-top-native.png` through `H-top-native.png` are exactly 252 pixels wide;
`*-top-3x.png` are exact 756×48 enlargements. `panel-tops-native.png` places
the five strips within a 256-pixel column, adding two black pixels per side
and labels outside the artwork. `panel-tops-3x.png` is the crisp comparison.
The renderer removes the original corner study's one-pixel outer padding,
extends the straight bars and mirrors the corner onto the other end.
G and H have editable 16×16 pixel sources alongside the previous studies.

Only top-level panels are intended to receive elaborate borders, per the
owner's direction now recorded in `docs/vision.md`. The owner selected H with 4-pixel bars for the next bottom-panel study; see
`../tab-panel-studies/README.md`. The preview page shows native and 3× versions,
with optional individual corner details.

## Original corner comparison

| Option | Bar width | Plate reach | Rivet treatment |
| --- | --- | --- | --- |
| A | 2 px | 5 px | Tiny highlight and lower shadow |
| B | 2 px | 6 px | 2×2 highlight/shadow |
| C | 3 px | 6 px | Same small rivet, thicker bars |
| D | 3 px | 7 px | Cross-shaped rivet with recessed shadow |
| E | 2 px | 7 px | Same rivet, brighter plate bevel |
| F | 3 px | 8 px | Larger plate with brighter bevel |

`assets.json` is the editable pixel source. 0 = black, 1 = NES $00 gray,
2 = $10 silver, 3 = $20 white, using the repo's FCEUX table. Each corner uses
one four-color background palette and four 8×8 tiles. No sprites are needed.
Edit pixel rows and run `node tools/art-sample/corners.ts` to regenerate native
and 12× versions and the labeled comparison. The comparison has extra spacing
and labels outside the individual art canvases. Enlargements duplicate pixels;
there is no filtering. These are candidates for selection, not an adopted style.

Verification: all six native PNGs are 16×16, each enlarged PNG is 192×192,
and every enlarged RGB pixel was compared with its native source. The pixel
rows validate as two-bit values. Native and enlarged results were inspected.
`npm run check` (166 existing tests) and `npm run build` pass. The image checker
expects a complete 256-pixel-wide screen, so it is not claimed as certification
of these isolated 16×16 components; their single four-color attribute region
and four tiles follow directly from the indexed source.

Panel-top verification: all five strips were checked as exactly 252×16, with
correct 2/3/4-pixel side-bar thickness, horizontal symmetry, the same four NES
inks, and exact 3× pixel duplication. H's outer 2×2 corner region contains
exactly one black pixel, the outermost corner. Both native and enlarged panel
tops and the G/H corner details were inspected. The 256×200 comparison montage
passes the pinned checker at `c910349a6cd90d29766ebd69fb64ec6032a5cc0c`;
`panel-tops-check.json` records that result. The native 252-pixel strips are
components within the 256-pixel column, not a change to the screen-width rule.
