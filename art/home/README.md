# Home reference: hardware-backed conversion

[Private comparison](https://fitnes-home-art-review.eduardo-terroso.chatgpt.site) ·
[Native PNG](gym.png) · [Exact 3× view](gym-3x.png) ·
[NES demonstration ROM](hardware/home-proof.nes) · [Emulator frame](hardware/emulator-frame.png)

This revision returns to **the original image pushed by the owner** at
`docs/reference-home-screen-image.png`. It does not use the generated gray study.
The full composition is reduced to 256×200 with Lanczos3, without sharpening,
added dithering or cropping. The normalized source retains arbitrary RGB before
quantization; `hardware/source.json` binds it and the original with SHA-256 hashes.
The builder rejects changed source bytes until the normalization is refreshed.

The result retains the original's brown shading. The owner-requested yellow
hazard stripes and rust-colored bricks are constrained as separate material
roles during palette selection; they are not forced to share one accent color.
An explicit sprite layer restores finer shading around the lifter.

## Actual NES features

The image uses:

- MMC5 extended attributes: one of four shared background palettes per **8×8** tile.
- A single **red PPUMASK emphasis** state for the whole frame. This makes gray
  signal levels into warm brown-gray tones under the declared display model.
- One three-color sprite palette, **46 8×8 sprites**, at most **six per scanline**.
- **10 visible colors** across background and sprites. No mid-frame palette writes.

The display interpretation is FirebrandX Composite Direct (captured from an
NTSC NES), with the pinned FCEUmm emphasis interpretation. The ROM contains real
six-bit PPU codes and register writes. Exact RGB on a physical NES depends on
the video decoder and display; this is a reproducible interpretation, not a
claim that every television produces identical bytes.

The standard FCEUX/16×16 checker remains its own narrower experiment. The new
[explicit hardware verifier](../../tools/nes-hardware/README.md) validates this
construction, including exact RGB reconstruction and sprite budgets, without
accepting arbitrary near-matching colors. Raster palette rewriting is not
assumed legal without its own timing/blanking proof.

## Reproduction and evidence

```sh
npm run art:home
npm run nes:proof -- art/home/hardware/construction.json art/home/gym.png
npm run nes:proof -- art/home/hardware/construction.json art/home/gym-3x.png 3
```

`art:home` deterministically rebuilds the background palettes, the sprite overlay,
the PNGs, and an iNES Mapper 5 ROM from the stored normalized original. Source
normalization was a full-image 256×200 Lanczos3 reduction using Sharp, with no
other edits. The normalized file is itself available for direct comparison.
The converter has no new package dependency.

The 256×240 demonstration ROM frame reproduces the PNG in its upper 256×200
pixels, with black padding underneath. It was run for 180 frames in FCEUmm
`e0f3086a8104f8fbbe49a2615b10401504a9533f`, NTSC, Composite Direct palette,
no overscan crop or NTSC filter. **Every one of the 51,200 artwork pixels matches
the PNG exactly**. `verification.json` records hashes, configuration and metrics.
This is emulator evidence; no physical console capture is claimed.

The ROM contains 780 distinct background patterns using MMC5 CHR bank addressing,
plus the sprite patterns, in 24 KiB of CHR ROM. The visual checker still has no
tile-count cap, as requested by the owner. The demonstration is more concrete
than merely waiving a tile-count check.

Mean squared Oklab error against the normalized pushed reference is approximately
0.00578, compared with 0.02789 for the previous gray/gold revision. This is a
comparison metric, not a proof that the conversion is a global quality optimum.

The companion home layout uses the new image with the merged SteelPanel and
1px tab separators. It is a **layout mockup**: the current hardware proof covers
the gym image, not the complete scrolling application or every UI state.

## Earlier attempts

`previous/` preserves rejected and superseded conversions for labeled comparison.
The generated gray study and its normalized input in `sources/` are historical
reference material only. Their bytes are not used by the current compiler.

The original logo source, component frame, tab glyphs and grid-font licenses
retain the provenance recorded in the earlier commits. Actions and navigation
choices remain provisional; no application flow or workout data is changed.
