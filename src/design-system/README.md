# FitNES UI system — implementation contract

[Live private review](https://fitnes-design-system.eduardo-terroso.chatgpt.site)
· [PR #27](https://github.com/eduter/fitnes/pull/27)

Read this before implementing screens. The components below are the current
design vocabulary. Use the framed-field layout and anchored menus consistently;
changes to the visual direction require owner review.

## Available components and when to use them

Import controls from `src/components/Controls/index.ts`.

| Component | Use | Contract |
| --- | --- | --- |
| Button | Actions such as Edit, Delete, Duplicate, Record, End | Gold uppercase text, no chevron. `onPress` provides immediate primary press plus keyboard activation. Native disabled semantics. |
| OptionPicker | One choice, including On/Off | A framed field sized to the widest option/legend. Value opens an anchored options-only window below, flipping above if needed. Selecting applies/closes; outside/Escape closes without selecting. There is no layout variant. |
| MultiPicker | Multiple memberships | Framed summary (two names then +N, or None). Options stay open on toggle. A reserved check appears immediately after each label; text never shifts. End is separated at the bottom right. Membership changes apply immediately; End/outside only close. |
| Spinner / NumberPad | Quantities, reps, sets, load | Framed fixed-mask value and compact symmetric day-style arrows. Value opens a keyboard-free numeric pad containing digits/keys only, no visible header, and End. Back erases a digit; it is not window navigation. Changes are immediate; End only closes. |
| DateSpinner | Recording bodyweight dates | Framed YYYY.MM.DD with adjacent-day arrows. Native calendar opens only when the date is pressed, as explicitly approved by the owner. Controlled value is a local YYYY-MM-DD date; day arithmetic avoids DST issues. |
| TextInput | Names / single-line editable text | Native input inside the adopted frame/legend. Preserve mixed case, text selection, IME and phone keyboard. No corner-bracket alternative. |
| TextArea | Notes / multiline entry | Put directly on the page or editor, with an appropriate `rows` bound. Native editing/keyboard on deliberate interaction. Do not add a Notes action that opens an extra nested dialog by default. A future truncated-copy/ellipsis editor requires a concrete need and owner review; it is not a second current component variant. |
| Popover | Choice lists, bounded editors, child windows | Shared cut-corner frame, stepped reveal/reverse close, anchor clamping and modal stack. Only top window is interactive. Outside/Escape closes it and restores parent focus. Default focus is the dialog surface, never the first text input. Explicit safe-control initial focus is supported for choice/number selection. |
| ConfirmDialog | Destructive confirmation | Message with Yes / No. Only Yes invokes the action. Outside/Escape cancels. Subject is snapshotted at opening and retained through closing. |
| PagedWindow | Page-level lists that do not fit available height | Footer arrows close to fixed-width page numbers; up/down swipe for next/previous. One brief black redraw (skipped for reduced motion). Never inside a Popover or other dialog; this is checked at runtime. |
| SteelPanel / BottomTabs | Adopted top-level art/navigation | Separate material assets under their existing component directories. Do not replace the plain field/window frame with SteelPanel everywhere. Full app compositions still need review/proof. |

## Composition rules

- Use the two-pixel cut-corner copper frame (`.nes-frame`) for
  fields and plain windows. Gold identifies interactive values/actions; copper
  identifies passive text. No gold corner brackets, checkbox boxes, action
  chevrons, browser select/radio/switch presentation or expanding editor rows.
- A popup choice menu contains only options. Multi-choice adds End at the bottom
  right. Numeric pads have no visible header and close with End. Keep accessible
  names even when decorative headers are absent.
- Use current-state summaries and short Edit/Delete/Duplicate actions. Edit
  opens one bounded form; do not paginate a modal. Put common fields together.
  Secondary choices/numeric pads may overlay that form as a child window.
- Do not automatically focus input/textarea fields when a form opens. That opens
  the phone keyboard and displaces useful controls. Default dialog-surface focus
  preserves keyboard access without invoking text entry. A user may explicitly
  tap the name/notes when they want to edit text.
- Use the available screen height for real content. The 256px logical width is
  fixed, but **240px is not the height limit of the app**. The showcase adapts its
  overview row count to the available height; do not artificially cut a real
  screen into tiny pages just to demonstrate pagination.
- On page one, downward native browser refresh is permitted. Beyond page one,
  touch pagination prevents refresh and moves to the previous page instead.
  Restore root overscroll policy when returning/disposal; do not globally
  disable refresh forever. Native Android toolbar behavior still needs device
  review in addition to Chromium gesture checks.
- Existing atomic edits persist immediately. End means finish/close, not Save.
  Composite drafts and destructive operations need explicit commit/cancel
  semantics; do not silently turn all changes into drafts or discard edits.
- Native keyboard and rare native date picking are approved exceptions for
  input convenience. They do not authorize other web-widget substitutions.

## Palette: nine is the artwork choice, not the NES maximum

The approved `art/home/gym.png` is 256×200 and really contains exactly **nine**
RGB colors. Tokens cover all nine; `tokens.test.ts` compares CSS/inventory with
actual image pixels and its indexed PPU construction. The original high-res
reference has many more colors. Current semantic inks use the existing approved
source colors; no artwork changes are made in this PR.

Ordinary NES palette organization can expose up to 13 distinct background
colors (four groups of three plus a shared backdrop) and 12 sprite colors,
**up to 25 distinct colors on screen**. Each background region and sprite is
still restricted to its own small palette; available slots do not permit
arbitrary colors anywhere. The home uses MMC5 extended 8×8 background attributes,
red emphasis 1 and the Composite Direct RGB interpretation. It has four
background palettes, three sprite palettes, 57 sprites and already reaches the
eight-sprites-per-scanline limit. Duplicate material colors across palettes
reduce the number of distinct colors actually used.

A richer future artwork pass is possible, with palette/tile reassignment and
composition proof. Do not treat nine as a permanent hardware cap, or add colors
ad hoc to UI tokens. Keep the current palette until new artwork is approved.

## Source and integration scope

`PageExamples.tsx` uses temporary in-memory samples. Workout adapts its row
count to height, shows all common edit fields in one form and puts Notes directly
there. Weight demonstrates date/number entry. Multiple demonstrates summaries
and membership toggling. Review is a framed navigation field. These examples
do not implement full home/session persistence.

The [backlog](../../docs/backlog.md) tracks integration gaps: application
composition, complete home/session/catalog workflows, validation, real
persistence/drafts and low-priority import/export. The native-control tests reject
screen-local raw buttons/inputs/selects/textareas/details outside approved implementations.

## Build and verification

`npm run dev` → `/src/design-system/index.html`.
`node tools/build-design-system.ts` → `work/design-system-preview/` (no app DB,
router or service worker). `npm run check` runs lint/types/format/tests;
`npm run build` validates the application build.

Capture native 256px/DPR 1 compositions after the font loads and run:

```sh
node tools/prove-design-system.ts capture.png output-directory ui
```

The checker reconstructs every unquantized pixel with the home background/sprite
palettes and budgets. New compositions and states need new checks; source-color
membership alone is not a screen proof. These checks are not independent
emulator runs.
