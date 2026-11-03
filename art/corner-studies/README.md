# Panel corner studies

Supersedes the previous gym sample for the current visual review. Six isolated
top-left corners; each source canvas is 16×16. The metal extends only to x/y 11,
leaving a four-pixel margin at the right and bottom. Every version has thin
perpendicular bars, a small triangular overlay with a clipped outer tip, and
one rivet. No panel interior or other interface content is proposed.

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
