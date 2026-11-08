# Local NES artwork editor

Run `npm run art:editor` and open **http://localhost:4180** in Chromium.
The editor runs locally on Linux/Ubuntu/WSL because verification uses a native
FCEUmm core. Keep the terminal running; Ctrl+C stops it.

## Setup

Use Node 24 (`.nvmrc`), npm, Git, Make and a C compiler:

```sh
sudo apt-get update
sudo apt-get install -y build-essential git
npm ci
npm run nes:emulator:setup
npm run art:editor
```

Use `npm run art:editor -- --port 4181` when the port is occupied, or supply an
existing Linux core with `--core /absolute/path/fceumm_libretro.so`.
To use a separate checkout, create a worktree from `origin/main` first.

## Images and saving

The repository keeps the original reference images and **one current image per
asset**. Home uses `art/home/gym.png`; the logo uses `art/logo/logo.png`.
The original references remain at `docs/reference-home-screen-image.png` and
`docs/fitnes-logo.png`. References are read-only. There are no tracked candidate
image directories.

Choose Home, Logo, a field/steel border, a steel tile or a tab icon from the
header. Each asset has isolated drafts and verification state. The catalog
accepts opaque 8-bit RGB/RGBA PNGs within 256×240 that exactly use the retained
NES display colors. Unsupported formats, transparency and arbitrary RGB colors
are never silently quantized.

Edits auto-save under ignored `work/art-editor/` with a browser backup. **Save
artwork** (Ctrl+S) explicitly replaces the selected current PNG and its matching
construction after verification. The app uses these files on its next build.
Home and Logo keep `construction.json` beside their image; other assets use
`<image-name>.construction.json` so neighboring tiles have separate proofs.
The save dialog supplies Git commands scoped to those two files and excludes
unrelated staged changes. The editor never runs Git or pushes automatically.

Earlier images/constructions, editable project snapshots and verification
reports stay under ignored `work/`. They are recovery material, not additional
repository image versions. A failed save restores the previous matching files.
After an external source change, an older draft is preserved as a backup instead
of being silently applied to the new source. Restart the editor after external
asset changes.

## Editing

- **Pencil:** click or drag a continuous one-pixel stroke. One stroke is one undo
  action. **Fill:** replace one connected exact-color region.
- **Selection:** drag a rectangle, choose the source/replacement colors and use
  **Replace in selection**. The eyedropper samples a drawing color, or the source
  color when a selection is active.
- **Copy/paste:** Ctrl+C / Ctrl+V creates a floating copy. Drag and release to
  place, or use arrows (Shift = eight pixels) and Enter. Esc cancels. Each
  placement is one undo action; the clipboard needs no system permissions.
- **Undo/redo:** Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y; up to 100 whole actions in the
  open tab. **Return to last verified** restores the most recent passing image.
- **Zoom:** +/− or wheel, from 1× to 16× for Home and up to 64× for small assets.
  Shift+wheel or scrollbars pan. A pixel grid appears at 8×. Tool changes keep
  the canvas in the same position.

The three previews show the reference, current repository image, and live edit
at matching sizes. Switching assets keeps drafts separate; undo and clipboard
belong to the open asset. Native PNG dimensions are preserved.

## Verification and exports

Edits clear green immediately. After a short debounce, the server fits a
construction, reconstructs every RGB pixel with the hardware checker, and runs
the pinned FCEUmm core for 180 frames. Green requires zero differing pixels.
Checks are serialized per asset and bound to edit revisions; an older success
cannot approve newer pixels. Exact image/core hashes may reuse a cached proof.

The fitter enforces four shared background palettes, four sprite palettes,
eight-pixel MMC5 attributes, 64 sprites and eight per scanline. Its search is
bounded: **Not verified** means no passing construction was found, not that
all possible NES arrangements were disproved. Missing emulator setup cannot
turn an image green. Hover/focus the status square for details.

Small assets are proved at the top left of an explicit black, 256-wide padded
frame. This does not prove arbitrary backgrounds or a complete app composition.
The proof frame stays in ignored work output, rather than becoming another
tracked image.

The **File** menu provides **Download backup** and **Open backup** for editable
JSON snapshots, including unverified drafts. **Export verified files** downloads
a `.tar.gz` containing native `asset.png`, padded `image.png`, construction,
runnable ROM, emulator capture and a report with exact comparison counts and
image/ROM/core hashes. Preserve downloaded backups before deleting `work/`.
The editor uses a separate loopback origin and never accesses workout data.
