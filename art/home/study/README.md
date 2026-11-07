# Richer artwork study

## Round 2: full-scene reference comparison

The owner clarified that towels were an example, not the scope of the artwork
pass. Compare the original reference, adopted native hero and full-scene
candidates; share off-white across both complete towels and the sneakers; rank
additional inks by their measured value. Direct color matching is the preferred
logo direction and is now the review default.

```sh
node tools/build-hero-palette-study.ts
node tools/build-home-art-review.ts
```

`hero-source-native.png` is the unchanged high-resolution reference reduced to
256×200 by exact area averaging in sRGB. All new hero metrics compare with this
same image, not with the adopted nine-color artwork. The full-resolution
original is linked beside the native reference. Both dimensions and hashes are
retained in `hero-report.json`.

The conversion target changes shared cloth/shoe highlights to PPU $20
(`#ffe9bd`) with $10 warm fold shading. Polygon masks cover both towels and both
shoes; all 354 requested highlight pixels reproduce that same off-white exactly.
Every other part of the image is fitted to the reference too. An existing-ink
control separates full-scene reconstruction gains from added-color gains.

The optimizer caches Oklab errors and searches three-ink shared palettes with
black backdrop, per-8×8 attributes, four background groups and four sprite
groups. Two alternating refinement steps account for which tiles receive
sprites. Greedy overlays stay within 64 total and eight per scanline. Each
addition round shortlists six inks using an unconstrained nearest-ink bound,
then actually fits those candidates and selects the lowest mean Oklab distance.
It stops when no shortlisted ink improves the result; this is a heuristic,
not an exhaustive global optimum. Pixel counts show how widely each new ink is
used, rather than implying that every allowed ink visibly changes the image.

The reference-color fit reduces mean color distance by approximately 18% and
raises SSIM from 0.856 to 0.912 compared with the current hero. Most improvement
comes from rebuilding the full scene against the reference. Beyond off-white,
peach and dark residual inks each yield less than 0.03% marginal
color-distance improvement. These small improvements do not establish a visual
preference, and SSIM can move in the other direction for a particular addition.

The source's very dark browns fit with softer NES shadows when ranked by color
distance. A separate `gym-crisp-alternative` anchors luminance below 32/255 to
black and hazard highlights to warm yellow $37. It retains stronger outlines
and yellow stripes at a cost to raw color similarity. The review exposes this
tradeoff instead of claiming one metric settles pixel-art quality. The scoring
reference remains unchanged for both approaches.

`hero-material-target.png` records the reference-color target;
`hero-crisp-target.png` records the contrast variant's target.
An added ink must appear in actual output pixels to count as a color gain;
search-path improvements with zero visible use of that ink are excluded.
`hero-emulator-proof.json` retains independent FCEUmm reports and hashes for all
full-scene constructions. These remain standalone asset proofs: shared
palette composition with the app controls still needs validation before adoption.

## Round 1: retained towel and logo studies

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
