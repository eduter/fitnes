# BottomTabs

The six selected **24×24 PNG** icons: Home C; Templates, Exercises, Weight,
History and Settings A. The PNGs in `icons/` are the canonical artwork, named
by destination. The bar uses the shared `SteelPanel` SVG for its frame, including
the home artwork's metal palette. No alternate icons, chooser, or drawing generator remain.

```tsx
<BottomTabs active="home" onSelect={navigateToTab} />
```

The 256×56 bar reuses `SteelPanel`, with five inset 1×24 gray dividers. All art
positions use integer logical pixels. Preserve nearest-neighbor integer scaling
and recheck palette regions when integrating the bar into a full screen.

Run `npm run dev` and open `/src/components/BottomTabs/preview.html`. The demo
loads no workout data. Add `?proof` for a native 256×240 capture, or
`?proof&active=settings` to inspect another selected tab. It crops 16 floor rows
from the gym for this proof; the original home artwork is unchanged.

The final composition shares the home's PPU palettes and emphasis: nine visible
colors, 59 sprites including two gold-window overlays, at most eight per scanline.
Capture the proof route in Chromium at 256×240 after images load, then verify:

```sh
node tools/prove-tab-icons.ts capture.png work/tab-proof
npm run nes:proof -- work/tab-proof/construction.json capture.png
npm run nes:emulate -- work/tab-proof/construction.json capture.png work/nes-emulator-core/fceumm_libretro.so
```

See [emulator setup](../../../tools/nes-hardware/README.md). Generated ROMs,
captures and reports stay under ignored `work/`; they are not source assets.
