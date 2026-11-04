# Bottom tab icon candidates

Three **24×24** SVG alternatives for each destination in the compact preview:
Home, Templates, Exercises, Weight, History; plus a Settings cog for Data and
future preferences. These are artwork candidates, with a controlled bar and an
isolated chooser. They do not replace the workout app or its stored data.

Run `npm run dev` and open `/src/components/BottomTabs/preview.html`. Choose each
icon independently, try complete sets A/B/C, download an SVG, and compare the bar
at integer scales. Choices persist in the URL, which can be bookmarked or shared.

The **256×56** bar reuses `SteelPanel`, leaving 236×36 content pixels. Slots are
39/39/40/39/39/40 pixels wide. Icons have integer positions; ordinary grid centering
would blur them in odd-width slots. Five **1×24** gray separators stop six pixels
short of the content edges and ten pixels short of the metal. The active tab has
an eight-pixel gray marker. Accessible button names identify every destination.

The three icon palettes share steel gray `#747474` and use these pairs:

| Tabs | Midtone | Highlight |
| --- | --- | --- |
| Home, Exercises | `#fc9838` | `#fce4a0` |
| Templates, History, Settings | `#3cbcfc` | `#a8e4fc` |
| Weight | `#58f898` | `#b0fccc` |

Together with the panel's black/gray/white palette, the tested bar fits four NES
background subpalettes and needs no sprites. Positions keep differently colored
icons out of shared 16×16 attribute regions. Preserve the horizontal layout and
align the bar's origin to an eight-pixel vertical boundary when integrating it;
check the complete screen again with its eventual fonts/content and focus states.

The SVGs are standalone assets; the optional TypeScript drawing source is
`tools/generate-tab-icons.ts`. Run `node tools/generate-tab-icons.ts` on Node 24+
to regenerate them. It paints directly on a 24×24 integer grid without resampling.

Use the pinned checker setup in [SteelPanel's README](../SteelPanel/README.md), then:

```sh
node work/nes-checker/tools/nes/cli.ts \
  --url 'http://localhost:5173/src/components/BottomTabs/preview.html?proof&variant=a' \
  --ready '.bottom-tabs img' --out work/tab-check-a
```

Repeat with `variant=b` and `variant=c`; `choices=abcabc` sets a mixed combination,
and `active=settings` selects another destination. The proof route captures the
same component at the bottom of a 256×240 screen. The surrounding chooser is an
ordinary review page; its explanatory text is outside the NES artwork contract.
