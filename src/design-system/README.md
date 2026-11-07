# FitNES UI system — implementation contract

[Original foundation review](https://fitnes-design-system.eduardo-terroso.chatgpt.site)
· [PR #27](https://github.com/eduter/fitnes/pull/27)

[Current PR #28 component review](https://fitnes-app-design-system.eduardo-terroso.chatgpt.site/design-system/)
includes the Typography page and updated frames/actions.

Read this before implementing screens. The components below are the current
design vocabulary. Use the framed-field layout and anchored menus consistently;
changes to the visual direction require owner review.

## Available components and when to use them

Import controls from `src/components/Controls/index.ts`.

| Component | Use | Contract |
| --- | --- | --- |
| PageTitle / DialogTitle / SectionHeading | Page, editor, and field-group hierarchy | Copper passive text: 32px page title, 16px uppercase dialog title, 16px sentence-case section heading with vertical space. Typography.css is the single style owner. Use semantic h1/h2/h3; item titles remain normal 16px. |
| DialogActions | Editor footer | Cancel (or No) at left, positive action at right. End alone at right for already-persisted edits. Central copy in dialogActionCopy; no per-screen synonyms. |
| MoveButton | Reorder an item | Dedicated 16×16 shaft arrow and destination bar. Gold icon with an accessible Move … up/down verb. Disabled at list boundaries. Never reuse it for increments, pagination or navigation; those retain their existing glyphs. |
| Button | Actions such as Edit, Delete, Duplicate, Record, End | Gold uppercase text, no chevron. `onPress` provides immediate primary press plus keyboard activation. Native disabled semantics. Pointer input belongs only to visible text/icons; layout space stays passive. |
| OptionPicker | One choice, including On/Off | A framed field sized to the widest option/legend. Value opens an anchored options-only window below, flipping above if needed. Selecting applies/closes; outside/Escape closes without selecting. There is no layout variant. |
| MultiPicker | Multiple memberships | Full-width framed summary (two names then +N, or None), with two lines reserved so memberships never resize the field. Values align at the top; the summary button has no opaque fill over the border. Options stay open on toggle. A reserved check appears immediately after each label; text never shifts. End is separated at the bottom right. Membership changes apply immediately; End/outside only close. |
| Spinner / NumberPad | Quantities, reps, sets, load | Framed fixed-mask value and compact symmetric day-style arrows. Value opens a keyboard-free numeric pad containing digits/keys only, no visible header, and End. Back erases a digit; it is not window navigation. Changes are immediate; End only closes. |
| DateSpinner | Recording bodyweight dates | Framed YYYY.MM.DD with adjacent-day arrows. Native calendar opens only when the date is pressed, as explicitly approved by the owner. Controlled value is a local YYYY-MM-DD date; day arithmetic avoids DST issues. |
| TextInput | Names / single-line editable text | Native input inside the adopted frame/legend. Preserve mixed case, text selection, IME and phone keyboard. No corner-bracket alternative. |
| TextArea | Notes / multiline entry | Put directly on the page or editor, with an appropriate `rows` bound. Native editing/keyboard on deliberate interaction. Do not add a Notes action that opens an extra nested dialog by default. A future truncated-copy/ellipsis editor requires a concrete need and owner review; it is not a second current component variant. |
| Popover | Choice lists, bounded editors, child windows | Fixed opaque frame inside a stepped overflow viewport, anchor clamping and modal stack. Only top window is interactive. Outside/Escape closes it and restores parent focus. Default focus is the dialog surface, never the first text input. Explicit safe-control initial focus is supported for choice/number selection. |
| ConfirmDialog | Destructive confirmation | Message with Yes / No. Only Yes invokes the action. Outside/Escape cancels. Subject is snapshotted at opening and retained through closing. |
| PagedWindow | Page-level lists that do not fit available height | Footer arrows close to fixed-width page numbers; up/down swipe for next/previous. One brief black redraw (skipped for reduced motion). Never inside a Popover or other dialog; this is checked at runtime. |
| SteelPanel / BottomTabs | Adopted top-level art/navigation | Separate material assets under their existing component directories. Do not replace the plain field/window frame with SteelPanel everywhere. Full app compositions still need review/proof. |

## Composition rules

- Use the two-pixel rounded copper frame with an opaque one-pixel black surround (`.nes-frame`) for
  fields and plain windows. Gold identifies interactive values/actions; copper
  identifies passive text. No gold corner brackets, checkbox boxes, action
  chevrons, browser select/radio/switch presentation or expanding editor rows.
  Both copper and steel borders use native-size PNGs at runtime to avoid the
  Android SVG border-image painting bug fixed in #26. Keep the SVGs as editable
  sources; preserve the raster painting path when integrating the components.
  `tools/build-field-frame.ts` retains each complete four-pixel corner from
  `frame-source.png` (the raster of `frame.svg`), then adds the black surround.
  The border-image corners are five native pixels, never squeezed into a
  three-pixel slice. Corner tiles stay opaque when covering content behind.
  SteelPanel uses fixed 8×8 corners and repeated 8×8 straight-edge tiles, with no
  stretching of the frame artwork.
- Action buttons size to their text and use a single verb where its meaning is
  clear. Only the visible label/icon receives pointer input; never turn black
  padding, a flex row or an item's background into an action target.
- Page titles use 32px copper type, item names and body copy use 16px type, and
  actions use 16px gold uppercase type. Separate list rows with a thin steel rule.
  The FitNES wordmark appears on Home only. The workout library is called
  Workouts in the interface; storage still uses the existing template records.
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
composition/device review, field-linked validation refinements and import/export
polish. The application now integrates the shared components with real persistence
and composite drafts; the showcase remains isolated from the application DB. The native-control tests reject
screen-local raw buttons/inputs/selects/textareas/details outside approved implementations.

## Build and verification

`npm run dev` → `/src/design-system/index.html`.
`node tools/build-design-system.ts` → `work/design-system-preview/` (no app DB,
router or service worker). The app preview build also includes this isolated
showcase at `/design-system/`, without exposing it in the product navigation. `npm run check` runs lint/types/format/tests;
`npm run build` validates the application build.

Capture native 256px/DPR 1 compositions after the font loads and run:

```sh
node tools/prove-design-system.ts capture.png output-directory ui
```

The checker reconstructs every unquantized pixel with the home background/sprite
palettes and budgets. New compositions and states need new checks; source-color
membership alone is not a screen proof. These checks are not independent
emulator runs.

## Typography and editor actions

Use `PageTitle` through `PageHeader` for a tab/page, `DialogTitle` for an editor,
and `SectionHeading` for a related field group. These are passive copper text;
gold uppercase is reserved for actions. Edit their shared stylesheet to revise
all three levels. The Typography showcase presents the hierarchy and footers.

Use `DialogActions` with `kind="end"` for existing atomic edits: End closes,
it does not save. New composites use `create`, new list items use `add`, and
explicit drafts such as weight records use `save`; these include Cancel on the
left. Destructive confirmations use `confirm` (No / Yes). All labels are owned
by `dialogActionCopy`; a single change updates every footer using that kind.
Choice menus and number pads keep their specialized layouts.

Editors default to 224 logical pixels, with eight pixels of internal padding and
clamping margins on both sides of the app surface. Framed values use whole-pixel
vertical insets; native single-line text is lifted two pixels above browser centering.

## Motion and ordering

Popover reveals and hides a fixed-size frame through an ordinary overflow
viewport in whole 16-pixel steps. The copper border and scrolling content do not
resize during animation. Do not animate clip-path on the framed/scrolling layer:
the reported Chromium artifact showed page content blinking through covered
windows. Stacked parent windows retain their frame and footer throughout child
animations. Pagination belongs only to the underlying page.

MoveButton's shaft arrow points toward a destination bar. It means reorder,
whereas the small filled spinner triangles mean increment/decrement. Workout
set rows place Edit, Duplicate, Delete and the two MoveButtons in one nonwrapping
row with eight-pixel gaps. Keep the full accessible movement verbs on icon buttons.
