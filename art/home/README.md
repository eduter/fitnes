# Home artwork candidate

[Private review page](https://fitnes-home-art-review.eduardo-terroso.chatgpt.site)

[Verified gym, native](gym.png) · [Gym at exact 3×](gym-3x.png) ·
[Home concept at 3×](home-3x.png) · [HTML home concept](preview/index.html)

This is review artwork, not an adopted home-screen design. The original
[reference](../../docs/reference-home-screen-image.png) is unchanged.

The source fails the pinned checker at 1419×1108. An independent pixel audit
finds 176,540 colors, with 1,566,780 of its 1,572,252 pixels off the checker’s
FCEUX palette. The source is fully opaque.

The selected conversion is **256×200**, retaining the entire composition.
Height rounding changes aspect ratio by about 0.06%. Its five visible colors
are black, dark red, gray, orange and pale peach. Nearest-neighbor reduction
plus mild sharpening retained the sign, lifter, equipment and source texture
more clearly than the smooth reduction. Region palette choices preserve warm
highlights; additional diffusion made the small details noisier and was rejected.
A regenerated candidate was also compared, but the selected image is derived
directly from the original. Brown tones necessarily shift under this palette.

`conversion.json` records the regional palette assignment and selected colors.
The source was reduced with Sharp’s `nearest` kernel, `sharpen({sigma: 0.5})`,
and mapped per pixel to the nearest color in its region’s palette using squared
Oklab distance (lightness weight 1, chroma weights 1.5). The palette search
reserved one steel/white palette for the surrounding UI, then selected three
warm palettes by greedy selection and coordinate descent. This is a reviewed
tradeoff between detail and warmth, not a proof of a global quality optimum.

## Home concept

The composition shows the logo, gym image, two plain menu actions, and five
placeholder tabs. The frame’s CSS and SVG are exact snapshots from
[PR #17](https://github.com/eduter/fitnes/pull/17), commit
`b32ab1bf88fd953bd145c2dc5141aeed42d34598`. The static HTML uses its rendered
wrapper structure; its pixels match a capture rendered by the actual Solid
component. The tabs sit inside the panel with 1px gray separators.

The tab glyphs come from PR #16 / `babdaad9eb405860c1a46734628135b7f48d3acb`.
The grid font and its CC0 notice come from PR #12 /
`f3df2a3eb2a7bb9337c92e418d6bd34a08511f04`. The logo is a palette-constrained
preview derivative of the existing standalone logo. Actions and tabs are static
placeholders; labels/order and interaction design remain open.

## Verification

The checker is the unmodified experiment at
`c910349a6cd90d29766ebd69fb64ec6032a5cc0c` (PR #11).
The native gym image, 256×448 Chrome capture, static HTML capture, and exact
3× PNGs all pass. An independent construction check verifies each 16×16 region
against the four declared palettes, sharing black; no sprites are needed.
`checks/` stores checker results; `verification.json` records hashes and the
independent construction. Each screenshot certifies only that static state.

The checker allows unlimited tile patterns: the gym uses 775 distinct background
patterns, and the complete home concept uses 1,102. Passing this checker does
not prove that either fits a conventional 256-pattern CHR bank.

To reproduce with Node 24+ and Chromium, from the repository root:

```sh
mkdir -p /tmp/fitnes-home-checker
# Fetch if this experiment is not already available locally.
git fetch origin c910349a6cd90d29766ebd69fb64ec6032a5cc0c
git archive c910349a6cd90d29766ebd69fb64ec6032a5cc0c tools/nes | tar -x -C /tmp/fitnes-home-checker
node /tmp/fitnes-home-checker/tools/nes/cli.ts art/home/gym.png art/home/home-native.png
node /tmp/fitnes-home-checker/tools/nes/cli.ts art/home/gym-3x.png art/home/home-3x.png --scale 3
python3 -m http.server 5174 --directory art/home
# In another terminal:
node /tmp/fitnes-home-checker/tools/nes/cli.ts --url http://localhost:5174/preview/ --ready '.tab-items img'
```

The 3× assets are exact nearest-neighbor enlargements; they add no detail.
