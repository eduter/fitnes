# Richer artwork study

Owner brief: distinguish the two towels from hazards and lighting; restore the
standalone logo's fiery warm colors; try subtle native-pixel dithering while
keeping the NES appearance. The original references and adopted artwork remain
unchanged for comparison.

```sh
node tools/build-home-art-study.ts
node tools/build-home-art-review.ts
```

Serve `work/home-art-review/` to compare cool/warm linen and direct/dithered logo
treatments at integer pixel scales. The review is isolated from app storage and
service workers. Private review:
https://fitnes-richer-art-review.eduardo-terroso.chatgpt.site

Both hero candidates add three cloth inks through six sprites. Every other
pixel remains unchanged: 12 visible colors, 63 sprites, eight maximum per
scanline. They retain all nine existing material colors and emphasis 1.
The generated color study informed material separation; the delivered candidates
preserve the retained native geometry exactly rather than using generated shapes.

Logo candidates start with the unchanged 244×114 reference centered in a
256×120 black frame. Per 8×8 tile, select the lowest Oklab squared-error palette
from four explicit shared palettes. The dither variant mixes neighboring opaque
inks using a 4×4 Bayer threshold, with a maximum squared Oklab endpoint distance
of 0.04; it never dithers against transparent black. This adds texture without
changing the source lettering mask. There are seven visible colors, no sprites,
and the same display interpretation/emphasis as the hero.

`logo-current-filter.png` reproduces the current app's sRGB matrix followed by
its discrete channel tables, read from `src/App.tsx`. It is the actual existing
color treatment, not an invented baseline. The report measures aligned native
images using mean Euclidean Oklab distance and equally weighted, nonoverlapping
8×8 luminance SSIM windows (including partial windows). This is an explicitly
defined SSIM variant, not a claim of equivalence to a particular library's
Gaussian-window or multiscale implementation. Black padding is included equally
in all logo comparisons. Hero scores compare against the retained native image,
measuring the scope of the change, not fidelity to the high-resolution reference.

Both warm logo treatments improve color distance and SSIM against the current
filter. Direct matching scores higher than dithering at native resolution;
keep the visual comparison rather than using that score to select the artwork.

All four candidates pass the explicit hardware verifier and independent FCEUmm
rendering with zero mismatching pixels after 180 frames. To reproduce, set up the
pinned core with `npm run nes:emulator:setup`, then for each candidate:

```sh
npm run nes:emulate -- art/home/study/gym-linen.json art/home/study/gym-linen.png work/nes-emulator-core/fceumm_libretro.so
```

These are independently proven assets, not a proof of the combined application
screen: their background palette allocations differ. Integration must prove the
shared palettes, sprite budgets and tile alignment of each visible composition.
UI semantic tokens remain the adopted nine-color set. This study does not claim
an increase in available palette slots for existing controls.
