# Local NES artwork editor

Choose artwork from the header: Home, the preferred logo, field/steel borders,
steel border tiles or tab icons. Switching assets preserves each draft and last verified image independently; the clipboard/undo stack
belongs to the current open asset. Existing Home drafts and `art/home/edited/`
remain compatible. The owner's pushed hand-edited Home candidate is retained.

The catalog discovers native **opaque 8-bit RGB/RGBA PNGs** under `art/`, `src/`
and `public/` that fit 256×240 and exactly use the retained NES display colors.
Generated candidate folders are excluded. High-resolution references, SVGs,
transparent/antialiased PNGs and arbitrary RGB colors are not silently converted
into editable assets. The reference view stays read-only.

Small assets open enlarged (up to 64×); the three side previews use matching
integer scales. Editing keeps the PNG's original dimensions. For verification,
a small asset sits at the top left of an explicitly black, 256-wide padded frame.
The real emulator proves that frame; this is not a proof over arbitrary app
backgrounds or combined screen palettes. Border candidate saves include the
native PNG and a separate `proof-frame.png`; exported bundles include native
`asset.png` plus the frame `image.png`. The project records the native dimensions.

Home saves keep their existing location. Logo candidates go to `art/logo/edited/`;
other asset candidates go to `art/edited/<source-path-without-extension>/`.
Every save supplies Git commands for just that asset's files. Source assets are
never replaced automatically. Toolbar icons have hover instructions; selecting
a tool keeps a single fixed-height control row without moving the canvas.

A small Paint-style tool for native repository artwork, running inside Ubuntu on WSL with
the interface in a normal Windows Chromium browser. It starts from the selected repository image; the logo profile uses the preferred
direct-color candidate while retaining the original logo as its reference.
There is no desktop emulator window or WSLg requirement.

## Install in Ubuntu / WSL

