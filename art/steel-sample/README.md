# Steel art sample — awaiting visual review

A standalone 256×240 art study, using the rightmost charcoal/steel reference in
`docs/style-reference.png`. No workout-screen integration or data is involved.

[Native pixels](native.png) · [Crisp 4× preview](preview-4x.png) ·
[Phone capture](phone-preview.png) ·
[Private device preview](https://fitnes-steel-art-study.eduardo-terroso.chatgpt.site)

## Edit and render

With the repository's dependencies installed and Node 24+:

```sh
npm run art:render
npm run check
npm run dev
# Open /art/steel-sample/index.html
```

`assets.json` contains editable pixel rows: 0–3 are local palette entries.
For sprites, 0 is transparent. Edit the 112×48 wordmark, 16×24 athlete,
4×4 rivet, or 8×8 glyphs there. `tools/art-sample/render.ts` draws frames,
equipment, floor, text and selection at their actual logical coordinates.
It exports both PNGs, `construction.json` and `verification.json`.
The construction preserves background pixels, origin-anchored 16×16 attributes,
master-palette indices, six explicit sprite placements and their palettes.
Generated PNGs/construction/reports should be regenerated rather than hand-edited.

The wordmark was transcribed onto this grid from `docs/fitnes-logo.png`, with
three warm inks; it is not the older branch's quantized logo. The old side-view
gym (`f1bca218`) and palette-reduced assets (`0f811ebb`) were inspected, but their
perspective and poster treatment do not serve this top-down study. The original
frame, gym equipment and athlete are authored for this sample. HUD bitmap glyphs
were reused from `nes/assets/fitnes.json` at `0f811ebb`, with the ambiguous M
corrected. This small sample does not choose the product's full typography or
character set. PNG I/O and the FCEUX RGB table are reused from the repo's checker
at `c910349a6cd90d29766ebd69fb64ec6032a5cc0c`.

## Visual decisions and refinements

Stepped corner gussets, lit upper/left edges, dark lower/right recesses and
small rivet glints adapt the reference's metal thickness to four-color tiles.
Black panel recesses, restrained stipple and repeated equipment details replace
its many charcoal shades. The selected row uses pale metal, dark lettering,
a dumbbell and a separate chevron, so selection survives grayscale. Warm inks
are concentrated in the source wordmark, hair and skin.

Native and enlarged renders were inspected and refined: titles were moved clear
of metal edges; clothing and feet were separated from the black floor; a lifting
platform and vent give the room structure. The room reads from above, with the
bar across a vertically oriented bench and dumbbells stored along the far wall.
The character remains a static direction candidate.

## Verification and limits

- `npm run check`: lint, typecheck, formatting, 170 tests across 18 files passed.
- `npm run build`: passed.
- Existing checker at the pinned commit above: native PNG, every block of the
  4× PNG, and the actual initial Chrome 256×240 page capture all **pass**.
  Reports are in `checks/`. Its scope was read and its implementation inspected.
- That checker deliberately permits unlimited distinct patterns. This renderer
  additionally enforces one 4 KiB / 256-pattern background bank and one sprite
  bank. Final background: **242 patterns**. Sprite mode: **8×8**, six patterns,
  six placements, maximum **two sprites per scanline**. Two background palettes
  share black; three sprite palettes have three visible inks each. No palette
  switching or attribute exceptions are needed.
- Unit checks exercise CHR overflow, attribute selection, sprite palettes, and
  scanline budgets including transparent rows, plus every exported 4× pixel.
- Actual Chromium capture at 390×844 CSS pixels / DPR 3 was inspected. The
  1024×960 physical content rectangle matches the 4× PNG byte for byte in RGB;
  surrounding letterboxing is black. The initial CSS image approach failed this
  comparison. The preview now draws an integer-sized canvas backing store,
  with image smoothing disabled, and positions/scales it through a transform
  that avoids fractional CSS layout rounding. `checks/mobile.json` records it.

This proves the supplied static frame and the two captured viewport cases,
not all devices, zoom settings, scrolling screens, animation, or gameplay.
No emulator execution or PPU timing is claimed or required. Real Android visual
readability and the amount of industrial detail still need the owner's review.
The art direction is provisional: stop here before building the logging screen.

The repo's referenced `deploy-static-preview` skill was unavailable in this
session. The isolated static sample is instead hosted privately with Sites;
production FitNES and its data are untouched. Preview identity:
`appgprj_6aea45deaa80819197adf3b272b1b1d8`.
