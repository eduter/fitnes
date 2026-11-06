Current adopted revision: use A-style framed fields with the shared two-pixel
cut-corner border for fields and windows. Date/number spinners share a compact
24px body with centered arrows; name inputs use legends rather than gold corner
marks. Membership checks stay in a fixed right-hand column. Confirmations use
Yes/No and retain their subject through closing. Older recipes below record
previous revisions; see the design-system README for current validation.

See the [design-system foundation](../../design-system/README.md) for the full
home-image palette, proposed semantic roles, restricted component vocabulary,
and new phone showcase. `OptionPicker` is also exported by `Controls/index.ts`.
Owner revision: action chevrons are removed; outside press dismisses the top
window. Choice menus contain only options. The new showcase is a set of small
review screens with compact A/B fields and stacked windows. Historical proof
results below describe earlier compositions, not the current showcase.

# Reusable FitNES controls

These Solid components implement the selected numerical controls and regular
name entry. They contain no routing, workout model, database or persistence.
Use individual imports or the named exports from `Controls/index.ts`.

```tsx
import { createSignal } from 'solid-js';
import { Button, Popover, Spinner, TextInput } from './components/Controls/index.ts';

const [name, setName] = createSignal('Bench press');
const [weight, setWeight] = createSignal(60);
const [step, setStep] = createSignal(2.5);

<TextInput
    label="Exercise name"
    value={name()}
    onInput={(event) => setName(event.currentTarget.value)}
/>
<Spinner
    label="Weight (kg)"
    value={weight()}
    onChange={setWeight}
    step={step()}
    integerDigits={3}
    fractionDigits={2}
/>
<Button onPress={() => addSet()}>Add set</Button>
```

## Components

- **Button** is a real button with uppercase gold action text. `variant="plain"` omits the chevron and case
  conversion for digits and icons. `onPress` fires on a primary pointer press;
  its generated click is ignored to prevent duplicate actions. Keyboard and
  assistive clicks still activate it. Native attributes, refs and other events
  are forwarded. Disabled buttons never invoke `onPress`; the default type is
  `button`. Use `onPress` instead of `onClick` for this immediate interaction.
- **Popover** is controlled through `open` / `onOpenChange`, with a required
  accessible `label`. It portals into `mount` or the document body, makes the
  surrounding content inert, traps focus, supports Escape and outside dismissal,
  and restores focus after closing. `initialFocus` / `returnFocus` accept element
  getters. Its thin one-pixel border deliberately does not use SteelPanel.
- **Spinner** is a controlled, labelled nonnegative number. `value` / `onChange`
  belong to the caller. `step`, `min`, `max`, `integerDigits` and `fractionDigits`
  configure its mask and bounds. The default is two integer digits, no fraction,
  step 1, and range 0–99. A 3+2 mask shows `060.00`. Borderless arrows adjust
  immediately; tapping the value opens the selected number pad. Replacing a
  digit applies immediately, and Done only closes the editor. Integer units of
  the displayed precision preserve fractional equipment increments. Its live
  announcement reports arrow changes. Pass `popoverMount` when the control is
  inside a scaled logical-pixel surface.
- **TextInput** wraps an ordinary native input with the same four corner marks.
  It preserves mixed case, native selection, caret, composition and virtual
  keyboard behavior. `label` is associated with the native input; all native
  attributes, events and refs are forwarded. Classes apply to the wrapper. It
  does not open the numerical picker or intercept pointer focus.

Masks support at most five digit places, fitting the editor in the 256px screen.
Callers supply a different `step` for each exercise/equipment configuration and
persist edits immediately if required. These components do not select storage
or add a Save action. Spinner steps and bounds must be representable at the
chosen precision; bounds within floating-point tolerance are normalized to
that precision. Mask sizes, steps and bounds are validated as programmer inputs.

Controls keep their normal foreground and background on press, focus and digit
selection. Buttons omit the focus ring. The selected digit's underline
blinks on/off every 500ms; reduced motion keeps it steadily visible.

## PR #23 animation

The reusable Popover carries the reveal/reverse-close technique from PR #23
(`452331d808930127db704d9457f011fc12d28b12`). It uses **16 logical pixels per
step**, held for **two nominal 60Hz frames**, by default. A 96px popover has six
steps and takes 200ms, matching the experiment. Taller windows take more steps;
the 256px number pad takes about 533ms to open or close. Digit changes and
spinner taps do not animate or wait.

`stepPixels` and `framesPerStep` may customize the timing. `height` fixes the
logical border-box height; otherwise the content is measured on open. Heights
round up to complete strips so every reveal boundary stays on a whole logical
pixel. Settings should remain stable while open. Closing retains the DOM until
its reverse animation ends; opening/closing content stays inert. Descendant
animation events are ignored. Reduced motion uses a 1ms lifecycle, preserving
focus restoration. Cleanup cancels pending setup and restores prior inert state.

## Preview and checks

Run `npm run dev` and open `/src/components/Controls/index.html`, or build only
the isolated preview with:

```sh
node tools/build-controls-preview.ts
```

The output is `work/controls-preview/`. It does not include the application's
router, IndexedDB or service worker. The demo lets you type an exercise name,
adjust weight/reps and equipment increment, and open a generic 96px popover.

The private [phone preview](https://fitnes-numeric-preview.eduardo-terroso.chatgpt.site/)
uses the same ChatGPT owner account. Its existing Sites identity is
`appgprj_6aeb936db9a08191ac56e4ab6b58683b`. Reuse that identity and preserve
its owner-only audience on subsequent updates.

All control inks use the home artwork's approved material palette and emphasis.
The CC0 grid font and its provenance are under `src/styles/fonts/`. The controls
use native DOM elements, without the earlier canvas-and-invisible-button
prototype. A 256px native capture currently contains exactly the four approved
material colors. Device scaling and complete compositions still need their
own verification when integrated into the app.

Capture `[data-testid="controls-preview-screen"]` at 256 CSS pixels / DPR 1
after its font loads, then verify the unmodified PNG with:

```sh
node tools/prove-control-preview.ts work/controls-review/native-pad.png work/controls-review/pad-proof
```

The proof splits the scrolling capture into crops of at most 240 rows and
reconstructs every pixel using the approved material PPU codes. It never
quantizes a screenshot. The main, native-text, open-pad and partial opening /
closing captures passed; eight main/pad/animation crops also reproduced in
FCEUmm with zero differing pixels.

`npm run check` includes lifecycle, pointer/keyboard activation, native input,
controlled spinner, clamping and exact fractional-number regressions. Chromium
checks cover actual stepping and reverse animation, reduced motion, native text
entry, focus restoration and phone layout. Generated captures and emulator
artifacts belong under ignored `work/`.
