# Explicit NES hardware proof

For manual recoloring with near-real-time exact checks and a real emulator,
see the [local artwork editor](../art-editor/README.md). It runs in Ubuntu/WSL
and opens in a Windows browser.

```sh
npm run nes:proof -- art/home/construction.json art/home/gym.png
```

This verifier adds concrete hardware profiles alongside the earlier PR #11
FCEUX/static-image experiment. It reconstructs every delivered pixel from the
supplied PPU palette codes, attribute selections, background patterns and sprites.
It never quantizes a screenshot or tolerates near-matching RGB values.

Supported features:

- `stock`: 16×16 background attribute regions.
- `mmc5-exattr`: authentic MMC5 extended attributes, one palette per 8×8 tile.
- Up to four background palettes sharing entry zero, and four sprite palettes.
- One explicit whole-frame PPUMASK emphasis value, 0–7.
- Native 256-pixel width and a frame/crop height of 1–240 pixels.
- Explicit 8×8 sprites, first-OAM-entry priority, transparency, at most 64 per
  frame and eight per scanline. Transparent rows still consume sprite slots.
- Exact integer enlargement verification, with no tile-pattern count cap.

A raw RGB file alone cannot identify the mapper, emphasis state or layer plan.
A pass certifies the **supplied construction**, not arbitrary undisclosed
rendering techniques or every state of an app. A failure rejects that supplied
construction; it is not a proof that no alternative construction exists.

## Display model

PPU color bytes are six-bit signal selections, not reduced-bit RGB. The model
here uses FirebrandX's **Composite Direct** base palette, documented as a direct
capture of an NTSC front-loader NES, and FCEUmm's declared classic emphasis
interpretation. The 64 base entries and emphasis coefficients are pinned from
FCEUmm `e0f3086a8104f8fbbe49a2615b10401504a9533f` in the palette JSON's
provenance. An arbitrary user-supplied RGB table is not accepted.

The actual console produces analog video: exact RGB depends on the decoder,
calibration and display. These RGB bytes are an explicit reproducible display
interpretation. The ROM stores actual PPU color codes and writes real PPUMASK
bits; it does not store or invent arbitrary RGB colors.

Sources:

- [NESdev palettes and color signals](https://www.nesdev.org/wiki/PPU_palettes)
- [NESdev color emphasis](https://www.nesdev.org/wiki/Colour_emphasis)
- [MMC5 extended attributes](https://www.nesdev.org/wiki/MMC5)
- [Composite Direct capture provenance](https://www.firebrandx.com/nespalette.html)
- [FCEUmm display choices](https://docs.libretro.com/library/fceumm/)

## Raster palette changes

Palette RAM rewrites during a visible frame are not silently accepted. Real
NES palette changes require rendering to be disabled, palette writes and PPU
address/scroll restoration. Depending on the updates, blank scanlines are visible.
A future raster profile needs a concrete timing schedule and reproduction proof,
including those lines, before it can certify a pass. See
[NESdev's mid-frame palette-change constraints](https://www.nesdev.org/wiki/Palette_change_mid_frame).

The home image needs no mid-frame palette writes or per-pixel emphasis changes.
It uses one normal global emphasis state, MMC5 attributes and a bounded sprite
layer, and has a runnable NES ROM as additional evidence.

The PNG codec and exact-scaling helper are copied unchanged from the repository's
checker experiment at `c910349a6cd90d29766ebd69fb64ec6032a5cc0c`; this does not
adopt its fixed FCEUX table or its 16×16-only heuristic as universal NES limits.


## Reusable workflow

Keep the fast verifier in the normal editing loop. It checks exact pixels,
palette sharing, attribute regions and sprite budgets without starting an
emulator. `npm run check` includes its regressions and a check that the retained
home PNG still matches its indexed source. All tools are TypeScript and included
in the repository's typecheck.

Use the emulator for independent evidence when introducing a hardware profile,
changing rendering or display assumptions, composing assets into a complete
screen, or finalizing artwork. It does not replace the deterministic checker.
Both are inexpensive once installed: this home image took approximately 13 ms
to check and 143 ms to emulate for 180 frames on the development machine,
excluding Node startup and the one-time core build.

```sh
# One-time Linux setup: requires Git, Make and a C compiler
npm run nes:emulator:setup

# Generate a ROM, run the supplied libretro core, compare every artwork pixel
npm run nes:emulate -- art/home/construction.json art/home/gym.png work/nes-emulator-core/fceumm_libretro.so

# Or generate a ROM for manual inspection in another emulator
npm run nes:rom -- art/home/construction.json art/home/gym.png work/home-proof.nes
```

The setup script fetches FCEUmm at
`e0f3086a8104f8fbbe49a2615b10401504a9533f` and builds its XRGB8888 libretro core.
On other platforms supply a compatible core path yourself. The emulator command
uses the dev-only Koffi FFI dependency, NTSC, Composite Direct, authentic sprite
limits, no video filter and no overscan cropping. It writes `frame.nes`,
`capture.png` and `report.json` under ignored `work/nes-emulator/` (override with
`--out DIR`). The report includes exact mismatch counts and core, ROM and image
hashes; a mismatch exits unsuccessfully. The expected PNG is compared with the
same top-left crop of the uncropped 256×240 native framebuffer.

The proof ROM uses Mapper 5 for CHR capacity, including for a `stock` construction;
the fast checker separately enforces its 16×16 palette regions. It demonstrates
one static frame, not application logic, scrolling or controller interaction.
No emulator executable, built ROM, capture, report or conversion experiments are
tracked in the repository.

The earlier PR #11 checker is unchanged. Its fixed FCEUX palette and 16×16-only
heuristic are narrower assumptions. For this adopted workflow, use the explicit
verifier above rather than treating that heuristic as the full hardware limit.
