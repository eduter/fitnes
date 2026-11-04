# Home artwork: neutral revision

[Private review page](https://fitnes-home-art-review.eduardo-terroso.chatgpt.site) ·
[Checked gray/gold PNG](gym.png) · [Checked warmer alternative](gym-warm.png) ·
[Home concept](preview/index.html)

The previous conversion passed the checker but was visually poor. It introduced
red shadows and scattered orange highlights, then exaggerated their contrast
through nearest-neighbor shrinking and sharpening. Passing did not establish
faithfulness to the reference. Those rejected images are retained in `previous/`
for a clearly labeled comparison.

## Revised conversion

The revised art uses the **gray generated study shown in chat** as its visual
source. That study was itself unverified: its 1419×1108 image contains 182,511
colors, with 1,422,191 pixels outside the checker’s palette. The stored
`sources/gray-study-256.png` is its smooth Lanczos3 reduction, an intermediate
that is **not** claimed compliant. The owner-supplied sepia reference remains
unchanged at `docs/reference-home-screen-image.png`.

Both final gym PNGs are 256×200 and use **seven visible colors**:

- `gym.png`: neutral gray, pale cream/peach and restrained gold. No orange or red.
- `gym-warm.png`: the same neutral materials with orange/peach object accents,
  closer to the gray study’s warm objects. No red shadows or saturated floor light.

The compiler applies no sharpening or dithering. Neutral source pixels must
remain neutral. The sign and the illuminated floor cannot receive the saturated
accent. Each aligned 16×16 region selects one of three curated art palettes;
a fourth palette is reserved for the logo. The steel palette is available for
neutral highlights and the surrounding frame. This is an image-specific visual
conversion, not a general image optimizer or a proof of minimum possible error.

The original 244×114 logo is now preserved at **native size**, centered in a
256×128 header, and mapped to a dedicated red/gold/cream palette. Its geometry
is not shrunk. The complete home study is 256×464. The gold and warm concepts
use eight and nine visible colors respectively.

## Reproduction

Node 24+ and the checker from PR #11 are required; the compiler uses the pinned
checker’s PNG I/O helpers. It has no new package dependency and does not modify
the checker. From the repository root:

```sh
mkdir -p /tmp/fitnes-home-checker
git fetch origin c910349a6cd90d29766ebd69fb64ec6032a5cc0c
git archive c910349a6cd90d29766ebd69fb64ec6032a5cc0c tools/nes | tar -x -C /tmp/fitnes-home-checker
node tools/home-art/convert.ts /tmp/fitnes-home-checker/tools/nes
node /tmp/fitnes-home-checker/tools/nes/cli.ts art/home/gym.png art/home/gym-warm.png
node /tmp/fitnes-home-checker/tools/nes/cli.ts art/home/gym-3x.png art/home/gym-warm-3x.png --scale 3
python3 -m http.server 5174 --directory art/home
# In another terminal:
node /tmp/fitnes-home-checker/tools/nes/cli.ts --url http://localhost:5174/preview/ --ready '.tab-items img'
node /tmp/fitnes-home-checker/tools/nes/cli.ts --url http://localhost:5174/preview/warm.html --ready '.tab-items img'
```

`conversion.json` and `conversion-warm.json` record source hashes, palettes and
region assignments. `checks/` contains results for the two gym assets and the
two actual Chrome captures. `verification.json` records independent palette
construction checks and output hashes. Both images have zero red pixels, zero
neutral-to-color leaks under the documented source threshold, and zero saturated
floor-light pixels. Every 16×16 region fits the four declared palettes, sharing
black, without sprites. The static gold HTML matches a fresh capture rendered
with the actual merged Solid SteelPanel component.

The pinned checker allows unlimited tile patterns. The revised gym uses 741
patterns (743 for the warm variant); the home concepts use 1,094 and 1,096.
Passing does not establish compatibility with a conventional 256-pattern CHR
bank. These checks cover the static states shown, including exact 3× enlargements.

## Preview provenance

The CSS/SVG frame is copied unchanged from merged PR #17; its two-pixel black
surround, four-pixel bars and one-pixel corner cut remain intact. Tabs sit inside
it with 1px gray separators. The tab glyphs come from PR #16 /
`babdaad9eb405860c1a46734628135b7f48d3acb`. The grid fonts and CC0 notice come
from PR #12 / `f3df2a3eb2a7bb9337c92e418d6bd34a08511f04`.

Actions, tab labels/order and final layout remain provisional. No application
flow or persisted workout data is changed by this art study.

## Color limits

Ordinary NES rendering provides four shared background palettes, each with
three colors plus a common backdrop (up to 13 background colors), and four
three-color sprite palettes (up to 12 additional colors). The 16×16 rule selects
one background palette for each attribute region; it does not allocate four new
colors independently to every region. Raster palette changes and other special
techniques are outside this checker’s scope.

The hardware’s 64 color codes are not arbitrary RGB colors. This checker uses
one fixed FCEUX RGB interpretation. Its limited brown and dark-gray choices
constrain exact source matching, but do not require red shadows or false orange
texture. See [NESdev palettes](https://www.nesdev.org/wiki/PPU_palettes) and
[attribute tables](https://www.nesdev.org/wiki/PPU_attribute_tables).