Use Node 24 (the version in the repository's `.nvmrc`), npm, Git, Make and a C
compiler. With nvm, run `nvm install` and `nvm use` inside the checkout. Keep this
checkout in the Ubuntu filesystem for faster dependency installation/builds.

To keep an existing development checkout untouched, run these from it:

```sh
git fetch origin
git worktree add --detach ../fitnes-art-editor origin/feat/local-art-editor
cd ../fitnes-art-editor
```

One-time setup, in the editor checkout:

```sh
sudo apt-get update
sudo apt-get install -y build-essential git
npm ci
npm run nes:emulator:setup
```

Start it:

```sh
npm run art:editor
```

Open **http://localhost:4180** in your Windows browser. Keep the Ubuntu terminal
running; Ctrl+C stops the server. A later session only needs `npm run art:editor`.
Use `npm run art:editor -- --port 4181` if the port is occupied. An existing Linux
FCEUmm core can be supplied with `--core /absolute/path/fceumm_libretro.so`.

## Tools

- **Copy / Paste:** select a rectangle, then use the buttons or Ctrl+C / Ctrl+V.
  Paste creates a floating copy beside the source. Drag it at any zoom and
  release to place, or nudge with arrow keys (Shift = eight pixels) and press
  Enter / Place. Esc / Cancel discards the floating copy. Each placement is one
  undo action and starts exact verification. Repeated pastes keep the same
  copied pattern and start beside the previous placement, useful for stripes.
  The clipboard belongs to this editor tab; no system clipboard permission is
  needed. The live overview follows the preview. Save/export stay disabled until
  the copy is placed and verified. A floating preview is not auto-saved until
  placed; the underlying draft stays intact if it is cancelled.

- **Pencil:** click one pixel or drag a one-pixel-wide stroke. Gaps between
  pointer samples are filled without smoothing. The complete stroke is one undo
  action and is checked when released. Pick color samples a drawing color when
  using the pencil; with a rectangle selection it samples the color to replace.

- **Bucket fill:** choose the replacement color, then click a connected region.
  A whole fill is one undo action, regardless of how many pixels it touches.
- **Replace within a selection:** drag a rectangle, click the **Replace this
  color** chip and choose a swatch (or use **Pick color** on the image), then
  choose **With / bucket color** and click **Replace in selection**. Only exact
  matches inside the rectangle change. Picking a color keeps the rectangle.
- **Undo / Redo:** buttons, Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y. Up to 100 complete
  actions are retained in the open tab. **Return to last verified** restores the
  last image that passed both checks, including after reopening the editor.
- **Zoom:** + / − or the wheel over the canvas, in whole-number steps from 1× to
  16×. Use Shift+wheel or scrollbars to pan. A pixel grid appears at 8× and above.
  Esc clears a rectangle.

The palette includes the selected asset’s current colors and the additional inks
considered in the artwork studies: off-white, peach, deep teal, soft cream,
light copper, ochre, olive shadow, ember and pale linen. Each swatch uses an actual
PPU code under the current artwork's Composite Direct interpretation/emphasis.
The palette is not an invitation to ignore local color restrictions: the checker
still verifies the complete construction.

The sidebar stacks **Original concept**, **Current image in the app**, and
**Your edit** at matching display sizes for the selected asset. Your edit updates immediately;
zooming the editing canvas does not change these overview sizes.

## What the check means

After an edit, the green state clears immediately. The browser waits 140 ms to
combine rapid actions, then sends the exact indexed pixels to the local server.
The server fits a construction, reconstructs every RGB pixel with the existing
hardware verifier, and runs the pinned FCEUmm core for 180 frames. Green is shown
only after the emulator reproduces every pixel of the proof frame exactly. No smoothing,
quantization, color substitution or silent repair is allowed.

The fitter reuses the known artwork's background/sprite geometry, moves redundant
sprite pixels into the background to free capacity, packs shared palettes, and
adds disjoint sprite overlays where useful. Four shared background palettes,
four sprite palettes, eight-pixel MMC5 attributes, 64 total sprites and eight per
scanline remain enforced. Pattern-bank capacity stays outside the visual contract.

**Not verified** means the fitter did not find a valid construction, or the exact
checker/emulator rejected the attempted construction. The search is bounded; it
does not prove that no other NES arrangement could reproduce the edit. The
affected area is outlined. A small square shows ✓ for verified, × for unverified,
and … while checking; hover or focus it for details. Try Undo, a smaller replacement
region, or another color. If the core is absent, the UI says **Emulator setup
needed** and cannot turn green.

Checks are serialized; superseded queued edits are skipped. Both server and
browser bind a result to its edit revision so an old success cannot approve a
newer image. Exact repeated images can reuse a real emulator proof cached for
the same image hash and core hash; this makes undo to a checked image fast.

These proofs cover the edited hero asset. They do not prove an entire app screen
that combines the hero with other assets or controls.

## Work and exports

The editor never writes `art/home/gym.png`, its adopted construction or either
original reference. It auto-saves a draft under `work/art-editor/draft.json` and
keeps a browser backup after each action. Work stays local; the server binds to
127.0.0.1 and does not publish the image or connect to other services.

**Save artwork** (or Ctrl+S) writes the current green image to tracked candidate
files (Home uses `art/home/edited/`): `gym.png`, `construction.json`, `project.json`,
and `verification.json`. The save dialog provides copyable Git commands. Those
commands create a feature branch if currently detached or on main/master, then
commit only the listed asset files, leaving unrelated staged changes out of the commit.
Run the commands yourself in the Ubuntu checkout where the editor is running;
the editor does not run Git or push changes automatically. Saving a candidate
does not replace the app's adopted image or its palette tokens.

Earlier saves are backed up under `work/art-editor/saved-backups/`. A directory
swap keeps each saved image and construction together; failures restore the
previous candidate. Existing additional files in the candidate folder are kept.
If no auto-saved draft exists, the editor can resume the tracked `project.json`.

The **File** menu contains the less frequent operations. **Download backup**
(formerly Download project) exports an editable JSON snapshot, including an
unverified draft. **Open backup** (formerly Open project) restores it as one undo action and rechecks the pixels.
Undo history belongs to the open tab; the current draft and last verified image
survive reopening. Preserve downloaded projects before deleting the ignored
`work/` directory or removing the worktree.

**Export verified files** (formerly Download verified bundle) is enabled only for the current green image. Its
`.tar.gz` contains `image.png`, `construction.json`, a runnable `frame.nes`, the
independent `capture.png`, and `report.json` with exact comparison counts and
image/ROM/core hashes. Extract it with Windows archive support or `tar` in Ubuntu.
The bundle is suitable for reviewing/adopting the hand-edited asset later.

Proof jobs and native build output stay under ignored `work/`. The editor uses
its own origin and has no connection to the workout app's database or service
worker.
