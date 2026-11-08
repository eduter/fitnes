# Home artwork

- [Original reference](../../docs/reference-home-screen-image.png), unchanged.
- [Current app artwork](gym.png), 256×200 pixels, edited by the owner in PR #30.
- [Indexed source and palette](construction.json), sufficient to reconstruct
  every current pixel and generate a runnable NES demonstration ROM.

The owner's edited image replaces the previous app artwork. The repository
keeps the reference and current image; older versions remain in Git history.
Drafts, recovery backups, captures and reports belong under ignored `work/`.
Use the [local artwork editor](../../tools/art-editor/README.md) for changes;
Save artwork replaces this current image and its matching construction.

## Hardware construction

The image uses ten visible colors, four shared background palettes, two sprite
palettes, MMC5 extended 8×8 attributes, and whole-frame red emphasis 1 under the
Composite Direct display interpretation. It uses 63 sprites and at most eight
on a scanline. No raster palette changes are required; tile-count capacity is
outside the owner's visual contract. The additional off-white ink is used in
artwork; existing semantic UI inks retain their meanings.

Analog NES output varies with decoder and display. These RGB bytes are a
reproducible display interpretation, not arbitrary approximations. An assembled
screen still needs shared palette and sprite-budget validation; individually
valid assets do not prove an entire composition.

## Verification

```sh
npm run nes:proof -- art/home/construction.json art/home/gym.png
npm run nes:emulator:setup
npm run nes:emulate -- art/home/construction.json art/home/gym.png work/nes-emulator-core/fceumm_libretro.so
```

The pinned FCEUmm core reproduces all **51,200 artwork pixels exactly** after
180 frames. ROMs, captures, reports and core builds stay under ignored `work/`.
See the [hardware verifier](../../tools/nes-hardware/README.md) for setup and limits.
