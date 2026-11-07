# Home artwork

- [Original reference](../../docs/reference-home-screen-image.png), unchanged.
- [Final native artwork](gym.png), 256×200 pixels.
- [Indexed source and palette](construction.json), sufficient to reconstruct every
  final pixel and generate a runnable NES demonstration ROM.
- [Private review](https://fitnes-home-art-review.eduardo-terroso.chatgpt.site).

The final image preserves the reference's full composition, with separate brick
and concrete colors, warm skin, matching yellow hazards and lamp light. The sign
has bold native lettering, a beveled metal border and shaded corner rivets.

## Hardware construction

The source declares actual six-bit PPU codes, four shared background palettes,
MMC5 extended 8×8 attributes, one whole-frame red emphasis state, and three sprite
palettes. It uses 57 sprites, at most eight on any scanline, and nine visible
colors. No raster palette changes are required. Tile-count capacity is outside
the owner's visual contract.

Colors use the documented Composite Direct display interpretation. Analog NES
output varies with decoder and display; these are reproducible RGB bytes for
that interpretation, rather than arbitrary RGB approximations.

Use this construction's palette and emphasis as the material reference for
future icons and metal panels. An assembled screen must also share its global
palettes, emphasis and sprite budgets; individually valid assets alone do not
prove the composition fits.

## Color headroom

The [richer artwork study](study/README.md) retains cool/warm towel candidates
and direct/dithered warm logo comparisons, with perceptual measurements and
independent emulator proofs. These are review candidates; the image above
remains the adopted material reference.

Nine is the current image's actual distinct-color count, not the NES maximum.
Ordinary shared palettes allow up to 13 distinct background colors and 12 sprite
colors (25 total), with local region/sprite restrictions. This construction
repeats material colors across its four background and three sprite palettes;
it already reaches eight sprites on a scanline. A richer artwork revision could
redistribute palettes/tiles and use more colors, but must re-prove the assembled
image rather than assuming every unused slot is usable anywhere. The existing
image and source are preserved until the owner approves a new artwork pass.

## Verification

```sh
# Normal edit loop; also covered by npm run check
npm run nes:proof -- art/home/construction.json art/home/gym.png

# Optional independent rendering proof; Linux, Git, Make and a C compiler
npm run nes:emulator:setup
npm run nes:emulate -- art/home/construction.json art/home/gym.png work/nes-emulator-core/fceumm_libretro.so
```

The pinned FCEUmm core reproduces all **51,200 artwork pixels exactly** after
180 frames. Generated ROMs, emulator captures, reports and core builds go under
ignored `work/`; they are not source assets. The ROM includes black padding below
the artwork to fill a 256×240 frame.

The [reusable verifier documentation](../../tools/nes-hardware/README.md) describes
profiles, setup, limits and the recommended fast-check/emulator workflow.
